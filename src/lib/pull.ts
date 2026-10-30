import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import {
  defaultTaskManager,
  dispatchDownload,
  resolveDefaultDownloadDir,
} from './engines/dispatcher.js'
import { parseProfileInput, buildCanonicalProfile } from './parser.js'
import type { SupportedPlatform, ParsedProfile } from './parser.js'
import type { MediaTarget, EngineProgress, DispatchRunnerResult } from './engines/types.js'
import type { TrackedProfileRecord, MediaLedger } from './engines/storage/ledger.js'

export interface PullProgress {
  profile: TrackedProfileRecord
  index: number
  total: number
  status: 'starting' | 'downloading' | 'completed' | 'failed'
  engineProgress?: EngineProgress
  downloaded: number
  skipped: number
  error?: string
}

export interface PullItemResult {
  profile: TrackedProfileRecord
  status: 'success' | 'failed' | 'skipped'
  downloaded: number
  skipped: number
  error?: string
  targetDir: string
}

export interface PullSummaryResult {
  total: number
  succeeded: number
  failed: number
  totalDownloaded: number
  totalSkipped: number
  items: PullItemResult[]
}

export interface PullOptions {
  target?: string
  platform?: SupportedPlatform
  choice?: MediaTarget
  outputDir?: string
  earlyExitThreshold?: number
  minDelayMs?: number
  maxDelayMs?: number
  signal?: AbortSignal
  ledger?: MediaLedger
  runnerOverrides?: {
    nativeRunner?: (subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights' | 'All') => Promise<DispatchRunnerResult>
  }
  onProfileStart?: (profile: TrackedProfileRecord, index: number, total: number) => void
  onProfileProgress?: (progress: PullProgress) => void
  onProfileComplete?: (result: PullItemResult, index: number, total: number) => void
  onProfileError?: (profile: TrackedProfileRecord, error: Error) => void
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })
}

export async function dispatchPull(options: PullOptions = {}): Promise<PullSummaryResult> {
  const ledger = options.ledger || defaultTaskManager.ledger
  const earlyExitThreshold = options.earlyExitThreshold ?? 5
  const minDelay = options.minDelayMs ?? 2000
  const maxDelay = options.maxDelayMs ?? 3000

  let allTracked = ledger.getTrackedProfiles()

  if (options.platform) {
    allTracked = allTracked.filter(p => p.platform === options.platform)
  }

  if (options.target) {
    const rawTarget = options.target.trim().replace(/^@/, '')
    const filtered = allTracked.filter(p =>
      p.username.toLowerCase() === rawTarget.toLowerCase() ||
      p.profileUrl.toLowerCase().includes(rawTarget.toLowerCase())
    )

    if (filtered.length > 0) {
      allTracked = filtered
    } else {
      const parsed = parseProfileInput(options.target)
      if (parsed.platform !== 'unknown' && parsed.username) {
        const fallbackTargetDir = resolveDefaultDownloadDir(parsed.platform, parsed.username, options.outputDir)
        allTracked = [{
          platform: parsed.platform,
          username: parsed.username.toLowerCase(),
          profileUrl: parsed.cleanUrl || `https://${parsed.platform}.com/${parsed.username}`,
          targetDir: fallbackTargetDir,
          choice: options.choice || 'all',
          lastPulledAt: new Date().toISOString(),
          mediaCount: 0,
        }]
      } else {
        allTracked = []
      }
    }
  }

  const itemsResult: PullItemResult[] = []
  let totalDownloaded = 0
  let totalSkipped = 0
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < allTracked.length; i++) {
    if (options.signal?.aborted) break

    const profileRec = allTracked[i]!
    let targetDir = profileRec.targetDir

    if (!fs.existsSync(targetDir)) {
      targetDir = resolveDefaultDownloadDir(profileRec.platform, profileRec.username, options.outputDir)
      await fsPromises.mkdir(targetDir, { recursive: true })
      profileRec.targetDir = targetDir
    }

    options.onProfileStart?.(profileRec, i, allTracked.length)

    let parsed: ParsedProfile = parseProfileInput(profileRec.profileUrl)
    if (parsed.platform === 'unknown' || !parsed.username) {
      parsed = buildCanonicalProfile(profileRec.platform as SupportedPlatform, profileRec.username, profileRec.profileUrl)
    }

    const choice = options.choice || (profileRec.choice as MediaTarget) || 'all'

    try {
      const res = await dispatchDownload({
        profile: parsed,
        choice,
        outputDir: targetDir,
        earlyExitThreshold,
        signal: options.signal,
        runnerOverrides: options.runnerOverrides,
        onProgress: (engineProg) => {
          options.onProfileProgress?.({
            profile: profileRec,
            index: i,
            total: allTracked.length,
            status: 'downloading',
            engineProgress: engineProg,
            downloaded: engineProg.downloadedCount,
            skipped: engineProg.skippedCount,
          })
        },
      })

      const itemRes: PullItemResult = {
        profile: profileRec,
        status: res.success ? 'success' : (res.downloadedCount > 0 ? 'success' : 'failed'),
        downloaded: res.downloadedCount,
        skipped: res.skippedCount,
        error: res.errors.length > 0 ? res.errors.join('; ') : undefined,
        targetDir,
      }

      totalDownloaded += res.downloadedCount
      totalSkipped += res.skippedCount

      if (itemRes.status === 'success') {
        succeeded++
        ledger.trackProfile({
          ...profileRec,
          targetDir,
          choice,
          lastPulledAt: new Date().toISOString(),
          mediaCount: profileRec.mediaCount + res.downloadedCount,
          status: 'ok',
        })
        options.onProfileComplete?.(itemRes, i, allTracked.length)
      } else {
        failed++
        ledger.trackProfile({
          ...profileRec,
          targetDir,
          lastPulledAt: new Date().toISOString(),
          status: 'error',
        })
        options.onProfileError?.(profileRec, new Error(itemRes.error || 'Download failed'))
      }

      itemsResult.push(itemRes)
    } catch (err: unknown) {
      failed++
      const errMsg = err instanceof Error ? err.message : String(err)
      const itemRes: PullItemResult = {
        profile: profileRec,
        status: 'failed',
        downloaded: 0,
        skipped: 0,
        error: errMsg,
        targetDir,
      }
      itemsResult.push(itemRes)
      ledger.trackProfile({
        ...profileRec,
        targetDir,
        lastPulledAt: new Date().toISOString(),
        status: 'error',
      })
      options.onProfileError?.(profileRec, err instanceof Error ? err : new Error(errMsg))
    }

    if (i < allTracked.length - 1 && !options.signal?.aborted) {
      const delay = minDelay + Math.random() * Math.max(0, maxDelay - minDelay)
      await sleep(delay, options.signal)
    }
  }

  return {
    total: allTracked.length,
    succeeded,
    failed,
    totalDownloaded,
    totalSkipped,
    items: itemsResult,
  }
}
