import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  extractHashtags,
  buildMetadataSidecar,
  writeMetadataSidecar,
} from './metadata.js'
import type {MediaItem} from './extractors/types.js'

test('extractHashtags extracts Latin and Unicode hashtags without duplicates', () => {
  const text = 'Hello world! #photography #nature #travel #nature #東京 #café'
  const tags = extractHashtags(text)
  assert.deepEqual(tags, ['photography', 'nature', 'travel', '東京', 'café'])

  assert.deepEqual(extractHashtags(''), [])
  assert.deepEqual(extractHashtags(undefined), [])
  assert.deepEqual(extractHashtags('Just a normal caption with no tags'), [])
})

test('buildMetadataSidecar constructs structured sidecar with dates, hashtags, and fallback author', () => {
  const item: MediaItem = {
    id: 'post_123',
    url: 'https://cdn.example.com/photo.jpg',
    filename: 'user_1700000000_1',
    extension: 'jpg',
    type: 'photo',
    caption: 'Sunset at the beach #sunset #beachlife',
    date: 1700000000,
    width: 1080,
    height: 1350,
  }

  const sidecar = buildMetadataSidecar(item, 'user_1700000000_1.jpg', 'instagram', 'traveler')
  assert.equal(sidecar.id, 'post_123')
  assert.equal(sidecar.platform, 'instagram')
  assert.equal(sidecar.author, 'traveler')
  assert.equal(sidecar.filename, 'user_1700000000_1.jpg')
  assert.equal(sidecar.type, 'photo')
  assert.equal(sidecar.extension, 'jpg')
  assert.equal(sidecar.caption, 'Sunset at the beach #sunset #beachlife')
  assert.deepEqual(sidecar.hashtags, ['sunset', 'beachlife'])
  assert.equal(sidecar.date, 1700000000)
  assert.equal(sidecar.isoDate, '2023-11-14T22:13:20.000Z')
  assert.equal(sidecar.width, 1080)
  assert.equal(sidecar.height, 1350)
  assert.ok(sidecar.extractedAt)
})

test('buildMetadataSidecar preserves carousel info and custom metadata', () => {
  const item: MediaItem = {
    id: 'album_456_2',
    url: 'https://cdn.example.com/slide2.jpg',
    filename: 'creator_album_456_2',
    extension: '.jpg',
    type: 'photo',
    author: 'creator',
    platform: 'tiktok',
    carouselId: 'album_456',
    carouselIndex: 2,
    carouselTotal: 5,
    metadata: {likes: 1200, comments: 45},
  }

  const sidecar = buildMetadataSidecar(item, 'creator_album_456_2.jpg')
  assert.equal(sidecar.author, 'creator')
  assert.equal(sidecar.platform, 'tiktok')
  assert.deepEqual(sidecar.carousel, {
    id: 'album_456',
    index: 2,
    total: 5,
  })
  assert.deepEqual(sidecar.metadata, {likes: 1200, comments: 45})
})

test('writeMetadataSidecar atomically writes sidecar JSON and updates mtime', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-meta-test-'))
  const sidecarPath = path.join(tmpDir, 'test_media.json')

  try {
    const item: MediaItem = {
      id: 'item_999',
      url: 'https://example.com/media.mp4',
      filename: 'test_media',
      extension: 'mp4',
      type: 'video',
      caption: 'Test video #viral',
      date: 1680000000,
    }

    const sidecar = buildMetadataSidecar(item, 'test_media.mp4', 'tiktok', 'testuser')
    await writeMetadataSidecar(sidecarPath, sidecar, item.date)

    const raw = await fs.readFile(sidecarPath, 'utf-8')
    const parsed = JSON.parse(raw)
    assert.equal(parsed.id, 'item_999')
    assert.equal(parsed.caption, 'Test video #viral')
    assert.deepEqual(parsed.hashtags, ['viral'])

    const stat = await fs.stat(sidecarPath)
    // Check mtime matches post timestamp within 1-second precision
    assert.equal(Math.floor(stat.mtimeMs / 1000), 1680000000)
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})
