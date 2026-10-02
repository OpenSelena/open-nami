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

