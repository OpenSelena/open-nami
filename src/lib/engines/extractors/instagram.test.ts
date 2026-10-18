import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseIgNodeToMediaItems,
  parseReelItemToMediaItem,
  InstagramExtractor,
} from './instagram.js'

test('parseIgNodeToMediaItems extracts photo node', () => {
  const node = {
    id: '12345',
    shortcode: 'ABCde',
    display_url: 'https://instagram.com/photo.jpg',
    taken_at_timestamp: 1700000000,
    dimensions: {width: 1080, height: 1350},
  }

  const items = parseIgNodeToMediaItems(node, 'testuser')
  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'ABCde')
  assert.equal(items[0].type, 'photo')
  assert.equal(items[0].extension, 'jpg')
  assert.equal(items[0].width, 1080)
})

test('parseIgNodeToMediaItems unpacks carousel / sidecar posts', () => {
  const node = {
    id: 'carousel_1',
    shortcode: 'CAROUSEL',
    taken_at_timestamp: 1700000000,
    edge_sidecar_to_children: {
      edges: [
        {
          node: {
            id: 'slide_1',
            display_url: 'https://instagram.com/slide1.jpg',
          },
        },
        {
          node: {
            id: 'slide_2',
            is_video: true,
            video_url: 'https://instagram.com/slide2.mp4',
          },
        },
      ],
    },
  }

  const items = parseIgNodeToMediaItems(node, 'testuser')
  assert.equal(items.length, 2)
  assert.equal(items[0].id, 'CAROUSEL_1')
  assert.equal(items[0].type, 'photo')
  assert.equal(items[1].id, 'CAROUSEL_2')
  assert.equal(items[1].type, 'video')
})

test('parseReelItemToMediaItem handles video with missing width and height without throwing', () => {
  // Simulates the exact KeyError: 'width' payload from Instagram GraphQL
  const rawReelItem = {
    id: 'highlight_item_999',
    taken_at: 1700000000,
    media_type: 2,
    original_width: 1080,
    original_height: 1920,
    video_versions: [
      {
        url: 'https://instagram.com/video.mp4',
        // Notice 'width' and 'height' keys are missing!
      },
    ],
  }

  const item = parseReelItemToMediaItem(rawReelItem, 'kiswa99_')
  assert.ok(item)
  assert.equal(item.id, 'highlight_item_999')
  assert.equal(item.type, 'video')
  assert.equal(item.url, 'https://instagram.com/video.mp4')
  assert.equal(item.width, 1080) // Fell back safely to original_width!
  assert.equal(item.height, 1920) // Fell back safely to original_height!
})

test('parseIgNodeToMediaItems handles v1 REST carousel_media format', () => {
  const restNode: any = {
    pk: '987654321',
    taken_at: 1710000000,
    carousel_media: [
      {
        pk: 'slide_a',
        image_versions2: {
          candidates: [{url: 'https://instagram.com/slide_a.jpg', width: 1080, height: 1080}],
        },
      },
      {
        pk: 'slide_b',
        video_versions: [{url: 'https://instagram.com/slide_b.mp4', width: 720, height: 1280}],
      },
    ],
  }

  const items = parseIgNodeToMediaItems(restNode, 'creator')
  assert.equal(items.length, 2)
  assert.equal(items[0].id, '987654321_1')
  assert.equal(items[0].type, 'photo')
  assert.equal(items[0].url, 'https://instagram.com/slide_a.jpg')
  assert.equal(items[1].id, '987654321_2')
  assert.equal(items[1].type, 'video')
  assert.equal(items[1].url, 'https://instagram.com/slide_b.mp4')
})

test('InstagramExtractor fetchNextPostsPage parses GraphQL pagination correctly', async () => {
  const mockHttpClient: any = {
    fetchJson: async (url: string) => {
      if (url.includes('graphql/query')) {
        return {
          data: {
            user: {
              edge_owner_to_timeline_media: {
                page_info: {
                  has_next_page: true,
                  end_cursor: 'CURSOR_PAGE_2',
                },
                edges: [
                  {
                    node: {
                      id: 'post_page2_1',
                      display_url: 'https://instagram.com/post_page2_1.jpg',
                    },
                  },
                ],
              },
            },
          },
        }
      }
      return {}
    },
  }

  const extractor = new InstagramExtractor(mockHttpClient)
  const result = await extractor.fetchNextPostsPage('12345', 'natgeo', 'CURSOR_PAGE_1', {
    subDir: 'Photos',
  })

  assert.equal(result.hasNextPage, true)
  assert.equal(result.nextCursor, 'CURSOR_PAGE_2')
  assert.equal(result.edges.length, 1)
  assert.equal(result.edges[0].node.id, 'post_page2_1')
})

