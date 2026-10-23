import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import {findCookieFile, createSafeCookieCopy} from '../cookies.js'
import {resolvePlatformDownloadsDir} from '../known-folders.js'
import {loadConfig} from '../config.js'
import {getExtractor} from './extractors/index.js'
import {downloadMediaStream} from './downloader.js'
import {loadCheckpoint, saveCheckpoint, clearCheckpoint} from './checkpoint.js'
import {filterMediaStream, parseDateBoundary, parseLimit} from './filters.js'
import {runGalleryDl} from './gallery-dl.js'
import {runYtDlp} from './yt-dlp.js'
import type {SupportedPlatform} from '../parser.js'
import type {DispatchOptions, EngineResult} from './types.js'

interface JobRunResult {
  success: boolean
  downloaded: number
  skipped: number
  error?: string
}

export const REFERER_MAP: Record<SupportedPlatform, string> = {
  tiktok: 'https://www.tiktok.com/',
  instagram: 'https://www.instagram.com/',
  x: 'https://x.com/',
  facebook: 'https://www.facebook.com/',
}

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

export async function dispatchDownload(options: DispatchOptions): Promise<EngineResult> {
  const {profile, choice, onProgress} = options
  const targetDir = options.outputDir || resolveDefaultDownloadDir(profile.platform, profile.username)
  await fs.mkdir(targetDir, {recursive: true})

  const masterCookie = findCookieFile(profile.platform)
  const cookieCopy = masterCookie ? await createSafeCookieCopy(masterCookie) : null

  let totalDownloaded = 0
  let totalSkipped = 0
  const errors: string[] = []

  try {
    const jobs: Array<{type: 'photos' | 'videos' | 'stories' | 'highlights' | 'all'}> = []

    if (choice === 'photos') {
      jobs.push({type: 'photos'})
    } else if (choice === 'videos') {
      jobs.push({type: 'videos'})
    } else if (choice === 'stories') {
      jobs.push({type: 'stories'})
    } else if (choice === 'highlights') {
      jobs.push({type: 'highlights'})
    } else if (choice === 'all') {
      jobs.push({type: 'all'})
      if (profile.platform === 'instagram') {
        jobs.push({type: 'stories'})
        jobs.push({type: 'highlights'})
      }
    }

    const sinceSeconds = parseDateBoundary(options.since, 'since')
    const untilSeconds = parseDateBoundary(options.until, 'until')
    const globalLimit = parseLimit(options.limit)
    const savedCheckpoint = options.resume ? await loadCheckpoint(targetDir) : null
    const currentCursors: Record<string, string> = savedCheckpoint?.cursors ? {...savedCheckpoint.cursors} : {}

    const defaultRunNative = async (subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights' | 'All'): Promise<JobRunResult> => {
      const dest = path.join(targetDir, subDir)
      const remainingLimit = globalLimit !== undefined ? Math.max(0, globalLimit - totalDownloaded) : undefined
      if (remainingLimit === 0) {
        return {success: true, downloaded: 0, skipped: 0}
      }
      try {
        const extractor = getExtractor(profile.platform as SupportedPlatform)
        const subDirKey = (subDir === 'All' ? 'timeline' : subDir.toLowerCase())
        const initialCursor = options.resume ? currentCursors[subDirKey] : undefined
        const items = extractor.extract(profile, {
          subDir,
          cookiePath: cookieCopy?.filePath,
          signal: options.signal,
          since: sinceSeconds,
          until: untilSeconds,
          limit: remainingLimit,
          initialCursor,
          onCheckpoint: async (key, val) => {
            if (val) {
              currentCursors[key] = val
            } else {
              delete currentCursors[key]
            }
            await saveCheckpoint(targetDir, {
              version: 1,
              platform: profile.platform,
              username: profile.username,
              updatedAt: new Date().toISOString(),
              cursors: currentCursors,
              completed: Object.keys(currentCursors).length === 0,
            })
          },
        })
        const filtered = filterMediaStream(items, {
          since: sinceSeconds,
          until: untilSeconds,
          limit: remainingLimit,
        })
        const res = await downloadMediaStream(filtered, {
          jobName: `${profile.username} ${subDir}`,
          destDir: dest,
          destDirMap: subDir === 'All' ? {
            photo: path.join(targetDir, 'Photos'),
            video: path.join(targetDir, 'Videos'),
          } : undefined,
          cookiePath: cookieCopy?.filePath,
          referer: REFERER_MAP[profile.platform as SupportedPlatform],
          signal: options.signal,
          limit: remainingLimit,
          onProgress,
        })
        return {
          success: res.errors.length === 0,
          downloaded: res.downloaded,
          skipped: res.skipped,
          ...(res.errors.length > 0 ? { error: res.errors.join('; ') } : {}),
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        return {
          success: false,
          downloaded: 0,
          skipped: 0,
          error: errMsg,
        }
      }
    }

    const runNative = options.runnerOverrides?.nativeRunner ?? defaultRunNative

    const runGdl = options.runnerOverrides?.gdlRunner ?? ((subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights' | 'All') =>
      runGalleryDl({
        profile,
        targetDir,
        subDir,
        cookiePath: cookieCopy?.filePath,
        signal: options.signal,
        onProgress,
      }))

    const runYt = options.runnerOverrides?.ytRunner ?? (() =>
      runYtDlp({
        profile,
        targetDir,
        cookiePath: cookieCopy?.filePath,
        signal: options.signal,
        onProgress,
      }))

    for (const job of jobs) {
      if (options.signal?.aborted) break
      if (globalLimit !== undefined && totalDownloaded >= globalLimit) break

      if (job.type === 'all') {
        let res = await runNative('All')

        // Fallback to gallery-dl and yt-dlp if native extractor failed or found 0 items
        if ((!res.success || (res.downloaded === 0 && res.skipped === 0)) && !options.signal?.aborted) {
          onProgress?.({
            job: 'Photos',
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to gallery-dl engine for photos…',
          })
          const gdlPhotos = await runGdl('Photos')
          totalDownloaded += gdlPhotos.downloaded
          totalSkipped += gdlPhotos.skipped
          if (!gdlPhotos.success && gdlPhotos.error) errors.push(`[Photos] ${gdlPhotos.error}`)

          onProgress?.({
            job: 'Videos',
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to yt-dlp engine for videos…',
          })
          const ytVideos = await runYt()
          if (ytVideos.downloaded > 0 || ytVideos.skipped > 0 || ytVideos.success) {
            totalDownloaded += ytVideos.downloaded
            totalSkipped += ytVideos.skipped
            if (!ytVideos.success && ytVideos.error) errors.push(`[Videos] ${ytVideos.error}`)
          } else if (!options.signal?.aborted) {
            onProgress?.({
              job: 'Videos',
              downloadedCount: totalDownloaded,
              skippedCount: totalSkipped,
              statusText: 'switching to gallery-dl engine for videos…',
            })
            const gdlVideos = await runGdl('Videos')
            totalDownloaded += gdlVideos.downloaded
            totalSkipped += gdlVideos.skipped
            if (!gdlVideos.success && gdlVideos.error) errors.push(`[Videos] ${gdlVideos.error}`)
          }
        } else {
          totalDownloaded += res.downloaded
          totalSkipped += res.skipped
          if (!res.success && res.error) errors.push(`[All] ${res.error}`)
        }
      } else if (job.type === 'photos' || job.type === 'stories' || job.type === 'highlights') {
        const subDir = job.type === 'photos' ? 'Photos' : job.type === 'stories' ? 'Stories' : 'Highlights'
        let res = await runNative(subDir)

        // Fallback to gallery-dl if native extractor failed or found 0 items
        if ((!res.success || (res.downloaded === 0 && res.skipped === 0)) && !options.signal?.aborted) {
          onProgress?.({
            job: subDir,
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to gallery-dl engine…',
          })
          const gdlRes = await runGdl(subDir)
          if (gdlRes.downloaded > 0 || gdlRes.skipped > 0 || gdlRes.success) {
            res = gdlRes
          }
        }

        totalDownloaded += res.downloaded
        totalSkipped += res.skipped
        if (!res.success && res.error) errors.push(`[${subDir}] ${res.error}`)
      } else if (job.type === 'videos') {
        let res = await runNative('Videos')
        if (res.downloaded > 0 || res.skipped > 0) {
          totalDownloaded += res.downloaded
          totalSkipped += res.skipped
        } else if (!options.signal?.aborted) {
          // Fallback to yt-dlp first for videos
          onProgress?.({
            job: 'Videos',
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to yt-dlp engine…',
          })
          const fbRes = await runYt()
          if (fbRes.downloaded > 0 || fbRes.skipped > 0 || fbRes.success) {
            totalDownloaded += fbRes.downloaded
            totalSkipped += fbRes.skipped
            if (!fbRes.success && fbRes.error) errors.push(`[Videos] ${fbRes.error}`)
          } else if (!options.signal?.aborted) {
            // Further fallback to gallery-dl if yt-dlp also yielded nothing
            onProgress?.({
              job: 'Videos',
              downloadedCount: totalDownloaded,
              skippedCount: totalSkipped,
              statusText: 'switching to gallery-dl engine…',
            })
            const gdlRes = await runGdl('Videos')
            totalDownloaded += gdlRes.downloaded
            totalSkipped += gdlRes.skipped
            if (!gdlRes.success && gdlRes.error) errors.push(`[Videos] ${gdlRes.error}`)
          }
        }
      }
    }

    if (errors.length === 0 && !options.signal?.aborted) {
      await clearCheckpoint(targetDir)
    }

    return {
      success: errors.length === 0 || totalDownloaded > 0,
      downloadedCount: totalDownloaded,
      skippedCount: totalSkipped,
      errors,
      outputDir: targetDir,
    }
  } finally {
    if (cookieCopy) {
      await cookieCopy.cleanup()
    }
  }
}
