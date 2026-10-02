import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import {findCookieFile, createSafeCookieCopy} from '../cookies.js'
import {resolvePlatformDownloadsDir} from '../known-folders.js'
import {loadConfig} from '../config.js'
import {getExtractor} from './extractors/index.js'
import {downloadMediaStream} from './downloader.js'
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
  const configDir = loadConfig().downloadDir
  if (configDir && configDir.trim()) {
    return path.resolve(expandPath(configDir.trim()))
  }
  const envDir = process.env.OPEN_NAMI_DIR || process.env.NAMI_DIR
  if (envDir && envDir.trim()) {
    return path.resolve(expandPath(envDir.trim()))
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
    const jobs: Array<{type: 'photos' | 'videos' | 'stories' | 'highlights'}> = []

    if (choice === 'photos') {
      jobs.push({type: 'photos'})
    } else if (choice === 'videos') {
      jobs.push({type: 'videos'})
    } else if (choice === 'stories') {
      jobs.push({type: 'stories'})
    } else if (choice === 'highlights') {
      jobs.push({type: 'highlights'})
    } else if (choice === 'all') {
      jobs.push({type: 'photos'})
      jobs.push({type: 'videos'})
      if (profile.platform === 'instagram') {
        jobs.push({type: 'stories'})
        jobs.push({type: 'highlights'})
      }
    }

    const runNative = async (subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights'): Promise<JobRunResult> => {
      const dest = path.join(targetDir, subDir)
      try {
        const extractor = getExtractor(profile.platform as SupportedPlatform)
        const items = extractor.extract(profile, {
          subDir,
          cookiePath: cookieCopy?.filePath,
          signal: options.signal,
        })
        const res = await downloadMediaStream(items, {
          jobName: `${profile.username} ${subDir}`,
          destDir: dest,
          cookiePath: cookieCopy?.filePath,
          referer: REFERER_MAP[profile.platform as SupportedPlatform],
          signal: options.signal,
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

    const runGdl = (subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights') =>
      runGalleryDl({
        profile,
        targetDir,
        subDir,
        cookiePath: cookieCopy?.filePath,
        signal: options.signal,
        onProgress,
      })

    const runYt = () =>
      runYtDlp({
        profile,
        targetDir,
        cookiePath: cookieCopy?.filePath,
        signal: options.signal,
        onProgress,
      })

    for (const job of jobs) {
      if (options.signal?.aborted) break

      if (job.type === 'photos' || job.type === 'stories' || job.type === 'highlights') {
        const subDir = job.type === 'photos' ? 'Photos' : job.type === 'stories' ? 'Stories' : 'Highlights'
        let res = await runNative(subDir)

        // Fallback to gallery-dl if native extractor failed or found 0 items
        if ((!res.success || (res.downloaded === 0 && res.skipped === 0)) && !options.signal?.aborted) {
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
          const fbRes = await runYt()
          if (fbRes.downloaded > 0 || fbRes.skipped > 0 || fbRes.success) {
            totalDownloaded += fbRes.downloaded
            totalSkipped += fbRes.skipped
            if (!fbRes.success && fbRes.error) errors.push(`[Videos] ${fbRes.error}`)
          } else if (!options.signal?.aborted) {
            // Further fallback to gallery-dl if yt-dlp also yielded nothing
            const gdlRes = await runGdl('Videos')
            totalDownloaded += gdlRes.downloaded
            totalSkipped += gdlRes.skipped
            if (!gdlRes.success && gdlRes.error) errors.push(`[Videos] ${gdlRes.error}`)
          }
        }
      }
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