test('IG_QUERIES contains upstream gallery-dl doc IDs', async () => {
  const {IG_QUERIES} = await import('./instagram.js')
  assert.equal(IG_QUERIES.PolarisProfileStoryHighlightsTrayContentQuery, '26970053832668570')
  assert.equal(IG_QUERIES.PolarisProfilePostsTabContentQuery_connection, '39229011733413759')
  assert.equal(IG_QUERIES.PolarisProfileReelsTabContentQuery_connection, '28989741540630190')
  assert.equal(IG_QUERIES.PolarisProfilePageContentQuery, '28649589871350527')
})

test('InstagramExtractor fetchHighlightsTray uses GraphQL query with doc_id 26970053832668570', async () => {
  let calledUrl = ''
  let calledBody = ''
  const mockHttpClient: any = {
    fetchJson: async (url: string, init: any) => {
      calledUrl = url
      calledBody = init?.body || ''
      if (url.includes('graphql/query') && calledBody.includes('26970053832668570')) {
        return {
          data: {
            highlights: {
              edges: [
                {
                  node: {
                    id: 'highlight:12345678',
                    title: 'My Trip',
                  },
                },
              ],
            },
          },
        }
      }
      return {}
    },
  }

  const extractor = new InstagramExtractor(mockHttpClient)
  const tray = await extractor.fetchHighlightsTray('998877', {subDir: 'Highlights'})

  assert.ok(calledUrl.includes('graphql/query'))
  assert.ok(calledBody.includes('26970053832668570'))
  assert.equal(tray.length, 1)
  assert.equal(tray[0].id, 'highlight:12345678')
})

test('InstagramExtractor fetchNextReelsPage queries PolarisProfileReelsTabContentQuery_connection', async () => {
  let calledUrl = ''
  let calledBody = ''
  const mockHttpClient: any = {
    fetchJson: async (url: string, init: any) => {
      calledUrl = url
      calledBody = init?.body || ''
      if (url.includes('graphql/query') && calledBody.includes('28989741540630190')) {
        return {
          data: {
            fetch__XDTUserDict: {
              reels: {
                page_info: {
                  has_next_page: true,
                  end_cursor: 'REELS_CURSOR_2',
                },
                edges: [
                  {
                    node: {
                      id: 'reel_video_1',
                      shortcode: 'REEL123',
                      is_video: true,
                      video_url: 'https://instagram.com/reel1.mp4',
                    },
                  },
                ],
              },
            },
          },
        }
      }
      return {}
    },
  }

  const extractor = new InstagramExtractor(mockHttpClient)
  const result = await extractor.fetchNextReelsPage('998877', 'REELS_CURSOR_1', {subDir: 'Videos'})

  assert.ok(calledUrl.includes('graphql/query'))
  assert.ok(calledBody.includes('28989741540630190'))
  assert.equal(result.hasNextPage, true)
  assert.equal(result.nextCursor, 'REELS_CURSOR_2')
  assert.equal(result.edges.length, 1)
  assert.equal(result.edges[0].node.id, 'reel_video_1')
})

test('InstagramExtractor fetchHighlightsTray emits debug warning on failed query when OPEN_NAMI_DEBUG is enabled', async () => {
  const origDebug = process.env.OPEN_NAMI_DEBUG
  process.env.OPEN_NAMI_DEBUG = '1'

  const debugLogs: string[] = []
  const origConsoleDebug = console.debug
  console.debug = (...args: any[]) => {
    debugLogs.push(args.join(' '))
  }

  try {
    const mockHttpClient: any = {
      fetchJson: async () => {
        throw new Error('Doc ID 26970053832668570 deprecated by Meta')
      },
    }
    const extractor = new InstagramExtractor(mockHttpClient)
    const result = await extractor.fetchHighlightsTray('12345', {subDir: 'Highlights'})
    assert.deepEqual(result, [])
    assert.ok(debugLogs.some(log => log.includes('PolarisProfileStoryHighlightsTrayContentQuery')))
  } finally {
    console.debug = origConsoleDebug
    if (origDebug !== undefined) {
      process.env.OPEN_NAMI_DEBUG = origDebug
    } else {
      delete process.env.OPEN_NAMI_DEBUG
    }
  }
})

