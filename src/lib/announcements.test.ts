import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  isAnnouncementEligible,
  parseAnnouncementsPayload,
  getCachedAnnouncement,
  dismissAnnouncement,
  fetchAnnouncement,
  type Announcement,
} from './announcements.js'

test('isAnnouncementEligible validates required fields', () => {
  assert.equal(isAnnouncementEligible(null, '1.7.0'), false)
  assert.equal(isAnnouncementEligible({}, '1.7.0'), false)
  assert.equal(isAnnouncementEligible({id: '1', title: 'test'}, '1.7.0'), false)
  assert.equal(
    isAnnouncementEligible({id: '1', title: 'test', message: 'hello'}, '1.7.0'),
    true,
  )
})

test('isAnnouncementEligible respects dismissed IDs', () => {
  const item: Announcement = {
    id: 'test-1',
    title: 'Update',
    message: 'Important notice',
  }
  assert.equal(isAnnouncementEligible(item, '1.7.0', []), true)
  assert.equal(isAnnouncementEligible(item, '1.7.0', ['other-id']), true)
  assert.equal(isAnnouncementEligible(item, '1.7.0', ['test-1']), false)
})

test('isAnnouncementEligible checks expiration date', () => {
  const futureItem: Announcement = {
    id: 'future',
    title: 'Future',
    message: 'Live announcement',
    expiresAt: new Date(Date.now() + 100000).toISOString(),
  }
  assert.equal(isAnnouncementEligible(futureItem, '1.7.0'), true)

  const expiredItem: Announcement = {
    id: 'expired',
    title: 'Past',
    message: 'Old announcement',
    expiresAt: '2020-01-01T00:00:00Z',
  }
  assert.equal(isAnnouncementEligible(expiredItem, '1.7.0'), false)
})

test('isAnnouncementEligible checks version bounds', () => {
  const bounded: Announcement = {
    id: 'bounded',
    title: 'Upgrade warning',
    message: 'For old versions only',
    minVersion: '1.2.0',
    maxVersion: '1.6.1',
  }

  assert.equal(isAnnouncementEligible(bounded, '1.1.0'), false)
  assert.equal(isAnnouncementEligible(bounded, '1.2.0'), true)
  assert.equal(isAnnouncementEligible(bounded, '1.5.0'), true)
  assert.equal(isAnnouncementEligible(bounded, '1.6.1'), true)
  assert.equal(isAnnouncementEligible(bounded, '1.7.0'), false)
})

test('parseAnnouncementsPayload handles single item and array', () => {
  const single: Announcement = {id: 'single', title: 'S', message: 'Msg'}
  assert.deepEqual(parseAnnouncementsPayload(single, '1.0.0'), single)

  const list: Announcement[] = [
    {id: 'first', title: 'First', message: 'M1', expiresAt: '2020-01-01T00:00:00Z'},
    {id: 'second', title: 'Second', message: 'M2'},
  ]
  assert.deepEqual(parseAnnouncementsPayload(list, '1.0.0'), list[1])
})

test('getCachedAnnouncement returns null on missing file or valid cached entry', () => {
  const tmpDir = path.join(os.tmpdir(), `nami-ann-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  const cacheFile = path.join(tmpDir, 'announcements.json')

  try {
    assert.equal(getCachedAnnouncement('1.7.0', cacheFile), null)

    fs.mkdirSync(tmpDir, {recursive: true})
    const cacheData = {
      lastChecked: Date.now(),
      activeAnnouncement: {
        id: 'notice-1',
        title: 'Cached Title',
        message: 'Cached message',
      },
      dismissedIds: [],
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cacheData))

    const cached = getCachedAnnouncement('1.7.0', cacheFile)
    assert.ok(cached)
    assert.equal(cached.id, 'notice-1')
    assert.equal(cached.title, 'Cached Title')

    // If dismissed, returns null
    dismissAnnouncement('notice-1', cacheFile)
    assert.equal(getCachedAnnouncement('1.7.0', cacheFile), null)
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true})
  }
})

test('fetchAnnouncement respects NO_ANNOUNCEMENTS opt-out', async () => {
  const prev = process.env.NO_ANNOUNCEMENTS
  try {
    process.env.NO_ANNOUNCEMENTS = '1'
    let fetchCalled = false
    const mockFetch = async () => {
      fetchCalled = true
      return new Response('{}')
    }

    const res = await fetchAnnouncement({fetchFn: mockFetch as any})
    assert.equal(res, null)
    assert.equal(fetchCalled, false)
  } finally {
    if (prev === undefined) delete process.env.NO_ANNOUNCEMENTS
    else process.env.NO_ANNOUNCEMENTS = prev
  }
})

test('fetchAnnouncement fetches, caches, and handles network failures gracefully', async () => {
  const tmpDir = path.join(os.tmpdir(), `nami-ann-fetch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  const cacheFile = path.join(tmpDir, 'announcements.json')

  try {
    const mockPayload: Announcement = {
      id: 'live-1',
      title: 'Live Title',
      message: 'Live Message',
      level: 'warning',
    }

    let fetchCount = 0
    const mockFetch = async () => {
      fetchCount++
      return new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      })
    }

    const res = await fetchAnnouncement({
      cachePath: cacheFile,
      fetchFn: mockFetch as any,
    })

    assert.ok(res)
    assert.equal(res.id, 'live-1')
    assert.equal(res.level, 'warning')
    assert.equal(fetchCount, 1)

    // Second call uses fresh cache
    const cachedRes = await fetchAnnouncement({
      cachePath: cacheFile,
      fetchFn: mockFetch as any,
    })
    assert.equal(fetchCount, 1) // not called again
    assert.equal(cachedRes?.id, 'live-1')

    // Error test: network error does not throw
    const errorFetch = async () => {
      throw new Error('Connection refused')
    }
    const safeRes = await fetchAnnouncement({
      cachePath: path.join(tmpDir, 'non-existent.json'),
      fetchFn: errorFetch as any,
      force: true,
    })
    assert.equal(safeRes, null)
  } finally {
    fs.rmSync(tmpDir, {recursive: true, force: true})
  }
})
