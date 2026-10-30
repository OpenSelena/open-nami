import test from 'node:test'
import assert from 'node:assert/strict'
import {startClipboardWatcher} from './watcher.js'
import type {ParsedProfile} from './parser.js'
import type {EngineResult} from './engines/types.js'

test('startClipboardWatcher detects profile URLs from clipboard and triggers download', async () => {
  const clipboardQueue = [
    'random non-profile text',
    'https://www.instagram.com/nature_photos/',
    'https://www.instagram.com/nature_photos/', // duplicate copy
  ]

  let currentIndex = 0
  const mockReadClipboard = () => {
    if (currentIndex < clipboardQueue.length) {
      return clipboardQueue[currentIndex++]
    }
    return ''
  }

  const detectedProfiles: ParsedProfile[] = []
  const completedProfiles: Array<{profile: ParsedProfile; result: EngineResult}> = []

  const mockDispatch = async (opts: any): Promise<EngineResult> => {
    return {
      success: true,
      downloadedCount: 15,
      skippedCount: 2,
      errors: [],
      outputDir: opts.outputDir || '/downloads/nature_photos',
    }
  }

  const watcher = startClipboardWatcher({
    intervalMs: 10,
    readClipboardFn: mockReadClipboard,
    dispatchFn: mockDispatch,
    onDetected: (p) => detectedProfiles.push(p),
    onComplete: (p, res) => completedProfiles.push({profile: p, result: res}),
  })

  // Allow loop to process clipboard iterations
  await new Promise((r) => setTimeout(r, 60))
  watcher.stop()
  await watcher.promise

  // Should have detected nature_photos exactly once (duplicate ignored)
  assert.equal(detectedProfiles.length, 1)
  assert.equal(detectedProfiles[0].username, 'nature_photos')
  assert.equal(detectedProfiles[0].platform, 'instagram')

  assert.equal(completedProfiles.length, 1)
  assert.equal(completedProfiles[0].result.downloadedCount, 15)
})

test('startClipboardWatcher respects abort signal and terminates cleanly', async () => {
  const controller = new AbortController()
  let pollCount = 0

  const mockReadClipboard = () => {
    pollCount++
    if (pollCount === 2) {
      controller.abort()
    }
    return ''
  }

  const watcher = startClipboardWatcher({
    intervalMs: 10,
    signal: controller.signal,
    readClipboardFn: mockReadClipboard,
  })

  await watcher.promise
  assert.ok(pollCount >= 2, 'Should have polled at least twice before abort')
})

test('startClipboardWatcher does not block polling loop during active downloads', async () => {
  const clipboardQueue = [
    'https://www.instagram.com/user_first/',
    'https://www.instagram.com/user_second/',
  ]

  let currentIndex = 0
  const mockReadClipboard = () => {
    if (currentIndex < clipboardQueue.length) {
      return clipboardQueue[currentIndex++]
    }
    return ''
  }

  const detected: string[] = []
  let firstResolve: (() => void) | null = null

  const mockDispatch = async (opts: any): Promise<EngineResult> => {
    if (opts.profile.username === 'user_first') {
      // Simulate long download that stays pending until released
      await new Promise<void>((resolve) => {
        firstResolve = resolve
      })
    }
    return {
      success: true,
      downloadedCount: 1,
      skippedCount: 0,
      errors: [],
      outputDir: opts.outputDir || '/downloads',
    }
  }

  const watcher = startClipboardWatcher({
    intervalMs: 10,
    readClipboardFn: mockReadClipboard,
    dispatchFn: mockDispatch,
    onDetected: (p) => detected.push(p.username),
  })

  // Wait 40ms: during this time, even though user_first is still downloading,
  // user_second should already be detected by the non-blocking polling loop!
  await new Promise((r) => setTimeout(r, 50))
  assert.deepEqual(detected, ['user_first', 'user_second'])

  // Release first download
  const resolveFirst = firstResolve as (() => void) | null
  resolveFirst?.()
  watcher.stop()
  await watcher.promise
})

