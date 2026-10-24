import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import test from 'node:test'
import {resolveDownloadBaseDir, resolveDefaultDownloadDir} from './dispatcher.js'

test('resolveDownloadBaseDir prioritizes customBaseDir', () => {
  const custom = path.resolve('D:/CustomDownloads')
  const resolved = resolveDownloadBaseDir('D:/CustomDownloads')
  assert.equal(resolved, custom)
})

test('resolveDownloadBaseDir honors OPEN_NAMI_DIR env variable', () => {
  const prev = process.env.OPEN_NAMI_DIR
  try {
    process.env.OPEN_NAMI_DIR = 'E:/NamiStorage'
    const resolved = resolveDownloadBaseDir()
    assert.equal(resolved, path.resolve('E:/NamiStorage'))
  } finally {
    if (prev === undefined) delete process.env.OPEN_NAMI_DIR
    else process.env.OPEN_NAMI_DIR = prev
  }
})

test('resolveDownloadBaseDir honors config downloadDir', async () => {
  const fsPromises = await import('node:fs/promises')
  const {saveConfig} = await import('../config.js')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-dispatch-test-'))
  const testConfigPath = path.join(tmpDir, 'config.json')
  const prevConfig = process.env.OPEN_NAMI_CONFIG
  const prevNamiDir = process.env.OPEN_NAMI_DIR
  delete process.env.OPEN_NAMI_DIR

  try {
    process.env.OPEN_NAMI_CONFIG = testConfigPath
    saveConfig({downloadDir: 'D:/ConfiguredDownloads'}, testConfigPath)
    const resolved = resolveDownloadBaseDir()
    assert.equal(resolved, path.resolve('D:/ConfiguredDownloads'))
  } finally {
    if (prevConfig !== undefined) process.env.OPEN_NAMI_CONFIG = prevConfig
    else delete process.env.OPEN_NAMI_CONFIG
    if (prevNamiDir !== undefined) process.env.OPEN_NAMI_DIR = prevNamiDir
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('resolveDownloadBaseDir auto-detects platform Downloads folder and appends Open Nami', () => {
  const prevNamiDir = process.env.OPEN_NAMI_DIR
  const prevBase = process.env.NAMI_BASE_DIR
  const prevConfig = process.env.OPEN_NAMI_CONFIG
  delete process.env.OPEN_NAMI_DIR
  delete process.env.NAMI_BASE_DIR
  process.env.OPEN_NAMI_CONFIG = path.join(os.tmpdir(), 'non-existent-config.json')
  try {
    const baseDir = resolveDownloadBaseDir()
    assert.ok(baseDir.endsWith('Open Nami'), `Expected path ending in "Open Nami", got ${baseDir}`)
  } finally {
    if (prevNamiDir !== undefined) process.env.OPEN_NAMI_DIR = prevNamiDir
    if (prevBase !== undefined) process.env.NAMI_BASE_DIR = prevBase
    if (prevConfig !== undefined) process.env.OPEN_NAMI_CONFIG = prevConfig
    else delete process.env.OPEN_NAMI_CONFIG
  }
})

test('resolveDefaultDownloadDir organizes by platform and username', () => {
  const custom = path.resolve('X:/Downloads/Open Nami')
  const profileDir = resolveDefaultDownloadDir('instagram', 'momo', custom)
  assert.equal(profileDir, path.join(custom, 'instagram', 'momo'))
})

test('buildGalleryDlArgs and buildYtDlpArgs place double dash before target URL to prevent flag injection', async () => {
  const {buildGalleryDlArgs} = await import('./gallery-dl.js')
  const {buildYtDlpArgs} = await import('./yt-dlp.js')

  const gdlArgs = buildGalleryDlArgs({
    destDir: 'X:/target',
    subDir: 'Photos',
    platform: 'instagram',
    cleanUrl: '--exec=calc.exe',
    username: 'testuser',
  })
  assert.equal(gdlArgs[gdlArgs.length - 2], '--')
  assert.equal(gdlArgs[gdlArgs.length - 1], '--exec=calc.exe')

  const ytdlpArgs = buildYtDlpArgs({
    destDir: 'X:/target',
    platform: 'tiktok',
    cleanUrl: '--output=hacked',
  })
  assert.equal(ytdlpArgs[ytdlpArgs.length - 2], '--')
  assert.equal(ytdlpArgs[ytdlpArgs.length - 1], '--output=hacked')
})

test('dispatchDownload honors pre-aborted signal and returns immediately', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const controller = new AbortController()
  controller.abort()

  const result = await dispatchDownload({
    profile: {
      platform: 'instagram',
      username: 'aborttest',
      cleanUrl: 'https://www.instagram.com/aborttest/',
      rawInput: 'aborttest',
    },
    choice: 'photos',
    signal: controller.signal,
  })

  assert.equal(result.downloadedCount, 0)
  assert.equal(result.skippedCount, 0)
})

test('buildYtDlpArgs includes concurrent-fragments 4 and anti-ban retry/sleep jitter', async () => {
  const {buildYtDlpArgs} = await import('./yt-dlp.js')

  const tiktokArgs = buildYtDlpArgs({
    destDir: 'X:/target',
    platform: 'tiktok',
    cleanUrl: 'https://www.tiktok.com/@creator',
  })
  assert.ok(tiktokArgs.includes('--concurrent-fragments'), 'yt-dlp args should include --concurrent-fragments')
  assert.equal(tiktokArgs[tiktokArgs.indexOf('--concurrent-fragments') + 1], '4')
  assert.ok(tiktokArgs.includes('--sleep-requests'), 'tiktok args should include --sleep-requests')
  assert.equal(tiktokArgs[tiktokArgs.indexOf('--sleep-requests') + 1], '0.5:1.2')

  const xArgs = buildYtDlpArgs({
    destDir: 'X:/target',
    platform: 'x',
    cleanUrl: 'https://x.com/creator',
  })
  assert.ok(xArgs.includes('--concurrent-fragments'))
  assert.ok(xArgs.includes('--sleep-requests'))
  assert.equal(xArgs[xArgs.indexOf('--sleep-requests') + 1], '0.8:1.8')
})

test('buildGalleryDlArgs includes anti-ban jitter and safe 429 backoff for TikTok and X', async () => {
  const {buildGalleryDlArgs} = await import('./gallery-dl.js')

  const tiktokPhotoArgs = buildGalleryDlArgs({
    destDir: 'X:/target',
    subDir: 'Photos',
    platform: 'tiktok',
    cleanUrl: 'https://www.tiktok.com/@creator',
    username: 'creator',
  })
  assert.ok(tiktokPhotoArgs.includes('--sleep-request'))
  assert.equal(tiktokPhotoArgs[tiktokPhotoArgs.indexOf('--sleep-request') + 1], '0.6-1.2')
  assert.equal(tiktokPhotoArgs[tiktokPhotoArgs.indexOf('--sleep-429') + 1], '10')

  const xVideoArgs = buildGalleryDlArgs({
    destDir: 'X:/target',
    subDir: 'Videos',
    platform: 'x',
    cleanUrl: 'https://x.com/creator',
    username: 'creator',
  })
  assert.ok(xVideoArgs.includes('--sleep-request'))
  assert.equal(xVideoArgs[xVideoArgs.indexOf('--sleep-request') + 1], '0.8-1.5')
})

test('buildGalleryDlArgs appends --cookies-from-browser when configured', async () => {
  const {buildGalleryDlArgs} = await import('./gallery-dl.js')

  const argsWithBrowser = buildGalleryDlArgs({
    destDir: 'X:/target',
    subDir: 'Photos',
    platform: 'instagram',
    cleanUrl: 'https://www.instagram.com/creator',
    username: 'creator',
    cookiesFromBrowser: 'chrome',
  })
  assert.ok(argsWithBrowser.includes('--cookies-from-browser'))
  assert.equal(argsWithBrowser[argsWithBrowser.indexOf('--cookies-from-browser') + 1], 'chrome')

  const argsWithNone = buildGalleryDlArgs({
    destDir: 'X:/target',
    subDir: 'Photos',
    platform: 'instagram',
    cleanUrl: 'https://www.instagram.com/creator',
    username: 'creator',
    cookiesFromBrowser: 'none',
  })
  assert.equal(argsWithNone.includes('--cookies-from-browser'), false)
})

test('buildYtDlpArgs appends --cookies-from-browser when configured', async () => {
  const {buildYtDlpArgs} = await import('./yt-dlp.js')

  const argsWithBrowser = buildYtDlpArgs({
    destDir: 'X:/target',
    platform: 'tiktok',
    cleanUrl: 'https://www.tiktok.com/@creator',
    cookiesFromBrowser: 'edge',
  })
  assert.ok(argsWithBrowser.includes('--cookies-from-browser'))
  assert.equal(argsWithBrowser[argsWithBrowser.indexOf('--cookies-from-browser') + 1], 'edge')

  const argsWithNone = buildYtDlpArgs({
    destDir: 'X:/target',
    platform: 'tiktok',
    cleanUrl: 'https://www.tiktok.com/@creator',
    cookiesFromBrowser: 'none',
  })
  assert.equal(argsWithNone.includes('--cookies-from-browser'), false)
})

test('dispatchDownload fails over to gallery-dl when native extractor throws or returns 0 items', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-failover-photos-'))

  try {
    let nativeCalled = false
    let gdlCalled = false
    const progressMessages: string[] = []

    const result = await dispatchDownload({
      profile: {
        platform: 'instagram',
        username: 'failover_user',
        cleanUrl: 'https://www.instagram.com/failover_user/',
        rawInput: 'failover_user',
      },
      choice: 'photos',
      outputDir: tmpDir,
      onProgress: p => {
        progressMessages.push(p.statusText)
      },
      runnerOverrides: {
        nativeRunner: async () => {
          nativeCalled = true
          // Native extractor fails (e.g. anti-bot challenge)
          return {success: false, downloaded: 0, skipped: 0, error: 'Anti-bot challenge HTTP 429'}
        },
        gdlRunner: async () => {
          gdlCalled = true
          // gallery-dl fallback succeeds
          return {success: true, downloaded: 5, skipped: 0}
        },
      },
    })

    assert.ok(nativeCalled, 'Native runner should be attempted first')
    assert.ok(gdlCalled, 'gallery-dl fallback should be invoked when native runner fails')
    assert.equal(result.downloadedCount, 5)
    assert.ok(progressMessages.some(m => m.includes('switching to gallery-dl engine')))
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload fails over to yt-dlp first and then gallery-dl for videos', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-failover-videos-'))

  try {
    let nativeCalled = false
    let ytdlpCalled = false
    let gdlCalled = false
    const progressMessages: string[] = []

    const result = await dispatchDownload({
      profile: {
        platform: 'tiktok',
        username: 'video_creator',
        cleanUrl: 'https://www.tiktok.com/@video_creator',
        rawInput: 'video_creator',
      },
      choice: 'videos',
      outputDir: tmpDir,
      onProgress: p => {
        progressMessages.push(p.statusText)
      },
      runnerOverrides: {
        nativeRunner: async () => {
          nativeCalled = true
          // Native returns 0 items
          return {success: true, downloaded: 0, skipped: 0}
        },
        ytRunner: async () => {
          ytdlpCalled = true
          // yt-dlp fails / yields 0
          return {success: false, downloaded: 0, skipped: 0, error: 'Sign in to confirm you’re not a bot'}
        },
        gdlRunner: async () => {
          gdlCalled = true
          // gallery-dl succeeds
          return {success: true, downloaded: 3, skipped: 1}
        },
      },
    })

    assert.ok(nativeCalled, 'Native runner should run first')
    assert.ok(ytdlpCalled, 'yt-dlp should be attempted as first video fallback')
    assert.ok(gdlCalled, 'gallery-dl should be attempted as secondary fallback')
    assert.equal(result.downloadedCount, 3)
    assert.equal(result.skippedCount, 1)
    assert.ok(progressMessages.some(m => m.includes('switching to yt-dlp engine')))
    assert.ok(progressMessages.some(m => m.includes('switching to gallery-dl engine')))
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload preserves native results and skips fallbacks when native succeeds', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-native-success-'))

  try {
    let nativeCalled = false
    let gdlCalled = false
    let ytCalled = false

    const result = await dispatchDownload({
      profile: {
        platform: 'x',
        username: 'pure_native',
        cleanUrl: 'https://x.com/pure_native',
        rawInput: 'pure_native',
      },
      choice: 'photos',
      outputDir: tmpDir,
      runnerOverrides: {
        nativeRunner: async () => {
          nativeCalled = true
          return {success: true, downloaded: 12, skipped: 2}
        },
        gdlRunner: async () => {
          gdlCalled = true
          return {success: true, downloaded: 0, skipped: 0}
        },
        ytRunner: async () => {
          ytCalled = true
          return {success: true, downloaded: 0, skipped: 0}
        },
      },
    })

    assert.ok(nativeCalled, 'Native runner should run')
    assert.equal(gdlCalled, false, 'gallery-dl fallback should not be called when native succeeds')
    assert.equal(ytCalled, false, 'yt-dlp fallback should not be called')
    assert.equal(result.downloadedCount, 12)
    assert.equal(result.skippedCount, 2)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload dispatches unified All runner for choice=all and routes properly', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-dispatch-all-'))

  try {
    const executedSubDirs: string[] = []

    const result = await dispatchDownload({
      profile: {
        platform: 'instagram',
        username: 'creator_all',
        cleanUrl: 'https://www.instagram.com/creator_all/',
        rawInput: 'creator_all',
      },
      choice: 'all',
      outputDir: tmpDir,
      runnerOverrides: {
        nativeRunner: async (subDir) => {
          executedSubDirs.push(subDir)
          return {success: true, downloaded: 4, skipped: 1}
        },
      },
    })

    // Instagram choice=all should execute All (unified timeline+reels), then Stories, then Highlights
    assert.deepEqual(executedSubDirs, ['All', 'Stories', 'Highlights'])
    assert.equal(result.downloadedCount, 12)
    assert.equal(result.skippedCount, 3)
    assert.equal(result.success, true)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload fails over to gallery-dl and yt-dlp when unified All native runner yields 0', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-all-failover-'))

  try {
    let nativeAllCalled = false
    const gdlJobs: string[] = []
    let ytCalled = false

    const result = await dispatchDownload({
      profile: {
        platform: 'tiktok',
        username: 'fail_tiktok',
        cleanUrl: 'https://www.tiktok.com/@fail_tiktok',
        rawInput: 'fail_tiktok',
      },
      choice: 'all',
      outputDir: tmpDir,
      runnerOverrides: {
        nativeRunner: async (subDir) => {
          if (subDir === 'All') nativeAllCalled = true
          return {success: false, downloaded: 0, skipped: 0, error: 'WAF Block'}
        },
        gdlRunner: async (subDir) => {
          gdlJobs.push(subDir)
          return {success: true, downloaded: 2, skipped: 0}
        },
        ytRunner: async () => {
          ytCalled = true
          return {success: true, downloaded: 3, skipped: 0}
        },
      },
    })

    assert.ok(nativeAllCalled, 'Native All runner should have been tried first')
    assert.ok(gdlJobs.includes('Photos'), 'gallery-dl should run for photos on failover')
    assert.ok(ytCalled, 'yt-dlp should run for videos on failover')
    assert.equal(result.downloadedCount, 5) // 2 from gdl photos + 3 from yt videos
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload enforces limit across jobs', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-limit-test-'))

  try {
    const executedSubDirs: string[] = []
    const result = await dispatchDownload({
      profile: {
        platform: 'instagram',
        username: 'test_limit',
        cleanUrl: 'https://www.instagram.com/test_limit/',
        rawInput: 'test_limit',
      },
      choice: 'all',
      outputDir: tmpDir,
      limit: 10,
      runnerOverrides: {
        nativeRunner: async (subDir) => {
          executedSubDirs.push(subDir)
          return {success: true, downloaded: 10, skipped: 0}
        },
      },
    })

    assert.deepEqual(executedSubDirs, ['All'])
    assert.equal(result.downloadedCount, 10)
    assert.equal(result.success, true)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload honors saved checkpoint when resume=true and clears on completion', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const {saveCheckpoint, loadCheckpoint} = await import('./checkpoint.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-resume-test-'))

  try {
    // 1. Seed an active checkpoint
    await saveCheckpoint(tmpDir, {
      version: 1,
      platform: 'instagram',
      username: 'resume_user',
      updatedAt: new Date().toISOString(),
      cursors: { timeline: 'CURSOR_ABC_123' },
      completed: false,
    })

    let passedInitialCursor: string | undefined
    let checkpointCallbackTriggered = false

    const result = await dispatchDownload({
      profile: {
        platform: 'instagram',
        username: 'resume_user',
        cleanUrl: 'https://www.instagram.com/resume_user/',
        rawInput: 'resume_user',
      },
      choice: 'photos',
      outputDir: tmpDir,
      resume: true,
      runnerOverrides: {
        nativeRunner: async () => {
          // Check that checkpoint was loaded
          const cp = await loadCheckpoint(tmpDir)
          passedInitialCursor = cp?.cursors.timeline
          return {success: true, downloaded: 5, skipped: 0}
        },
      },
    })

    assert.equal(passedInitialCursor, 'CURSOR_ABC_123')
    assert.equal(result.success, true)
    // On successful run with no errors, checkpoint should be cleaned up
    const afterDone = await loadCheckpoint(tmpDir)
    assert.equal(afterDone, null)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('cleanupEmptyCategoryDirs removes empty categories with only archive files but preserves folders with media', async () => {
  const {cleanupEmptyCategoryDirs} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cleanup-test-'))

  try {
    const emptyAll = path.join(tmpDir, 'All')
    const emptyStories = path.join(tmpDir, 'Stories')
    const populatedPhotos = path.join(tmpDir, 'Photos')

    await fsPromises.mkdir(emptyAll, {recursive: true})
    await fsPromises.writeFile(path.join(emptyAll, '.open-nami-archive.json'), '[]')
    await fsPromises.writeFile(path.join(emptyAll, 'archive.txt'), '')

    await fsPromises.mkdir(emptyStories, {recursive: true})
    await fsPromises.writeFile(path.join(emptyStories, '.open-nami-archive.json'), '[]')

    await fsPromises.mkdir(populatedPhotos, {recursive: true})
    await fsPromises.writeFile(path.join(populatedPhotos, '.open-nami-archive.json'), '["123"]')
    await fsPromises.writeFile(path.join(populatedPhotos, 'photo1.jpg'), 'fake-image-bytes')

    await cleanupEmptyCategoryDirs(tmpDir)

    const fsSync = await import('node:fs')
    assert.equal(fsSync.existsSync(emptyAll), false, 'Empty All folder should be pruned')
    assert.equal(fsSync.existsSync(emptyStories), false, 'Empty Stories folder should be pruned')
    assert.equal(fsSync.existsSync(populatedPhotos), true, 'Populated Photos folder should be kept')
    assert.equal(fsSync.existsSync(path.join(populatedPhotos, 'photo1.jpg')), true)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload resolves cookiesFromBrowser "auto" via resolveBrowserCookieArg and forwards to runners', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const {resolveBrowserCookieArg} = await import('../cookies/browser-bridge.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-dispatch-auto-'))

  try {
    let capturedGdlOpts: any = null
    let capturedYtOpts: any = null
    const expectedArg = resolveBrowserCookieArg('auto') ?? undefined

    await dispatchDownload({
      profile: {
        platform: 'instagram',
        username: 'autocookies_user',
        cleanUrl: 'https://www.instagram.com/autocookies_user/',
        rawInput: 'autocookies_user',
      },
      choice: 'photos',
      outputDir: tmpDir,
      cookiesFromBrowser: 'auto',
      runnerOverrides: {
        nativeRunner: async () => {
          return {success: false, downloaded: 0, skipped: 0, error: 'Fallback needed'}
        },
        gdlRunner: async (subDir, runnerOpts) => {
          capturedGdlOpts = runnerOpts
          return {success: true, downloaded: 1, skipped: 0}
        },
      },
    })

    assert.ok(capturedGdlOpts, 'gdlRunner should have been called')
    assert.equal(capturedGdlOpts.cookiesFromBrowser, expectedArg)

    await dispatchDownload({
      profile: {
        platform: 'tiktok',
        username: 'autocookies_yt_user',
        cleanUrl: 'https://www.tiktok.com/@autocookies_yt_user',
        rawInput: 'autocookies_yt_user',
      },
      choice: 'videos',
      outputDir: tmpDir,
      cookiesFromBrowser: 'auto',
      runnerOverrides: {
        nativeRunner: async () => {
          return {success: false, downloaded: 0, skipped: 0, error: 'Fallback needed'}
        },
        ytRunner: async (runnerOpts) => {
          capturedYtOpts = runnerOpts
          return {success: true, downloaded: 1, skipped: 0}
        },
      },
    })

    assert.ok(capturedYtOpts, 'ytRunner should have been called')
    assert.equal(capturedYtOpts.cookiesFromBrowser, expectedArg)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload defaults to "auto" resolution when cookiesFromBrowser is omitted', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const {resolveBrowserCookieArg} = await import('../cookies/browser-bridge.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-dispatch-default-auto-'))

  try {
    let capturedGdlOpts: any = null
    const expectedArg = resolveBrowserCookieArg('auto') ?? undefined

    await dispatchDownload({
      profile: {
        platform: 'instagram',
        username: 'default_auto_user',
        cleanUrl: 'https://www.instagram.com/default_auto_user/',
        rawInput: 'default_auto_user',
      },
      choice: 'photos',
      outputDir: tmpDir,
      runnerOverrides: {
        nativeRunner: async () => {
          return {success: false, downloaded: 0, skipped: 0, error: 'Fallback needed'}
        },
        gdlRunner: async (subDir, runnerOpts) => {
          capturedGdlOpts = runnerOpts
          return {success: true, downloaded: 1, skipped: 0}
        },
      },
    })

    assert.ok(capturedGdlOpts, 'gdlRunner should have been called')
    assert.equal(capturedGdlOpts.cookiesFromBrowser, expectedArg)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('dispatchDownload passes undefined to runners when cookiesFromBrowser is "none"', async () => {
  const {dispatchDownload} = await import('./dispatcher.js')
  const fsPromises = await import('node:fs/promises')
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-dispatch-none-'))

  try {
    let capturedGdlOpts: any = null

    await dispatchDownload({
      profile: {
        platform: 'instagram',
        username: 'none_cookies_user',
        cleanUrl: 'https://www.instagram.com/none_cookies_user/',
        rawInput: 'none_cookies_user',
      },
      choice: 'photos',
      outputDir: tmpDir,
      cookiesFromBrowser: 'none',
      runnerOverrides: {
        nativeRunner: async () => {
          return {success: false, downloaded: 0, skipped: 0, error: 'Fallback needed'}
        },
        gdlRunner: async (subDir, runnerOpts) => {
          capturedGdlOpts = runnerOpts
          return {success: true, downloaded: 1, skipped: 0}
        },
      },
    })

    assert.ok(capturedGdlOpts, 'gdlRunner should have been called')
    assert.equal(capturedGdlOpts.cookiesFromBrowser, undefined)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})


