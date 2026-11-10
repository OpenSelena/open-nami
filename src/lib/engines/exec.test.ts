import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import {resolveEngineCommand} from './exec.js'

test('resolveEngineCommand prioritizes custom environment variable overrides', () => {
  const customGdl = resolveEngineCommand('gallery-dl', {
    env: {GALLERY_DL_PATH: 'C:/tools/gallery-dl.exe'},
    findExe: () => null,
  })
  assert.equal(customGdl.command, 'C:/tools/gallery-dl.exe')
  assert.deepEqual(customGdl.baseArgs, [])

  const customYt = resolveEngineCommand('yt-dlp', {
    env: {YT_DLP_PATH: '/usr/local/bin/yt-dlp'},
    findExe: () => null,
  })
  assert.equal(customYt.command, '/usr/local/bin/yt-dlp')
  assert.deepEqual(customYt.baseArgs, [])
})

test('resolveEngineCommand prioritizes managed local bin over generic PATH', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'exec-test-'))
  const isWin = process.platform === 'win32'
  const localFile = path.join(tmpDir, `gallery-dl${isWin ? '.exe' : ''}`)
  await fs.writeFile(localFile, 'fake binary')
  try {
    const res = resolveEngineCommand('gallery-dl', {
      env: {OPEN_NAMI_BIN_DIR: tmpDir},
      findExe: (name) => (name === 'gallery-dl' ? '/usr/bin/gallery-dl' : null),
    })
    assert.equal(res.command, localFile)
    assert.deepEqual(res.baseArgs, [])
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})

test('resolveEngineCommand detects standalone binary in PATH before python', () => {
  const gdlCmd = resolveEngineCommand('gallery-dl', {
    env: {OPEN_NAMI_BIN_DIR: 'C:/non-existent-open-nami-dir'},
    findExe: (name) => {
      if (name === 'gallery-dl') return 'C:/Users/mint/scoop/shims/gallery-dl.exe'
      if (name === 'python') return 'C:/Python/python.exe'
      return null
    },
  })
  assert.equal(gdlCmd.command, 'C:/Users/mint/scoop/shims/gallery-dl.exe')
  assert.deepEqual(gdlCmd.baseArgs, [])
})

test('resolveEngineCommand falls back to python -m when standalone binary is missing', () => {
  const ytCmd = resolveEngineCommand('yt-dlp', {
    env: {OPEN_NAMI_BIN_DIR: 'C:/non-existent-open-nami-dir'},
    findExe: (name) => {
      if (name === 'python') return 'C:/Python/python.exe'
      return null
    },
  })
  assert.equal(ytCmd.command, 'C:/Python/python.exe')
  assert.deepEqual(ytCmd.baseArgs, ['-m', 'yt_dlp'])
})

test('resolveEngineCommand falls back to python3 -m on unix systems without python', () => {
  const ytCmd = resolveEngineCommand('yt-dlp', {
    env: {OPEN_NAMI_BIN_DIR: '/non-existent-open-nami-dir'},
    findExe: (name) => {
      if (name === 'python3') return '/usr/bin/python3'
      return null
    },
  })
  assert.equal(ytCmd.command, '/usr/bin/python3')
  assert.deepEqual(ytCmd.baseArgs, ['-m', 'yt_dlp'])
})
