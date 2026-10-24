import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { MediaLedger } from './ledger.js'

test('MediaLedger stores and retrieves media records and checkpoints', () => {
  const ledger = new MediaLedger(':memory:')
  assert.equal(ledger.hasMedia('12345'), false)

  ledger.recordMedia({
    id: '12345',
    platform: 'instagram',
    author: 'selenagomez',
    url: 'https://cdn.example.com/photo.jpg',
    filename: 'photo.jpg',
    filePath: '/tmp/photo.jpg',
    downloadedAt: new Date().toISOString(),
  })

  assert.equal(ledger.hasMedia('12345'), true)

  ledger.saveCheckpoint({
    platform: 'instagram',
    username: 'selenagomez',
    targetDir: '/tmp',
    cursors: { timeline: 'cursor_abc' },
    updatedAt: new Date().toISOString(),
  })

  const cp = ledger.getCheckpoint('instagram', 'selenagomez')
  assert.equal(cp?.cursors.timeline, 'cursor_abc')

  ledger.clearCheckpoint('instagram', 'selenagomez')
  assert.equal(ledger.getCheckpoint('instagram', 'selenagomez'), null)
  ledger.close()
})

test('MediaLedger persists across database re-opens with file path', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-ledger-test-'))
  const dbFile = path.join(tmpDir, 'test-ledger.db')

  try {
    const ledger1 = new MediaLedger(dbFile)
    ledger1.recordMedia({
      id: 'persisted_1',
      platform: 'tiktok',
      author: 'creator1',
      url: 'https://example.com/video.mp4',
      filename: 'video.mp4',
      filePath: path.join(tmpDir, 'video.mp4'),
      downloadedAt: '2026-10-24T00:00:00Z',
    })
    ledger1.saveCheckpoint({
      platform: 'tiktok',
      username: 'Creator1',
      targetDir: tmpDir,
      cursors: { max_cursor: '998877' },
      updatedAt: '2026-10-24T00:00:00Z',
    })
    ledger1.close()

    const ledger2 = new MediaLedger(dbFile)
    assert.equal(ledger2.hasMedia('persisted_1'), true)
    assert.equal(ledger2.hasMedia('non_existent'), false)

    // Check case-insensitive username lookup
    const cp = ledger2.getCheckpoint('tiktok', 'creator1')
    assert.ok(cp)
    assert.equal(cp.username, 'Creator1')
    assert.equal(cp.cursors.max_cursor, '998877')

    ledger2.close()
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

test('MediaLedger in-memory fallback handles records and checkpoints', () => {
  const fallbackLedger = new MediaLedger(undefined, true)
  assert.equal(fallbackLedger.hasMedia('fallback_1'), false)

  fallbackLedger.recordMedia({
    id: 'fallback_1',
    platform: 'facebook',
    author: 'user1',
    url: 'https://facebook.com/photo.jpg',
    filename: 'photo.jpg',
    filePath: '/tmp/fb.jpg',
    downloadedAt: '2026-10-24T00:00:00Z',
  })
  assert.equal(fallbackLedger.hasMedia('fallback_1'), true)

  fallbackLedger.saveCheckpoint({
    platform: 'facebook',
    username: 'UserOne',
    targetDir: '/tmp',
    cursors: { page: 'page_2' },
    updatedAt: '2026-10-24T00:00:00Z',
  })

  const cp = fallbackLedger.getCheckpoint('facebook', 'userone')
  assert.ok(cp)
  assert.equal(cp.cursors.page, 'page_2')

  fallbackLedger.clearCheckpoint('facebook', 'userone')
  assert.equal(fallbackLedger.getCheckpoint('facebook', 'userone'), null)
  fallbackLedger.close()
})

test('MediaLedger fallback persists across re-opens with file path', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-ledger-fallback-test-'))
  const dbFile = path.join(tmpDir, 'fallback-ledger.json')

  try {
    const l1 = new MediaLedger(dbFile, true)
    l1.recordMedia({
      id: 'fallback_persist_1',
      platform: 'x',
      author: 'elonmusk',
      url: 'https://x.com/post/1',
      filename: 'post1.jpg',
      filePath: path.join(tmpDir, 'post1.jpg'),
      downloadedAt: '2026-10-24T00:00:00Z',
    })
    l1.saveCheckpoint({
      platform: 'x',
      username: 'ElonMusk',
      targetDir: tmpDir,
      cursors: { since_id: '12345' },
      updatedAt: '2026-10-24T00:00:00Z',
    })
    l1.close()

    const l2 = new MediaLedger(dbFile, true)
    assert.equal(l2.hasMedia('fallback_persist_1'), true)
    assert.equal(l2.hasMedia('non_existent'), false)

    const cp = l2.getCheckpoint('x', 'elonmusk')
    assert.ok(cp)
    assert.equal(cp.username, 'ElonMusk')
    assert.equal(cp.cursors.since_id, '12345')

    l2.clearCheckpoint('x', 'elonmusk')
    assert.equal(l2.getCheckpoint('x', 'elonmusk'), null)
    l2.close()

    const l3 = new MediaLedger(dbFile, true)
    assert.equal(l3.getCheckpoint('x', 'elonmusk'), null)
    l3.close()
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

