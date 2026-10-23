import fsPromises from 'node:fs/promises'
import {parseProfileInput, type ParsedProfile} from './parser.js'
import {dispatchDownload} from './engines/dispatcher.js'
import {sleep} from './engines/extractors/http.js'
import type {MediaTarget, EngineProgress, DispatchRunnerResult} from './engines/types.js'

export interface BatchItem {
  raw: string
  profile: ParsedProfile
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  downloaded: number
  skipped: number
  error?: string
}

export interface BatchQueueOptions {
  filePath?: string
  lines?: string[]
  choice?: MediaTarget
  outputDir?: string
  since?: string
  until?: string
  limit?: number
  resume?: boolean
  minDelayMs?: number
  maxDelayMs?: number
  signal?: AbortSignal
  runnerOverrides?: {
    nativeRunner?: (subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights' | 'All') => Promise<DispatchRunnerResult>
  }
  onAccountStart?: (item: BatchItem, index: number, total: number) => void
  onAccountProgress?: (item: BatchItem, progress: EngineProgress) => void
  onAccountComplete?: (item: BatchItem, index: number, total: number) => void
  onAccountError?: (item: BatchItem, error: Error) => void
}

export interface BatchQueueResult {
  total: number
  succeeded: number
  failed: number
  totalDownloaded: number
  totalSkipped: number
  items: BatchItem[]
}

/**
 * Parses the raw content of a batch text file.
 * Strips comments (lines starting with # or //, or trailing # / //),
 * ignores blank lines, and normalizes entries.
 */
export function parseBatchContent(content: string): string[] {
  const lines = content.split(/\r?\n/)
  const result: string[] = []

  for (const rawLine of lines) {
    let line = rawLine.trim()
    // Ignore comment lines
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue
    }

    // Strip trailing comments (e.g. "https://instagram.com/user # my notes")
    const hashIdx = line.indexOf(' #')
    if (hashIdx !== -1) {
      line = line.slice(0, hashIdx).trim()
    }
    const slashIdx = line.indexOf(' //')
    if (slashIdx !== -1) {
      line = line.slice(0, slashIdx).trim()
    }

    if (line) {
      result.push(line)
    }
  }

  return result
}

export async function loadBatchFile(filePath: string): Promise<string[]> {
  const content = await fsPromises.readFile(filePath, 'utf-8')
  return parseBatchContent(content)
}

/**
 * Sequentially processes a queue of profile targets with randomized cooldown jitter
 * between accounts to prevent IP/rate-limit blocks.
 */
export async function runBatchQueue(options: BatchQueueOptions): Promise<BatchQueueResult> {
  const rawEntries = options.lines ?? (options.filePath ? await loadBatchFile(options.filePath) : [])
  const choice = options.choice || 'all'
  const minDelay = options.minDelayMs ?? 2000
  const maxDelay = options.maxDelayMs ?? 5000

  const items: BatchItem[] = rawEntries.map(raw => ({
    raw,
    profile: parseProfileInput(raw),
    status: 'pending',
    downloaded: 0,
    skipped: 0,
  }))

  let totalDownloaded = 0
  let totalSkipped = 0
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < items.length; i++) {
    if (options.signal?.aborted) {
      break
    }

    const item = items[i]
    item.status = 'running'

    if (item.profile.platform === 'unknown' || !item.profile.cleanUrl) {
      item.status = 'failed'
      item.error = `Invalid profile URL or unsupported username: ${item.raw}`
      failed++
      options.onAccountError?.(item, new Error(item.error))
      continue
    }

    options.onAccountStart?.(item, i, items.length)

    try {
      const res = await dispatchDownload({
        profile: item.profile,
        choice,
        outputDir: options.outputDir,
        since: options.since,
        until: options.until,
        limit: options.limit,
        resume: options.resume,
        signal: options.signal,
        runnerOverrides: options.runnerOverrides,
        onProgress: (progress) => {
          options.onAccountProgress?.(item, progress)
        },
      })

      item.downloaded = res.downloadedCount
      item.skipped = res.skippedCount
      totalDownloaded += res.downloadedCount
      totalSkipped += res.skippedCount

      if (res.success) {
        item.status = 'success'
        succeeded++
      } else {
        item.status = 'failed'
        item.error = res.errors.join('; ') || 'Download failed'
        failed++
      }

      options.onAccountComplete?.(item, i, items.length)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      item.status = 'failed'
      item.error = errMsg
      failed++
      options.onAccountError?.(item, err instanceof Error ? err : new Error(errMsg))
    }

    // Cooldown jitter before next account
    if (i < items.length - 1 && !options.signal?.aborted) {
      await sleep(minDelay, maxDelay, options.signal)
    }
  }

  return {
    total: items.length,
    succeeded,
    failed,
    totalDownloaded,
    totalSkipped,
    items,
  }
}
