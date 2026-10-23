import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {parseIgNodeToMediaItems} from './extractors/instagram.js'
import {parseTikTokItem} from './extractors/tiktok.js'
import {parseTweetMediaEntities} from './extractors/x.js'
import {downloadMediaStream} from './downloader.js'
import type {MediaItem} from './extractors/types.js'

test('Instagram multi-slide carousel preserves sequence ordering and album provenance', () => {
  const rawIgCarousel = {
    id: 'post_root_999',
    shortcode: 'CxTestShortcode',
    taken_at_timestamp: 1715000000,
    edge_media_to_caption: {
      edges: [
        {
          node: {
            text: 'Trip to the mountains! #hiking #nature',
          },
        },
      ],
    },
    edge_sidecar_to_children: {
      edges: [
        {
          node: {
            id: 'child_1',
            is_video: false,
            display_url: 'https://instagram.com/slide1.jpg',
            dimensions: {width: 1080, height: 1350},
          },
        },
        {
          node: {
            id: 'child_2',
            is_video: true,
            video_url: 'https://instagram.com/slide2.mp4',
            video_versions: [{url: 'https://instagram.com/slide2.mp4', width: 720, height: 1280}],
            dimensions: {width: 720, height: 1280},
          },
        },
        {
          node: {
            id: 'child_3',
            is_video: false,
            display_url: 'https://instagram.com/slide3.jpg',
            dimensions: {width: 1080, height: 1080},
          },
        },
      ],
    },
  }

  const items = parseIgNodeToMediaItems(rawIgCarousel, 'mountaineer')
  assert.equal(items.length, 3)

  // Slide 1: Photo
  assert.equal(items[0].id, 'CxTestShortcode_1')
  assert.equal(items[0].filename, 'mountaineer_1715000000_CxTestShortcode_1')
  assert.equal(items[0].type, 'photo')
  assert.equal(items[0].extension, 'jpg')
  assert.equal(items[0].carouselId, 'CxTestShortcode')
  assert.equal(items[0].carouselIndex, 1)
  assert.equal(items[0].carouselTotal, 3)
  assert.equal(items[0].caption, 'Trip to the mountains! #hiking #nature')

  // Slide 2: Video
  assert.equal(items[1].id, 'CxTestShortcode_2')
  assert.equal(items[1].filename, 'mountaineer_1715000000_CxTestShortcode_2')
  assert.equal(items[1].type, 'video')
  assert.equal(items[1].extension, 'mp4')
  assert.equal(items[1].carouselId, 'CxTestShortcode')
  assert.equal(items[1].carouselIndex, 2)
  assert.equal(items[1].carouselTotal, 3)
  assert.equal(items[1].caption, 'Trip to the mountains! #hiking #nature')

  // Slide 3: Photo
  assert.equal(items[2].id, 'CxTestShortcode_3')
  assert.equal(items[2].filename, 'mountaineer_1715000000_CxTestShortcode_3')
  assert.equal(items[2].type, 'photo')
  assert.equal(items[2].extension, 'jpg')
  assert.equal(items[2].carouselId, 'CxTestShortcode')
  assert.equal(items[2].carouselIndex, 3)
  assert.equal(items[2].carouselTotal, 3)
})

test('TikTok multi-photo album preserves sequence formatting and metadata', () => {
  const rawTikTokAlbum = {
    id: '725000111222',
    createTime: '1695000000',
    desc: 'Photo dump from weekend #photodump #vibes',
    imagePost: {
      images: [
        {imageURL: {urlList: ['https://tiktok.com/photo1.jpg']}},
        {imageURL: {urlList: ['https://tiktok.com/photo2.jpg']}},
        {imageURL: {urlList: ['https://tiktok.com/photo3.jpg']}},
      ],
    },
  }

  const items = parseTikTokItem(rawTikTokAlbum, 'travelblogger')
  assert.equal(items.length, 3)

  items.forEach((item, idx) => {
    const slideNumber = idx + 1
    assert.equal(item.id, `725000111222_${slideNumber}`)
    assert.equal(item.filename, `travelblogger_1695000000_725000111222_${slideNumber}`)
    assert.equal(item.type, 'photo')
    assert.equal(item.extension, 'jpg')
    assert.equal(item.carouselId, '725000111222')
    assert.equal(item.carouselIndex, slideNumber)
    assert.equal(item.carouselTotal, 3)
    assert.equal(item.caption, 'Photo dump from weekend #photodump #vibes')
  })
})

