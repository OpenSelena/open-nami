import test from 'node:test'
import assert from 'node:assert/strict'
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

test('resolveEngineCommand detects standalone binary in PATH before python', () => {
  const gdlCmd = resolveEngineCommand('gallery-dl', {
    env: {},
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
    env: {},
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
    env: {},
    findExe: (name) => {
      if (name === 'python3') return '/usr/bin/python3'
      return null
    },
  })
  assert.equal(ytCmd.command, '/usr/bin/python3')
  assert.deepEqual(ytCmd.baseArgs, ['-m', 'yt_dlp'])
})
