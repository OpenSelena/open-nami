import test from 'node:test'
import assert from 'node:assert/strict'
import {parseTweetMediaEntities} from './x.js'

test('parseTweetMediaEntities extracts high-res photo with name=orig', () => {
  const tweet = {
    rest_id: '123456789',
    legacy: {
      created_at: 'Wed Oct 10 20:19:24 +0000 2024',
      extended_entities: {
        media: [
          {
            id_str: 'media_1',
            type: 'photo',
            media_url_https: 'https://pbs.twimg.com/media/sample.jpg',
            original_info: {width: 1920, height: 1080},
          },
        ],
      },
    },
  }

  const items = parseTweetMediaEntities(tweet, 'elonmusk')
  assert.equal(items.length, 1)
  assert.equal(items[0].type, 'photo')
  assert.equal(items[0].extension, 'jpg')
  assert.equal(items[0].url, 'https://pbs.twimg.com/media/sample.jpg?name=orig')
  assert.equal(items[0].width, 1920)
  assert.equal(items[0].height, 1080)
})

test('parseTweetMediaEntities selects highest bitrate video variant', () => {
  const tweet = {
    rest_id: '987654321',
    legacy: {
      extended_entities: {
        media: [
          {
            id_str: 'vid_1',
            type: 'video',
            media_url_https: 'https://pbs.twimg.com/vid_thumb.jpg',
            video_info: {
              variants: [
                {
                  bitrate: 256000,
                  content_type: 'video/mp4',
                  url: 'https://video.twimg.com/low.mp4',
                },
                {
                  bitrate: 2176000,
                  content_type: 'video/mp4',
                  url: 'https://video.twimg.com/high.mp4',
                },
                {
                  content_type: 'application/x-mpegURL',
                  url: 'https://video.twimg.com/playlist.m3u8',
                },
              ],
            },
          },
        ],
      },
    },
  }

  const items = parseTweetMediaEntities(tweet, 'tester')
  assert.equal(items.length, 1)
  assert.equal(items[0].type, 'video')
  assert.equal(items[0].extension, 'mp4')
  assert.equal(items[0].url, 'https://video.twimg.com/high.mp4')
})

test('XExtractor ensureGuestToken throws descriptive error when activation fails', async () => {
  const {XExtractor} = await import('./x.js')
  const mockHttpClient: any = {
    fetchJson: async () => {
      throw new Error('HTTP 429 Too Many Requests')
    },
    setHeader: () => {},
  }

  const extractor = new XExtractor(mockHttpClient)
  await assert.rejects(
    () => extractor.ensureGuestToken({subDir: 'Photos'}),
    {message: /Failed to activate X\/Twitter guest session/},
  )
})

test('XExtractor fetchUserRestId extracts numerical user ID from twid cookie for i_history_likes', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const os = await import('node:os')
  const {XExtractor} = await import('./x.js')

  const tmpCookiePath = path.join(os.tmpdir(), `test-twid-cookie-${Date.now()}.txt`)
  const cookieContent = `.x.com\tTRUE\t/\tTRUE\t2147483647\ttwid\tu%3D9876543210\n`
  await fs.writeFile(tmpCookiePath, cookieContent)

  try {
    const mockHttpClient: any = {
      fetchJson: async () => ({}),
      setHeader: () => {},
    }
    const extractor = new XExtractor(mockHttpClient)
    const userId = await extractor.fetchUserRestId('i_history_likes', {
      subDir: 'Photos',
      cookiePath: tmpCookiePath,
    })
    assert.equal(userId, '9876543210')
  } finally {
    await fs.rm(tmpCookiePath, {force: true})
  }
})

test('XExtractor fetchUserRestId throws when missing twid cookie for i_history_likes', async () => {
  const {XExtractor} = await import('./x.js')
  const mockHttpClient: any = {
    fetchJson: async () => ({}),
    setHeader: () => {},
  }
  const extractor = new XExtractor(mockHttpClient)
  await assert.rejects(
    () => extractor.fetchUserRestId('i_history_likes', {subDir: 'Photos'}),
    {message: /missing 'twid' cookie/i},
  )
})

test('XExtractor fetchUserRestId extracts alphanumeric or quoted twid cookie values', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const os = await import('node:os')
  const {XExtractor} = await import('./x.js')

  const tmpCookiePath = path.join(os.tmpdir(), `test-twid-quoted-${Date.now()}.txt`)
  const cookieContent = `.x.com\tTRUE\t/\tTRUE\t2147483647\ttwid\t"u=snowflake_9876"\n`
  await fs.writeFile(tmpCookiePath, cookieContent)

  try {
    const mockHttpClient: any = {
      fetchJson: async () => ({}),
      setHeader: () => {},
    }
    const extractor = new XExtractor(mockHttpClient)
    const userId = await extractor.fetchUserRestId('i_history_likes', {
      subDir: 'Photos',
      cookiePath: tmpCookiePath,
    })
    assert.equal(userId, 'snowflake_9876')
  } finally {
    await fs.rm(tmpCookiePath, {force: true})
  }
})

