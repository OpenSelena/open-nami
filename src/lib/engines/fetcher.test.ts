import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import {
  getOpenNamiBinDir,
  ytDlpAssetName,
  galleryDlAssetName,
  getGalleryDlDownloadUrls,
} from './fetcher.js'
import {resolveVersion} from '../../cli.js'

test('getOpenNamiBinDir prioritizes OPEN_NAMI_BIN_DIR env var', () => {
  const custom = path.resolve('temp/custom-bin')
  const dir = getOpenNamiBinDir({OPEN_NAMI_BIN_DIR: custom})
  assert.equal(dir, custom)
})

test('getOpenNamiBinDir honors OPEN_NAMI_DIR env var', () => {
  const customRoot = path.resolve('temp/custom-root')
  const dir = getOpenNamiBinDir({OPEN_NAMI_DIR: customRoot})
  assert.equal(dir, path.join(customRoot, '.open-nami', 'bin'))
})

test('getOpenNamiBinDir defaults to ~/.open-nami/bin', () => {
  const dir = getOpenNamiBinDir({})
  assert.equal(dir, path.join(os.homedir(), '.open-nami', 'bin'))
})

test('ytDlpAssetName returns correct binary name for platforms', () => {
  assert.equal(ytDlpAssetName('win32', 'x64'), 'yt-dlp.exe')
  assert.equal(ytDlpAssetName('darwin', 'arm64'), 'yt-dlp_macos')
  assert.equal(ytDlpAssetName('linux', 'arm64'), 'yt-dlp_linux_aarch64')
  assert.equal(ytDlpAssetName('linux', 'x64'), 'yt-dlp_linux')
})

test('galleryDlAssetName returns correct binary name for platforms', () => {
  assert.equal(galleryDlAssetName('win32'), 'gallery-dl.exe')
  assert.equal(galleryDlAssetName('linux'), 'gallery-dl.bin')
})

test('getGalleryDlDownloadUrls provides fallback url when API fails', async () => {
  const mockFetch = async () => {
    throw new Error('Network error')
  }
  const urls = await getGalleryDlDownloadUrls('gallery-dl.exe', mockFetch as any)
  assert.ok(urls.length > 0)
  assert.ok(urls[0].includes('gallery-dl.exe'))
  assert.ok(urls[0].includes('github.com/mikf/gallery-dl/releases/latest/download'))
})

test('getGalleryDlDownloadUrls parses Codeberg API response when available', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      tag_name: 'v1.28.5',
      assets: [
        {name: 'gallery-dl.exe', browser_download_url: 'https://codeberg.org/download/gallery-dl.exe'},
      ],
    }),
  })
  const urls = await getGalleryDlDownloadUrls('gallery-dl.exe', mockFetch as any)
  assert.ok(urls.length >= 2)
  assert.equal(urls[0], 'https://codeberg.org/download/gallery-dl.exe')
})

test('resolveVersion dynamically returns version from package.json', () => {
  const ver = resolveVersion()
  assert.match(ver, /^\d+\.\d+\.\d+/)
})

test('downloadBinary rejects truncated downloads and cleans up tmp file', async () => {
  const {downloadBinary} = await import('./fetcher.js')
  const fs = await import('node:fs/promises')
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-fetch-test-'))
  const target = path.join(tmpDir, 'test-bin.exe')
  const tmp = `${target}.download`

  const prevFetch = globalThis.fetch
  try {
    globalThis.fetch = (async () => ({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from('too small content'))
          controller.close()
        },
      }),
    })) as any

    await assert.rejects(
      downloadBinary('https://example.com/fake-bin.exe', target),
      /unexpectedly small/,
    )

    const tmpExists = await fs.stat(tmp).then(() => true).catch(() => false)
    assert.equal(tmpExists, false, 'Incomplete tmp file must be cleaned up on failure')
  } finally {
    globalThis.fetch = prevFetch
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})
