import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'
import {loadConfig} from '../config.js'
import {findCookieFile, createSafeCookieCopy} from '../cookies.js'
import {resolveBrowserCookieArg, exportCookiesForPlatform} from '../cookies/browser-bridge.js'
import {getExtractor} from './extractors/index.js'
import {downloadMediaStream} from './downloader.js'
import {loadCheckpoint, saveCheckpoint, clearCheckpoint} from './checkpoint.js'
import {filterMediaStream, parseDateBoundary, parseLimit} from './filters.js'
import {runGalleryDl} from './gallery-dl.js'
import {runYtDlp} from './yt-dlp.js'
import {countMediaFilesInDir} from './storage/disk-sync.js'
import {
  TaskManager,
  defaultTaskManager,
  resolveDownloadBaseDir,
  resolveDefaultDownloadDir,
  cleanupEmptyCategoryDirs,
} from './core/task-manager.js'
import type {SupportedPlatform} from '../parser.js'
import type {DispatchOptions, EngineResult, EngineProgress} from './types.js'

export {
  TaskManager,
  defaultTaskManager,
  resolveDownloadBaseDir,
  resolveDefaultDownloadDir,
  cleanupEmptyCategoryDirs,
}

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

export async function createBrowserCookieCopy(
  platform: string,
  rawBrowserPref: string,
): Promise<{filePath: string; isTemporary: boolean; cleanup: () => Promise<void>} | null> {
  if (platform === 'unknown' || !rawBrowserPref || rawBrowserPref.toLowerCase() === 'none') {
    return null
  }
  try {
    const tempCookieDir = await fs.mkdtemp(path.join(os.tmpdir(), 'open-nami-cookies-'))
    const tempCookieFile = path.join(
      tempCookieDir,
      `cookie-${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`,
    )
    const exported = await exportCookiesForPlatform(rawBrowserPref, platform as SupportedPlatform, tempCookieFile)
    if (exported) {
      try {
        await fs.chmod(tempCookieFile, 0o600)
      } catch {}
      return {
        filePath: tempCookieFile,
        isTemporary: true,
        cleanup: async () => {
          try {
            await fs.rm(tempCookieDir, {recursive: true, force: true})
          } catch {}
        },
      }
    } else {
      try {
        await fs.rm(tempCookieDir, {recursive: true, force: true})
      } catch {}
    }
  } catch {}
  return null
}

