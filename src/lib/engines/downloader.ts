import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {HttpClient} from './extractors/http.js'
import type {MediaItem} from './extractors/types.js'
import type {EngineProgress} from './types.js'

export const ARCHIVE_FILENAME = '.open-nami-archive.json'

export async function loadArchive(destDir: string): Promise<Set<string>> {
  const archivePath = path.join(destDir, ARCHIVE_FILENAME)
  try {
    const raw = await fsPromises.readFile(archivePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed)
    }
  } catch {}
  return new Set<string>()
}

export async function saveArchive(destDir: string, archive: Set<string>): Promise<void> {
  const archivePath = path.join(destDir, ARCHIVE_FILENAME)
  const tmpPath = `${archivePath}.tmp`
  try {
    await fsPromises.writeFile(tmpPath, JSON.stringify([...archive]), 'utf-8')
    await fsPromises.rename(tmpPath, archivePath)
  } catch {}
}

export interface StreamDownloadOptions {
  jobName: string
  destDir: string
  httpClient?: HttpClient
  cookiePath?: string | null
  referer?: string
  signal?: AbortSignal
  concurrency?: number
  onProgress?: (progress: EngineProgress) => void
}

export interface StreamDownloadResult {
  downloaded: number
  skipped: number
  errors: string[]
}

export function sanitizeFilename(rawFilename: string, fallbackId: string, ext: string): string {
  const cleanExt = ext.replace(/^\./, '')
  const baseOnly = path.basename(rawFilename)
  let sanitizedBase = baseOnly
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/[. ]+$/, '')
    .trim()

  if (!sanitizedBase || /^_+$/.test(sanitizedBase)) {
    sanitizedBase = `item_${fallbackId}`
  }

  // Guard against Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(sanitizedBase)) {
    sanitizedBase = `_${sanitizedBase}`
  }

  return sanitizedBase.includes('.') ? sanitizedBase : `${sanitizedBase}.${cleanExt}`
}

export async function downloadMediaStream(
  items: AsyncIterable<MediaItem>,
  options: StreamDownloadOptions,
): Promise<StreamDownloadResult> {
  const {jobName, destDir, signal, onProgress} = options
  const httpClient = options.httpClient ?? new HttpClient()
  const concurrency = Math.max(1, options.concurrency ?? 3)

  await fsPromises.mkdir(destDir, {recursive: true})
  const archive = await loadArchive(destDir)

  let downloaded = 0
  let skipped = 0
  const errors: string[] = []

  const iterator = items[Symbol.asyncIterator]()
  let queueLock = Promise.resolve()
  let isDone = false
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 5

  function getNextItem(): Promise<IteratorResult<MediaItem>> {
    const nextItem = queueLock.then(() => iterator.next())
    queueLock = nextItem.then(
      () => {},
      () => {},
    )
    return nextItem
  }

  async function downloadWorker(): Promise<void> {
    while (!isDone && !signal?.aborted) {
      let item: MediaItem
      try {
        const next = await getNextItem()
        if (next.done) {
          isDone = true
          break
        }
        consecutiveErrors = 0
        item = next.value
      } catch (err: unknown) {
        consecutiveErrors++
        const errMsg = err instanceof Error ? err.message : String(err)
        errors.push(`Extraction stream error: ${errMsg}`)
        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: '',
          statusText: `Extractor glitch: ${errMsg}`,
        })
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS || signal?.aborted) {
          isDone = true
          break
        }
        continue
      }

      const ext = item.extension.replace(/^\./, '') || (item.type === 'video' ? 'mp4' : 'jpg')
      const finalFilename = sanitizeFilename(item.filename, item.id, ext)
      const finalPath = path.join(destDir, finalFilename)

      if (archive.has(item.id) && fs.existsSync(finalPath)) {
        skipped++
        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: finalFilename,
          statusText: `Skipping already downloaded: ${finalFilename}`,
        })
        continue
      }

      onProgress?.({
        job: jobName,
        downloadedCount: downloaded,
        skippedCount: skipped,
        currentFile: finalFilename,
        statusText: `Downloading: ${finalFilename}`,
      })

      const tmpPath = `${finalPath}.download`
      try {
        const reqHeaders: Record<string, string> = {}
        if (options.referer) {
          reqHeaders['Referer'] = options.referer
        }

        const response = await httpClient.request(item.url, {
          signal,
          cookiePath: options.cookiePath,
          headers: reqHeaders,
        })

        if (!response.ok || !response.body) {
          try {
            await response.body?.cancel()
          } catch {}
          throw new Error(`HTTP ${response.status} (${response.statusText}) for ${item.url}`)
        }

        const fileStream = fs.createWriteStream(tmpPath)
        await pipeline(Readable.fromWeb(response.body as any), fileStream, {signal})

        if (item.date) {
          try {
            const mtime = new Date(item.date * 1000)
            await fsPromises.utimes(tmpPath, mtime, mtime)
          } catch {}
        }

        await fsPromises.rename(tmpPath, finalPath)

        archive.add(item.id)
        downloaded++

        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: finalFilename,
          statusText: `Saved: ${finalFilename}`,
        })
      } catch (err: unknown) {
        try {
          if (fs.existsSync(tmpPath)) {
            await fsPromises.unlink(tmpPath)
          }
        } catch {}

        if (signal?.aborted) {
          break
        }

        const errMsg = err instanceof Error ? err.message : String(err)
        errors.push(`${finalFilename}: ${errMsg}`)

        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: finalFilename,
          statusText: `Failed: ${finalFilename} (${errMsg})`,
        })
      }
    }
  }

  const workers = Array.from({length: concurrency}, () => downloadWorker())
  await Promise.all(workers)

  await saveArchive(destDir, archive)

  return {downloaded, skipped, errors}
}
