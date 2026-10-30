import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  compareSemVer,
  getCachedUpdateInfo,
  checkForUpdate,
} from './update-check.js'

test('compareSemVer compares versions correctly', () => {
  assert.equal(compareSemVer('1.7.0', '1.7.1'), -1)
  assert.equal(compareSemVer('1.7.1', '1.7.0'), 1)
  assert.equal(compareSemVer('1.7.0', '1.7.0'), 0)
  assert.equal(compareSemVer('v1.7.0', '1.7.1'), -1)
  assert.equal(compareSemVer('1.10.0', '1.9.0'), 1)
  assert.equal(compareSemVer('2.0.0', '1.99.99'), 1)
  assert.equal(compareSemVer('1.0.0', '2.0.0'), -1)
})

test('getCachedUpdateInfo returns null on missing file and parses valid cache', () => {
  const tmpDir = path.join(os.tmpdir(), `update-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  const cacheFile = path.join(tmpDir, 'cache.json')

  try {
    assert.equal(getCachedUpdateInfo('1.7.0', cacheFile), null)

    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ lastChecked: Date.now(), latestVersion: '1.8.0' }),
      'utf8',
    )

    const res = getCachedUpdateInfo('1.7.0', cacheFile)
    assert.ok(res)
    assert.equal(res.currentVersion, '1.7.0')
    assert.equal(res.latestVersion, '1.8.0')
    assert.equal(res.updateAvailable, true)

    // Current matches latest
    const resSame = getCachedUpdateInfo('1.8.0', cacheFile)
    assert.ok(resSame)
    assert.equal(resSame.updateAvailable, false)
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  }
})

test('checkForUpdate respects NO_UPDATE_NOTIFIER opt-out', async () => {
  const orig = process.env.NO_UPDATE_NOTIFIER
  try {
    process.env.NO_UPDATE_NOTIFIER = '1'
    const res = await checkForUpdate({ currentVersion: '1.7.0' })
    assert.equal(res.updateAvailable, false)
  } finally {
    if (orig !== undefined) {
      process.env.NO_UPDATE_NOTIFIER = orig
    } else {
      delete process.env.NO_UPDATE_NOTIFIER
    }
  }
})

test('checkForUpdate uses cache when fresh and fetches when stale or forced', async () => {
  const tmpDir = path.join(os.tmpdir(), `update-fetch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  const cacheFile = path.join(tmpDir, 'cache.json')

  let fetchCalls = 0
  const mockFetch = async () => {
    fetchCalls++
    return {
      ok: true,
      json: async () => ({ version: '1.9.0' }),
    } as unknown as Response
  }

  try {
    // 1. Fresh cache -> No fetch
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({ lastChecked: Date.now(), latestVersion: '1.8.0' }),
      'utf8',
    )

    const cachedRes = await checkForUpdate({
      currentVersion: '1.7.0',
      cachePath: cacheFile,
      fetchFn: mockFetch as any,
    })
    assert.equal(fetchCalls, 0)
    assert.equal(cachedRes.latestVersion, '1.8.0')
    assert.equal(cachedRes.updateAvailable, true)

    // 2. Force check -> triggers fetch and updates cache
    const forcedRes = await checkForUpdate({
      currentVersion: '1.7.0',
      cachePath: cacheFile,
      force: true,
      fetchFn: mockFetch as any,
    })
    assert.equal(fetchCalls, 1)
    assert.equal(forcedRes.latestVersion, '1.9.0')
    assert.equal(forcedRes.updateAvailable, true)

    // Verify cache file was updated
    const saved = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    assert.equal(saved.latestVersion, '1.9.0')
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  }
})

test('checkForUpdate handles network errors gracefully without throwing', async () => {
  const mockFailingFetch = async () => {
    throw new Error('Network offline or DNS failed')
  }

  const res = await checkForUpdate({
    currentVersion: '1.7.0',
    cachePath: '/tmp/nonexistent-cache-file-open-nami.json',
    force: true,
    fetchFn: mockFailingFetch as any,
  })

  assert.ok(res)
  assert.equal(res.currentVersion, '1.7.0')
  assert.equal(res.updateAvailable, false)
})