export async function dispatchDownload(options: DispatchOptions): Promise<EngineResult> {
  const {profile, choice, onProgress} = options
  const targetDir = options.outputDir || resolveDefaultDownloadDir(profile.platform, profile.username)

  if (options.signal?.aborted) {
    return {
      success: false,
      downloadedCount: 0,
      skippedCount: 0,
      errors: ['Download aborted'],
      outputDir: targetDir,
    }
  }

  await fs.mkdir(targetDir, {recursive: true})

  const rawBrowserPref = options.cookiesFromBrowser ?? loadConfig().cookiesFromBrowser ?? 'auto'
  const resolvedBrowserArg = resolveBrowserCookieArg(rawBrowserPref)
  const cookiesFromBrowser = resolvedBrowserArg ?? undefined

  defaultTaskManager.events.emit('job:start', { profile, choice, outputDir: targetDir })

  const masterCookie = findCookieFile(profile.platform)
  let cookieCopy = masterCookie ? await createSafeCookieCopy(masterCookie) : null

  if (!cookieCopy && rawBrowserPref && rawBrowserPref.toLowerCase() !== 'none') {
    cookieCopy = await createBrowserCookieCopy(profile.platform, rawBrowserPref)
  }

  let totalDownloaded = 0
  let totalSkipped = 0
  const errors: string[] = []
  const activeLedger = options.ledger || defaultTaskManager.ledger

  const recordError = (err: string) => {
    errors.push(err)
    defaultTaskManager.events.emit('job:error', { error: err })
  }

  const handleProgress = (progress: EngineProgress) => {
    defaultTaskManager.events.emit('job:progress', progress)
    if (progress.currentFile && progress.statusText?.startsWith('Saved:')) {
      try {
        if (progress.itemId) {
          activeLedger.recordMedia({
            id: progress.itemId,
            platform: profile.platform,
            author: profile.username,
            url: profile.cleanUrl || '',
            filename: progress.currentFile,
            filePath: path.join(targetDir, progress.currentFile),
            downloadedAt: new Date().toISOString(),
          })
        }
        activeLedger.recordMedia({
          id: `${profile.platform.toLowerCase()}:${profile.username.toLowerCase()}:${progress.currentFile}`,
          platform: profile.platform,
          author: profile.username,
          url: profile.cleanUrl || '',
          filename: progress.currentFile,
          filePath: path.join(targetDir, progress.currentFile),
          downloadedAt: new Date().toISOString(),
        })
      } catch {}
    }
    onProgress?.(progress)
  }

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
      const dest = subDir === 'All' ? targetDir : path.join(targetDir, subDir)
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
          earlyExitThreshold: options.earlyExitThreshold,
          isKnownMedia: (id) => activeLedger.hasMedia(id),
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
          earlyExitThreshold: options.earlyExitThreshold,
          isDuplicate: (item) => activeLedger.hasMedia(item.id, profile.platform, profile.username),
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
          writeMetadata: options.writeMetadata,
          earlyExitThreshold: options.earlyExitThreshold,
          defaultPlatform: profile.platform,
          defaultAuthor: profile.username,
          onProgress: handleProgress,
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
          error: errMsg || 'Execution failed',
        }
      }
    }

    const runNative = options.runnerOverrides?.nativeRunner ?? defaultRunNative

    const runGdl = (subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights' | 'All') => {
      const runnerOpts = {
        profile,
        targetDir,
        subDir,
        cookiePath: cookieCopy?.filePath,
        cookiesFromBrowser,
        signal: options.signal,
        writeMetadata: options.writeMetadata,
        abortAfterDuplicates: options.earlyExitThreshold,
        onProgress: handleProgress,
      }
      return options.runnerOverrides?.gdlRunner
        ? options.runnerOverrides.gdlRunner(subDir, runnerOpts)
        : runGalleryDl(runnerOpts)
    }

    const runYt = () => {
      const runnerOpts = {
        profile,
        targetDir,
        cookiePath: cookieCopy?.filePath,
        cookiesFromBrowser,
        signal: options.signal,
        writeMetadata: options.writeMetadata,
        abortAfterDuplicates: options.earlyExitThreshold,
        onProgress: handleProgress,
      }
      return options.runnerOverrides?.ytRunner
        ? options.runnerOverrides.ytRunner(runnerOpts)
        : runYtDlp(runnerOpts)
    }

    for (const job of jobs) {
      if (options.signal?.aborted) break
      if (globalLimit !== undefined && totalDownloaded >= globalLimit) break

      if (job.type === 'all') {
        let res = await runNative('All')

        // Fallback to gallery-dl and yt-dlp if native extractor failed or found 0 items
        if ((!res.success || (res.downloaded === 0 && res.skipped === 0)) && !options.signal?.aborted) {
          handleProgress({
            job: 'Photos',
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to gallery-dl engine for photos…',
          })
          const gdlPhotos = await runGdl('Photos')
          totalDownloaded += gdlPhotos.downloaded
          totalSkipped += gdlPhotos.skipped
          if (!gdlPhotos.success) recordError(gdlPhotos.error ? `[Photos] ${gdlPhotos.error}` : '[Photos] Execution failed')

          handleProgress({
            job: 'Videos',
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to yt-dlp engine for videos…',
          })
          const ytVideos = await runYt()
          if (ytVideos.downloaded > 0 || ytVideos.skipped > 0 || ytVideos.success) {
            totalDownloaded += ytVideos.downloaded
            totalSkipped += ytVideos.skipped
            if (!ytVideos.success) recordError(ytVideos.error ? `[Videos] ${ytVideos.error}` : '[Videos] Execution failed')
          } else if (!options.signal?.aborted) {
            handleProgress({
              job: 'Videos',
              downloadedCount: totalDownloaded,
              skippedCount: totalSkipped,
              statusText: 'switching to gallery-dl engine for videos…',
            })
            const gdlVideos = await runGdl('Videos')
            totalDownloaded += gdlVideos.downloaded
            totalSkipped += gdlVideos.skipped
            if (!gdlVideos.success) recordError(gdlVideos.error ? `[Videos] ${gdlVideos.error}` : '[Videos] Execution failed')
          }
        } else {
          totalDownloaded += res.downloaded
          totalSkipped += res.skipped
          if (!res.success) recordError(res.error ? `[All] ${res.error}` : '[All] Execution failed')
        }
      } else if (job.type === 'photos' || job.type === 'stories' || job.type === 'highlights') {
        const subDir = job.type === 'photos' ? 'Photos' : job.type === 'stories' ? 'Stories' : 'Highlights'
        let res = await runNative(subDir)

        // Fallback to gallery-dl if native extractor failed or found 0 items (unless error was authentication failure and no browser cookies configured)
        const isAuthError = Boolean(res.error && (res.error.includes('cookie') || res.error.includes('authenticated session') || res.error.includes('Settings (^s)')))
        const hasBrowserFallback = Boolean(cookiesFromBrowser && cookiesFromBrowser !== 'none')
        if ((!isAuthError || hasBrowserFallback) && (!res.success || (res.downloaded === 0 && res.skipped === 0)) && !options.signal?.aborted) {
          handleProgress({
            job: subDir,
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to gallery-dl engine…',
          })
          const gdlRes = await runGdl(subDir)
          if (gdlRes.downloaded > 0 || gdlRes.skipped > 0 || (gdlRes.success && !res.error)) {
            res = gdlRes
          }
        }

        totalDownloaded += res.downloaded
        totalSkipped += res.skipped
        if (!res.success) recordError(res.error ? `[${subDir}] ${res.error}` : `[${subDir}] Execution failed`)
      } else if (job.type === 'videos') {
        let res = await runNative('Videos')
        if (res.downloaded > 0 || res.skipped > 0) {
          totalDownloaded += res.downloaded
          totalSkipped += res.skipped
        } else if (!options.signal?.aborted) {
          // Fallback to yt-dlp first for videos
          handleProgress({
            job: 'Videos',
            downloadedCount: totalDownloaded,
            skippedCount: totalSkipped,
            statusText: 'switching to yt-dlp engine…',
          })
          const fbRes = await runYt()
          if (fbRes.downloaded > 0 || fbRes.skipped > 0 || fbRes.success) {
            totalDownloaded += fbRes.downloaded
            totalSkipped += fbRes.skipped
            if (!fbRes.success) recordError(fbRes.error ? `[Videos] ${fbRes.error}` : '[Videos] Execution failed')
          } else if (!options.signal?.aborted) {
            // Further fallback to gallery-dl if yt-dlp also yielded nothing
            handleProgress({
              job: 'Videos',
              downloadedCount: totalDownloaded,
              skippedCount: totalSkipped,
              statusText: 'switching to gallery-dl engine…',
            })
            const gdlRes = await runGdl('Videos')
            totalDownloaded += gdlRes.downloaded
            totalSkipped += gdlRes.skipped
            if (!gdlRes.success) recordError(gdlRes.error ? `[Videos] ${gdlRes.error}` : '[Videos] Execution failed')
          }
        }
      }
    }

    await cleanupEmptyCategoryDirs(targetDir)

    if (errors.length === 0 && !options.signal?.aborted) {
      await clearCheckpoint(targetDir)
    }

    const engineResult: EngineResult = {
      success: errors.length === 0 || totalDownloaded > 0,
      downloadedCount: totalDownloaded,
      skippedCount: totalSkipped,
      errors,
      outputDir: targetDir,
    }

    if (!options.noTrack && (engineResult.success || engineResult.downloadedCount > 0)) {
      const diskStats = countMediaFilesInDir(targetDir)
      const existing = activeLedger.getTrackedProfile(profile.platform, profile.username)
      const finalCount = diskStats.count > 0
        ? diskStats.count
        : (existing?.mediaCount || 0) + engineResult.downloadedCount

      activeLedger.trackProfile({
        platform: profile.platform,
        username: profile.username,
        profileUrl: profile.cleanUrl || `https://${profile.platform}.com/${profile.username}`,
        targetDir,
        choice: choice === 'all' && diskStats.choice ? diskStats.choice : choice,
        lastPulledAt: new Date().toISOString(),
        mediaCount: finalCount,
        status: errors.length === 0 ? 'ok' : 'partial',
      })
    }

    defaultTaskManager.events.emit('job:complete', { result: engineResult })
    return engineResult
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    defaultTaskManager.events.emit('job:error', { error: errMsg || 'Execution failed' })
    throw err
  } finally {
    if (cookieCopy) {
      await cookieCopy.cleanup()
    }
  }
}
