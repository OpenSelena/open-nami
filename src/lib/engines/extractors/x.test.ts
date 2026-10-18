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

test('XExtractor fetchUserRestId finds twid on .twitter.com domain when x.com is absent', async () => {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const os = await import('node:os')
  const {XExtractor} = await import('./x.js')

  const tmpCookiePath = path.join(os.tmpdir(), `test-twid-twitter-domain-${Date.now()}.txt`)
  const cookieContent = `.twitter.com\tTRUE\t/\tTRUE\t2147483647\ttwid\tu%3D5544332211\n`
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
    assert.equal(userId, '5544332211')
  } finally {
    await fs.rm(tmpCookiePath, {force: true})
  }
})

test('shouldSkipTweetReply correctly identifies top-level posts, self-replies, and third-party replies', async () => {
  const {shouldSkipTweetReply} = await import('./x.js')

  // Top level tweet (not a reply)
  const topLevelTweet = {
    rest_id: '1001',
    legacy: {
      user_id_str: 'user_123',
    },
  }
  assert.equal(shouldSkipTweetReply(topLevelTweet, 'user_123', 'timeline'), false)
  assert.equal(shouldSkipTweetReply(topLevelTweet, 'user_123', 'likes'), false)

  // Timeline mode: author replied to themselves (self-thread)
  const selfReplyTweet = {
    rest_id: '1002',
    legacy: {
      user_id_str: 'user_123',
      in_reply_to_user_id_str: 'user_123',
    },
  }
  assert.equal(shouldSkipTweetReply(selfReplyTweet, 'user_123', 'timeline'), false)

  // Timeline mode: author replied to another user (conversational reply) -> skip
  const otherReplyTweet = {
    rest_id: '1003',
    legacy: {
      user_id_str: 'user_123',
      in_reply_to_user_id_str: 'user_999',
    },
  }
  assert.equal(shouldSkipTweetReply(otherReplyTweet, 'user_123', 'timeline'), true)

  // Likes mode (cb#501): liked tweet is a creator's self-thread continuation -> keep
  const likedSelfThread = {
    rest_id: '1004',
    legacy: {
      user_id_str: 'artist_456',
      in_reply_to_user_id_str: 'artist_456',
    },
  }
  assert.equal(shouldSkipTweetReply(likedSelfThread, 'my_id', 'likes'), false)

  // Likes mode (cb#501): liked tweet is a creator replying to another user -> skip
  const likedConversationalReply = {
    rest_id: '1005',
    legacy: {
      user_id_str: 'artist_456',
      in_reply_to_user_id_str: 'fan_789',
    },
  }
  assert.equal(shouldSkipTweetReply(likedConversationalReply, 'my_id', 'likes'), true)
})

test('XExtractor extract skips conversational replies in stream and passes CSRF token', async () => {
  const {XExtractor} = await import('./x.js')

  let capturedHeaders: Record<string, string> | undefined
  const mockHttpClient: any = {
    setHeader: () => {},
    fetchJson: async (url: string, opts: any) => {
      if (url.includes('UserByScreenName') || url.includes('guest/activate')) {
        return {guest_token: 'guest_123', data: {user: {result: {rest_id: 'user_123'}}}}
      }
      if (url.includes('UserMedia')) {
        capturedHeaders = opts.headers
        return {
          data: {
            user: {
              result: {
                timeline_v2: {
                  timeline: {
                    instructions: [
                      {
                        entries: [
                          // 1. Top level tweet with photo (should yield)
                          {
                            entryId: 'tweet-1',
                            content: {
                              itemContent: {
                                tweet_results: {
                                  result: {
                                    rest_id: 'tweet_top',
                                    legacy: {
                                      user_id_str: 'user_123',
                                      extended_entities: {
                                        media: [{
                                          id_str: 'm1',
                                          type: 'photo',
                                          media_url_https: 'https://pbs.twimg.com/media/m1.jpg',
                                        }],
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                          // 2. Third-party conversational reply (should be skipped!)
                          {
                            entryId: 'tweet-2',
                            content: {
                              itemContent: {
                                tweet_results: {
                                  result: {
                                    rest_id: 'tweet_reply_other',
                                    legacy: {
                                      user_id_str: 'user_123',
                                      in_reply_to_user_id_str: 'other_user_456',
                                      extended_entities: {
                                        media: [{
                                          id_str: 'm2',
                                          type: 'photo',
                                          media_url_https: 'https://pbs.twimg.com/media/m2.jpg',
                                        }],
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                          // 3. Self-thread continuation (should yield)
                          {
                            entryId: 'tweet-3',
                            content: {
                              itemContent: {
                                tweet_results: {
                                  result: {
                                    rest_id: 'tweet_self_thread',
                                    legacy: {
                                      user_id_str: 'user_123',
                                      in_reply_to_user_id_str: 'user_123',
                                      extended_entities: {
                                        media: [{
                                          id_str: 'm3',
                                          type: 'photo',
                                          media_url_https: 'https://pbs.twimg.com/media/m3.jpg',
                                        }],
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        }
      }
      return {}
    },
  }

  const extractor = new XExtractor(mockHttpClient)
  const items = []
  for await (const item of extractor.extract(
    {platform: 'x', username: 'tester', cleanUrl: 'https://x.com/tester', rawInput: 'tester'},
    {subDir: 'Photos'},
  )) {
    items.push(item)
  }

  // Expect tweet_top and tweet_self_thread to be yielded, and tweet_reply_other skipped
  assert.equal(items.length, 2)
  assert.equal(items[0].id, 'tweet_top_m1')
  assert.equal(items[1].id, 'tweet_self_thread_m3')
})