test('InstagramExtractor extract falls back to GraphQL posts tab when fetchUserProfile fails (HTTP 429)', async () => {
  let webPageRequested = false
  let gqlRequested = false

  const mockHttpClient: any = {
    fetchJson: async (url: string, init?: any) => {
      if (url.includes('api/v1/users/web_profile_info')) {
        throw new Error('HTTP 429 (Too Many Requests)')
      }
      if (url.includes('graphql/query')) {
        gqlRequested = true
        return {
          data: {
            xdt_api__v1__feed__user_timeline_graphql_connection: {
              edges: [
                {
                  node: {
                    id: 'post_gql_100',
                    shortcode: 'POST100',
                    display_url: 'https://instagram.com/p100.jpg',
                    taken_at: 1700000000,
                  },
                },
              ],
              page_info: {
                has_next_page: false,
              },
            },
          },
        }
      }
      return {}
    },
    fetchText: async (url: string) => {
      if (url.includes('humairaaaa_04')) {
        webPageRequested = true
        return `<html><script id="__eqmc">{"l":"lsd_token_123","f":"dtsg_token_456"}</script></html>`
      }
      return ''
    },
  }

  const extractor = new InstagramExtractor(mockHttpClient)
  const items: any[] = []
  for await (const item of extractor.extract(
    {platform: 'instagram', username: 'humairaaaa_04', cleanUrl: 'https://instagram.com/humairaaaa_04', rawInput: 'humairaaaa_04'},
    {subDir: 'Photos'}
  )) {
    items.push(item)
  }

  assert.equal(webPageRequested, true)
  assert.equal(gqlRequested, true)
  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'POST100')
  assert.equal(items[0].type, 'photo')
})

test('InstagramExtractor extract gracefully yields zero items when both REST and GraphQL fail', async () => {
  const mockHttpClient: any = {
    fetchJson: async () => {
      throw new Error('HTTP 429 (Too Many Requests)')
    },
    fetchText: async () => {
      throw new Error('Network error')
    },
  }
  const extractor = new InstagramExtractor(mockHttpClient)
  const items: any[] = []
  for await (const item of extractor.extract(
    {platform: 'instagram', username: 'humairaaaa_04', cleanUrl: 'https://instagram.com/humairaaaa_04', rawInput: 'humairaaaa_04'},
    {subDir: 'Photos'}
  )) {
    items.push(item)
  }
  assert.equal(items.length, 0)
})

test('parseIgNodeToMediaItems static-videos recovery retains static video with missing video versions as photo thumbnail', () => {
  const staticVideoNode: any = {
    id: 'static_vid_123',
    shortcode: 'STATIC123',
    is_video: true,
    display_url: 'https://instagram.com/static_thumb.jpg',
    taken_at_timestamp: 1700000000,
    dimensions: {width: 1080, height: 1080},
    // video_versions is empty or video_url is missing
    video_versions: [],
  }

  const items = parseIgNodeToMediaItems(staticVideoNode, 'creator')
  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'STATIC123')
  assert.equal(items[0].type, 'photo')
  assert.equal(items[0].url, 'https://instagram.com/static_thumb.jpg')
})

test('InstagramExtractor fetchUserProfile handles private profiles when friendship_status is null or missing without throwing TypeError', async () => {
  const mockHttpClient: any = {
    fetchJson: async () => ({
      data: {
        user: {
          id: 'user_private_1',
          username: 'private_account',
          is_private: true,
          friendship_status: null, // Null friendship_status as seen in upstream cb#526
          followed_by_viewer: false,
        },
      },
    }),
  }

  const extractor = new InstagramExtractor(mockHttpClient)
  await assert.rejects(
    async () => {
      await extractor.fetchUserProfile('private_account', {subDir: 'Photos'})
    },
    (err: Error) => {
      assert.ok(err.message.includes('is private'))
      // Must not be a TypeError: Cannot read properties of null
      assert.ok(!err.message.includes('Cannot read properties'))
      return true
    }
  )
})

test('InstagramExtractor fetchPostsTabGraphQL throws error when GraphQL response contains errors array', async () => {
  const mockHttpClient: any = {
    fetchJson: async () => ({
      errors: [{message: 'Execution error on PolarisProfilePostsTabContentQuery'}],
    }),
  }

  const extractor = new InstagramExtractor(mockHttpClient)
  await assert.rejects(
    async () => {
      await extractor.fetchPostsTabGraphQL('user_test', undefined, {}, {subDir: 'Photos'})
    },
    (err: Error) => {
      assert.ok(err.message.includes('GraphQL query error'))
      return true
    }
  )
})