test('X multi-media tweet preserves slide indexing and chronological naming', () => {
  const rawTweet = {
    rest_id: '185000999000',
    legacy: {
      created_at: 'Fri Oct 18 14:00:00 +0000 2024',
      full_text: 'Autumn leaves in Kyoto #autumn #kyoto',
      extended_entities: {
        media: [
          {
            id_str: 'media_part_1',
            type: 'photo',
            media_url_https: 'https://pbs.twimg.com/media/leaf1.jpg',
            original_info: {width: 2048, height: 1536},
          },
          {
            id_str: 'media_part_2',
            type: 'photo',
            media_url_https: 'https://pbs.twimg.com/media/leaf2.jpg',
            original_info: {width: 2048, height: 1536},
          },
        ],
      },
    },
  }

  const items = parseTweetMediaEntities(rawTweet, 'kyotoguide')
  assert.equal(items.length, 2)

  const expectedTimestamp = new Date('Fri Oct 18 14:00:00 +0000 2024').getTime() / 1000

  assert.equal(items[0].id, '185000999000_media_part_1')
  assert.equal(items[0].filename, `kyotoguide_${expectedTimestamp}_185000999000_1`)
  assert.equal(items[0].carouselId, '185000999000')
  assert.equal(items[0].carouselIndex, 1)
  assert.equal(items[0].carouselTotal, 2)

  assert.equal(items[1].id, '185000999000_media_part_2')
  assert.equal(items[1].filename, `kyotoguide_${expectedTimestamp}_185000999000_2`)
  assert.equal(items[1].carouselId, '185000999000')
  assert.equal(items[1].carouselIndex, 2)
  assert.equal(items[1].carouselTotal, 2)
})

test('downloadMediaStream downloads carousel slides and preserves sidecar album metadata', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-carousel-dl-'))

  try {
    const mockHttpClient: any = {
      request: async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(Buffer.from('dummy slide data'))
            controller.close()
          },
        }),
      }),
    }

    async function* mockItems(): AsyncGenerator<MediaItem> {
      for (let i = 1; i <= 3; i++) {
        yield {
          id: `carousel_post_${i}`,
          url: `https://example.com/slide_${i}.jpg`,
          filename: `creator_1700000000_album_${i}`,
          extension: 'jpg',
          type: 'photo',
          caption: 'Complete album gallery #collection',
          date: 1700000000,
          author: 'creator',
          platform: 'instagram',
          carouselId: 'album_root_123',
          carouselIndex: i,
          carouselTotal: 3,
        }
      }
    }

    const result = await downloadMediaStream(mockItems(), {
      jobName: 'CarouselDownloadTest',
      destDir: tmpDir,
      httpClient: mockHttpClient,
      writeMetadata: true,
    })

    assert.equal(result.downloaded, 3)
    assert.equal(result.skipped, 0)
    assert.equal(result.errors.length, 0)

    for (let i = 1; i <= 3; i++) {
      const mediaFile = path.join(tmpDir, `creator_1700000000_album_${i}.jpg`)
      const sidecarFile = path.join(tmpDir, `creator_1700000000_album_${i}.json`)

      assert.ok(await fs.stat(mediaFile).then(() => true).catch(() => false))
      assert.ok(await fs.stat(sidecarFile).then(() => true).catch(() => false))

      const sidecar = JSON.parse(await fs.readFile(sidecarFile, 'utf-8'))
      assert.equal(sidecar.id, `carousel_post_${i}`)
      assert.equal(sidecar.author, 'creator')
      assert.equal(sidecar.platform, 'instagram')
      assert.deepEqual(sidecar.carousel, {
        id: 'album_root_123',
        index: i,
        total: 3,
      })
    }
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})
