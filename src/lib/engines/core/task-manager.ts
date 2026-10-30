import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import { EngineEventBus } from './event-bus.js'
import { MediaLedger } from '../storage/ledger.js'
import { ExtractorPluginRegistry, defaultPluginRegistry } from './plugin.js'
import { resolvePlatformDownloadsDir } from '../../known-folders.js'
import { loadConfig } from '../../config.js'
import type { DispatchOptions, EngineResult } from '../types.js'

function expandPath(dir: string): string {
  if (dir.startsWith('~/') || dir.startsWith('~\\') || dir === '~') {
    return path.join(os.homedir(), dir.slice(1))
  }
  return dir
}

export function resolveDownloadBaseDir(customBaseDir?: string): string {
  if (customBaseDir && customBaseDir.trim()) {
    return path.resolve(expandPath(customBaseDir.trim()))
  }
  const envDir = process.env.OPEN_NAMI_DIR || process.env.NAMI_DIR
  if (envDir && envDir.trim()) {
    return path.resolve(expandPath(envDir.trim()))
  }
  const configDir = loadConfig().downloadDir
  if (configDir && configDir.trim()) {
    return path.resolve(expandPath(configDir.trim()))
  }
  if (process.env.NAMI_BASE_DIR && process.env.NAMI_BASE_DIR.trim()) {
    const raw = process.env.NAMI_BASE_DIR.trim()
    return path.resolve(expandPath(raw.endsWith('downloads') ? raw : path.join(raw, 'downloads')))
  }

  // Dynamically auto-detect user's platform Downloads folder (like Open Omni)
  return path.join(resolvePlatformDownloadsDir(), 'Open Nami')
}

export function resolveDefaultDownloadDir(
  platform: string,
  username: string,
  baseDir?: string,
): string {
  const root = resolveDownloadBaseDir(baseDir)
  return path.join(root, platform, username)
}

export async function cleanupEmptyCategoryDirs(targetDir: string): Promise<void> {
  const candidateDirs = ['All', 'Stories', 'Highlights', 'Photos', 'Videos']
  for (const dirName of candidateDirs) {
    const fullPath = path.join(targetDir, dirName)
    try {
      if (!fsSync.existsSync(fullPath)) continue
      const entries = await fs.readdir(fullPath)
      const nonArchiveEntries = entries.filter(
        e =>
          e !== '.open-nami-archive.json' &&
          e !== 'archive.txt' &&
          e !== 'archive_yt-dlp.txt' &&
          e !== 'archive_gallery-dl.sqlite3',
      )
      if (nonArchiveEntries.length === 0) {
        for (const entry of entries) {
          try {
            await fs.unlink(path.join(fullPath, entry))
          } catch {}
        }
        await fs.rmdir(fullPath).catch(() => {})
      }
    } catch {}
  }
}

export class TaskManager {
  readonly events: EngineEventBus
  readonly ledger: MediaLedger
  readonly plugins: ExtractorPluginRegistry

  constructor(eventBus?: EngineEventBus, ledger?: MediaLedger, plugins?: ExtractorPluginRegistry) {
    this.events = eventBus || new EngineEventBus()
    this.ledger = ledger || new MediaLedger()
    this.plugins = plugins || defaultPluginRegistry
  }

  async execute(options: DispatchOptions): Promise<EngineResult> {
    const { profile, choice } = options
    const targetDir = options.outputDir || resolveDefaultDownloadDir(profile.platform, profile.username)

    this.events.emit('job:start', { profile, choice, outputDir: targetDir })

    let downloadedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    if (options.runnerOverrides?.nativeRunner) {
      const subDir = choice === 'all' ? 'All' : (choice.charAt(0).toUpperCase() + choice.slice(1)) as any
      const runRes = await options.runnerOverrides.nativeRunner(subDir)
      downloadedCount += runRes.downloaded
      skippedCount += runRes.skipped
      if (!runRes.success) errors.push(runRes.error || 'Execution failed')
    }

    await cleanupEmptyCategoryDirs(targetDir)

    const result: EngineResult = {
      success: errors.length === 0,
      downloadedCount,
      skippedCount,
      errors,
      outputDir: targetDir,
    }

    if (!options.noTrack && (result.success || result.downloadedCount > 0)) {
      const existing = this.ledger.getTrackedProfile(profile.platform, profile.username)
      this.ledger.trackProfile({
        platform: profile.platform,
        username: profile.username,
        profileUrl: profile.cleanUrl || `https://${profile.platform}.com/${profile.username}`,
        targetDir,
        choice,
        lastPulledAt: new Date().toISOString(),
        mediaCount: (existing?.mediaCount || 0) + result.downloadedCount,
        status: errors.length === 0 ? 'ok' : 'partial',
      })
    }

    this.events.emit('job:complete', { result })
    return result
  }
}

export const defaultTaskManager = new TaskManager()
