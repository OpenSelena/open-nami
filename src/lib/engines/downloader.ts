import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {HttpClient} from './extractors/http.js'
import type {MediaItem, MediaType} from './extractors/types.js'
import type {EngineProgress} from './types.js'
import {buildMetadataSidecar, writeMetadataSidecar} from './metadata.js'

export const ARCHIVE_FILENAME = '.open-nami-archive.json'
export const YTDLP_ARCHIVE_FILENAME = 'archive_yt-dlp.txt'
export const TEXT_ARCHIVE_FILENAME = 'archive.txt'

export async function loadArchive(destDir: string): Promise<Set<string>> {
  const archive = new Set<string>()

  // 1. JSON primary archive
  const jsonPath = path.join(destDir, ARCHIVE_FILENAME)
  try {
    const raw = await fsPromises.readFile(jsonPath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (id) archive.add(String(id))
      }
    }
  } catch {}

  // 2. yt-dlp text archive (archive_yt-dlp.txt)
  const ytdlpPath = path.join(destDir, YTDLP_ARCHIVE_FILENAME)
  try {
    const raw = await fsPromises.readFile(ytdlpPath, 'utf-8')
    const lines = raw.split(/\r?\n/)
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const parts = line.split(/\s+/)
      const id = parts[parts.length - 1]
      if (id) archive.add(id)
    }
  } catch {}

  // 3. Fallback generic text archive (archive.txt)
  const textPath = path.join(destDir, TEXT_ARCHIVE_FILENAME)
  try {
    const raw = await fsPromises.readFile(textPath, 'utf-8')
    const lines = raw.split(/\r?\n/)
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const parts = line.split(/\s+/)
      const id = parts[parts.length - 1]
      if (id) archive.add(id)
    }
  } catch {}

  return archive
}

export async function saveArchive(destDir: string, archive: Set<string>): Promise<void> {
  const archivePath = path.join(destDir, ARCHIVE_FILENAME)
  const tmpPath = `${archivePath}.tmp`
  try {
    await fsPromises.writeFile(tmpPath, JSON.stringify([...archive]), 'utf-8')
    await fsPromises.rename(tmpPath, archivePath)
  } catch {}

  // Synchronize cross-engine text archives for yt-dlp & fallback engine deduplication
  const textPaths = [
    path.join(destDir, YTDLP_ARCHIVE_FILENAME),
    path.join(destDir, TEXT_ARCHIVE_FILENAME),
  ]
  const content = [...archive].map(id => `${id}\n`).join('')
  for (const tPath of textPaths) {
    try {
      await fsPromises.writeFile(tPath, content, 'utf-8')
    } catch {}
  }
}


export interface StreamDownloadOptions {
  jobName: string
  destDir: string
  destDirMap?: Partial<Record<MediaType, string>>
  httpClient?: HttpClient
  cookiePath?: string | null
  referer?: string
  signal?: AbortSignal
  concurrency?: number
  limit?: number
  writeMetadata?: boolean
  defaultPlatform?: string
  defaultAuthor?: string
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

export function isCdnUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase()
    return (
      hostname.endsWith('.cdninstagram.com') ||
      hostname.endsWith('.fbcdn.net') ||
      hostname.endsWith('.tiktokcdn.com') ||
      hostname.endsWith('.akamaized.net') ||
      hostname === 'pbs.twimg.com' ||
      hostname === 'video.twimg.com'
    )
  } catch {
    return false
  }
}

export async function downloadMediaStream(
  items: AsyncIterable<MediaItem>,
  options: StreamDownloadOptions,
): Promise<StreamDownloadResult> {
  const {jobName, destDir, signal, onProgress} = options
  const httpClient = options.httpClient ?? new HttpClient()
  const concurrency = Math.max(1, options.concurrency ?? 3)

  const dirArchives = new Map<string, Set<string>>()
  const getArchiveForDir = async (dir: string): Promise<Set<string>> => {
    let arch = dirArchives.get(dir)
    if (!arch) {
      await fsPromises.mkdir(dir, {recursive: true})
      arch = await loadArchive(dir)
      dirArchives.set(dir, arch)
    }
    return arch
  }

  if (options.destDirMap && Object.values(options.destDirMap).some(Boolean)) {
    for (const d of Object.values(options.destDirMap)) {
      if (d) await getArchiveForDir(d)
    }
  } else {
    await getArchiveForDir(destDir)
  }

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
      if (options.limit !== undefined && downloaded >= options.limit) {
        isDone = true
        break
      }
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
        const cleanErr = errMsg.includes('429')
          ? 'rate limited by platform (HTTP 429)'
          : errMsg.length > 50
            ? `${errMsg.slice(0, 47)}…`
            : errMsg
        onProgress?.({
          job: jobName,
          downloadedCount: downloaded,
          skippedCount: skipped,
          currentFile: '',
          statusText: `Extractor error: ${cleanErr}`,
        })
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS || signal?.aborted) {
          isDone = true
          break
        }
        continue
      }

      const targetDir = options.destDirMap?.[item.type] ?? destDir
      const archive = await getArchiveForDir(targetDir)
      const ext = item.extension.replace(/^\./, '') || (item.type === 'video' ? 'mp4' : 'jpg')
      const finalFilename = sanitizeFilename(item.filename, item.id, ext)
      const finalPath = path.join(targetDir, finalFilename)
      const sidecarPath = path.join(targetDir, `${path.parse(finalFilename).name}.json`)

      if (archive.has(item.id) && fs.existsSync(finalPath)) {
        if (options.writeMetadata && !fs.existsSync(sidecarPath)) {
          try {
            const sidecar = buildMetadataSidecar(item, finalFilename, options.defaultPlatform, options.defaultAuthor)
            await writeMetadataSidecar(sidecarPath, sidecar, item.date)
          } catch {}
        }
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

        const isCdn = isCdnUrl(item.url)
        const response = await httpClient.request(item.url, {
          signal,
          cookiePath: isCdn ? undefined : options.cookiePath,
          headers: reqHeaders,
          retries: 2,
          retryDelayMs: 1500,
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

        if (options.writeMetadata) {
          try {
            const sidecar = buildMetadataSidecar(item, finalFilename, options.defaultPlatform, options.defaultAuthor)
            await writeMetadataSidecar(sidecarPath, sidecar, item.date)
          } catch {}
        }

        archive.add(item.id)
        downloaded++
        consecutiveErrors = 0
        if (options.limit !== undefined && downloaded >= options.limit) {
          isDone = true
        }

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

  for (const [d, arch] of dirArchives.entries()) {
    await saveArchive(d, arch)
  }

  return {downloaded, skipped, errors}
}
