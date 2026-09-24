import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import {findCookieFile, createSafeCookieCopy} from '../cookies.js'
import {resolvePlatformDownloadsDir} from '../known-folders.js'
import {loadConfig} from '../config.js'
import {runGalleryDl} from './gallery-dl.js'
import {runYtDlp} from './yt-dlp.js'
import type {DispatchOptions, EngineResult} from './types.js'

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
        const res = await runGdl(subDir)
        totalDownloaded += res.downloaded
        totalSkipped += res.skipped
        if (!res.success && res.error) errors.push(`[${subDir}] ${res.error}`)
      } else if (job.type === 'videos') {
        const prefersGdl = profile.platform === 'instagram' || profile.platform === 'tiktok' || profile.platform === 'x'
        const primary = prefersGdl ? () => runGdl('Videos') : runYt
        const fallback = prefersGdl ? runYt : () => runGdl('Videos')

        let res = await primary()
        if (res.downloaded > 0 || res.skipped > 0) {
          totalDownloaded += res.downloaded
          totalSkipped += res.skipped
        } else if (!options.signal?.aborted) {
          const fbRes = await fallback()
          totalDownloaded += fbRes.downloaded
          totalSkipped += fbRes.skipped
          if (!fbRes.success && fbRes.error) errors.push(`[Videos] ${fbRes.error}`)
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
