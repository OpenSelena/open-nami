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
  delete process.env.OPEN_NAMI_DIR
  delete process.env.NAMI_BASE_DIR
  try {
    const baseDir = resolveDownloadBaseDir()
    assert.ok(baseDir.endsWith('Open Nami'), `Expected path ending in "Open Nami", got ${baseDir}`)
  } finally {
    if (prevNamiDir !== undefined) process.env.OPEN_NAMI_DIR = prevNamiDir
    if (prevBase !== undefined) process.env.NAMI_BASE_DIR = prevBase
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


