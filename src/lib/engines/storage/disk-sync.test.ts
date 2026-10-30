import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  isMediaFile,
  countMediaFilesInDir,
  extractArchiveItemIds,
  syncDiskProfilesToLedger,
} from './disk-sync.js'
import { MediaLedger } from './ledger.js'

describe('disk-sync storage module', () => {
  it('isMediaFile correctly identifies media versus non-media and temp files', () => {
    assert.equal(isMediaFile('photo.jpg'), true)
    assert.equal(isMediaFile('image.PNG'), true)
    assert.equal(isMediaFile('clip.mp4'), true)
    assert.equal(isMediaFile('video.MOV'), true)
    assert.equal(isMediaFile('track.mp3'), true)

    assert.equal(isMediaFile('.open-nami-archive.json'), false)
    assert.equal(isMediaFile('archive.txt'), false)
    assert.equal(isMediaFile('metadata.json'), false)
    assert.equal(isMediaFile('video.mp4.download'), false)
    assert.equal(isMediaFile('photo.jpg.tmp'), false)
    assert.equal(isMediaFile('.hidden.jpg'), false)
  })

  it('countMediaFilesInDir accurately aggregates photos, videos, and derives choice', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-disk-test-'))
    try {
      const photosDir = path.join(tmp, 'Photos')
      const videosDir = path.join(tmp, 'Videos')
      fs.mkdirSync(photosDir, { recursive: true })
      fs.mkdirSync(videosDir, { recursive: true })

      fs.writeFileSync(path.join(photosDir, '1.jpg'), 'fake-jpg')
      fs.writeFileSync(path.join(photosDir, '2.png'), 'fake-png')
      fs.writeFileSync(path.join(photosDir, '1.json'), '{}')
      fs.writeFileSync(path.join(photosDir, 'archive.txt'), '123')

      fs.writeFileSync(path.join(videosDir, '1.mp4'), 'fake-mp4')
      fs.writeFileSync(path.join(videosDir, '1.mp4.download'), 'in-progress')

      const stats = countMediaFilesInDir(tmp)
      assert.equal(stats.count, 3)
      assert.equal(stats.photoCount, 2)
      assert.equal(stats.videoCount, 1)
      assert.equal(stats.choice, 'all')
      assert.ok(stats.lastMtimeMs > 0)

      const photoOnlyStats = countMediaFilesInDir(photosDir)
      assert.equal(photoOnlyStats.count, 2)
      assert.equal(photoOnlyStats.choice, 'photos')

      const videoOnlyStats = countMediaFilesInDir(videosDir)
      assert.equal(videoOnlyStats.count, 1)
      assert.equal(videoOnlyStats.choice, 'videos')
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('extractArchiveItemIds extracts IDs from json and txt archives', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-archive-test-'))
    try {
      const photosDir = path.join(tmp, 'Photos')
      fs.mkdirSync(photosDir, { recursive: true })

      fs.writeFileSync(
        path.join(photosDir, '.open-nami-archive.json'),
        JSON.stringify(['1001', '1002']),
      )
      fs.writeFileSync(
        path.join(photosDir, 'archive.txt'),
        'instagram 1003\ninstagram 1004\n',
      )
      fs.writeFileSync(
        path.join(photosDir, 'archive_yt-dlp.txt'),
        'youtube 1005\n',
      )

      const ids = extractArchiveItemIds(tmp)
      assert.equal(ids.length, 5)
      assert.ok(ids.includes('1001'))
      assert.ok(ids.includes('1002'))
      assert.ok(ids.includes('1003'))
      assert.ok(ids.includes('1004'))
      assert.ok(ids.includes('1005'))
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('syncDiskProfilesToLedger registers discovered creators and respects untracked blacklist', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-sync-base-'))
    const dbPath = path.join(baseDir, 'test.db')
    const ledger = new MediaLedger(dbPath)

    try {
      const igUserDir = path.join(baseDir, 'instagram', 'creator_one', 'Photos')
      fs.mkdirSync(igUserDir, { recursive: true })
      fs.writeFileSync(path.join(igUserDir, 'pic1.jpg'), 'data')
      fs.writeFileSync(path.join(igUserDir, 'pic2.jpg'), 'data')
      fs.writeFileSync(path.join(igUserDir, 'archive.txt'), 'post_id_999\n')

      const result1 = syncDiskProfilesToLedger(ledger, baseDir)
      assert.equal(result1.scanned, 1)
      assert.equal(result1.added, 1)

      const tracked = ledger.getTrackedProfile('instagram', 'creator_one')
      assert.ok(tracked)
      assert.equal(tracked?.username, 'creator_one')
      assert.equal(tracked?.mediaCount, 2)
      assert.equal(tracked?.choice, 'photos')

      assert.equal(ledger.hasMedia('post_id_999'), true)

      // Untrack profile and ensure sync does not revive it
      ledger.untrackProfile('instagram', 'creator_one')
      assert.equal(ledger.getTrackedProfile('instagram', 'creator_one'), null)
      assert.equal(ledger.isUntracked('instagram', 'creator_one'), true)

      const result2 = syncDiskProfilesToLedger(ledger, baseDir)
      assert.equal(result2.scanned, 0)
      assert.equal(result2.added, 0)
      assert.equal(ledger.getTrackedProfile('instagram', 'creator_one'), null)
    } finally {
      ledger.close()
      fs.rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('recordMediaBatch inserts items in batch and sync skips unchanged creators', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-batch-sync-'))
    const dbPath = path.join(baseDir, 'test.db')
    const ledger = new MediaLedger(dbPath)

    try {
      ledger.recordMediaBatch([
        {
          id: 'batch_1',
          platform: 'instagram',
          author: 'user1',
          url: '',
          filename: 'b1.jpg',
          filePath: '',
          downloadedAt: new Date().toISOString(),
        },
        {
          id: 'batch_2',
          platform: 'instagram',
          author: 'user1',
          url: '',
          filename: 'b2.jpg',
          filePath: '',
          downloadedAt: new Date().toISOString(),
        },
      ])

      assert.equal(ledger.hasMedia('batch_1'), true)
      assert.equal(ledger.hasMedia('batch_2'), true)

      const igUserDir = path.join(baseDir, 'instagram', 'batch_creator', 'Photos')
      fs.mkdirSync(igUserDir, { recursive: true })
      fs.writeFileSync(path.join(igUserDir, 'p1.jpg'), 'data')
      fs.writeFileSync(path.join(igUserDir, 'archive.txt'), 'b_arc_1\n')

      const res1 = syncDiskProfilesToLedger(ledger, baseDir)
      assert.equal(res1.added, 1)
      assert.equal(ledger.hasMedia('b_arc_1'), true)

      // Second sync should find creator already up to date and not add or update
      const res2 = syncDiskProfilesToLedger(ledger, baseDir)
      assert.equal(res2.added, 0)
      assert.equal(res2.updated, 0)
    } finally {
      ledger.close()
      fs.rmSync(baseDir, { recursive: true, force: true })
    }
  })

  it('hasMedia matches bare IDs, compound keys, and filenames in both sqlite and fallback modes', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-ledger-has-'))
    const dbPath = path.join(tmp, 'test.db')
    const sqliteLedger = new MediaLedger(dbPath)
    const fallbackLedger = new MediaLedger(undefined, true)

    for (const ledger of [sqliteLedger, fallbackLedger]) {
      try {
        ledger.recordMedia({
          id: '987654321',
          platform: 'instagram',
          author: 'creator_one',
          url: '',
          filename: 'creator_one_987654321.jpg',
          filePath: '/tmp/creator_one_987654321.jpg',
          downloadedAt: new Date().toISOString(),
        })

        assert.equal(ledger.hasMedia('987654321'), true)
        assert.equal(ledger.hasMedia('987654321', 'instagram', 'creator_one'), true)
        assert.equal(ledger.hasMedia('creator_one_987654321.jpg', 'instagram', 'creator_one'), true)
        assert.equal(ledger.hasMedia('non_existent'), false)
      } finally {
        ledger.close()
      }
    }
    fs.rmSync(tmp, { recursive: true, force: true })
  })
})
