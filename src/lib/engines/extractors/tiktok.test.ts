import test from 'node:test'
import assert from 'node:assert/strict'
import {parseTikTokRehydrationJson, parseTikTokItem} from './tiktok.js'

test('parseTikTokRehydrationJson extracts JSON from script tag', () => {
  const html = `
<!DOCTYPE html>
<html>
<body>
<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
{"__DEFAULT_SCOPE__":{"webapp.user-detail":{"userInfo":{"user":{"id":"112233","secUid":"SEC_UID_123"}}}}}
</script>
</body>
</html>
`

  const parsed = parseTikTokRehydrationJson(html)
  assert.ok(parsed)
  assert.equal(parsed['webapp.user-detail'].userInfo.user.id, '112233')
  assert.equal(parsed['webapp.user-detail'].userInfo.user.secUid, 'SEC_UID_123')
})

test('parseTikTokItem extracts video item', () => {
  const item = {
    id: '71234567890',
    desc: 'Cool dancing video',
    createTime: '1700000000',
    video: {
      width: 720,
      height: 1280,
      playAddr: 'https://v16-webapp.tiktok.com/video/mp4_720.mp4',
    },
  }

  const media = parseTikTokItem(item, 'bellapoarch')
  assert.equal(media.length, 1)
  assert.equal(media[0].id, '71234567890')
  assert.equal(media[0].type, 'video')
  assert.equal(media[0].extension, 'mp4')
  assert.equal(media[0].url, 'https://v16-webapp.tiktok.com/video/mp4_720.mp4')
  assert.equal(media[0].width, 720)
  assert.equal(media[0].caption, 'Cool dancing video')
})

test('parseTikTokItem extracts multi-image carousel item', () => {
  const item = {
    id: '79999999999',
    desc: 'Photo slide carousel',
    createTime: '1700000000',
    imagePost: {
      images: [
        {imageURL: {urlList: ['https://p16-sign.tiktokcdn.com/slide1.jpg']}},
        {imageURL: {urlList: ['https://p16-sign.tiktokcdn.com/slide2.jpg']}},
      ],
    },
  }

  const media = parseTikTokItem(item, 'photographer')
  assert.equal(media.length, 2)
  assert.equal(media[0].type, 'photo')
  assert.equal(media[0].extension, 'jpg')
  assert.equal(media[0].id, '79999999999_1')
  assert.equal(media[1].id, '79999999999_2')
})

test('parseTikTokRehydrationJson extracts data from legacy SIGI_STATE script tag', () => {
  const html = `
<!DOCTYPE html>
<html>
<body>
<script id="SIGI_STATE" type="application/json">
{
  "UserModule": {
    "users": {
      "khaby.lame": {
        "id": "123456",
        "secUid": "MS4wLjABAAAA_SIGI_USER_SEC_UID"
      }
    }
  },
  "ItemModule": {
    "post_1": {
      "id": "post_1",
      "desc": "Simple life hack",
      "createTime": "1699999999",
      "video": {
        "playAddr": "https://v16.tiktokcdn.com/post_1.mp4"
      }
    }
  }
}
</script>
</body>
</html>
`

  const parsed = parseTikTokRehydrationJson(html)
  assert.ok(parsed)
  assert.equal(parsed['webapp.user-detail']?.userInfo?.user?.secUid, 'MS4wLjABAAAA_SIGI_USER_SEC_UID')
  assert.equal(parsed['webapp.user-detail']?.itemList?.length, 1)
  assert.equal(parsed['webapp.user-detail']?.itemList[0]?.id, 'post_1')
})

test('parseTikTokRehydrationJson extracts data from window["SIGI_STATE"] assignment', () => {
  const html = `
<!DOCTYPE html>
<html>
<body>
<script>
window['SIGI_STATE'] = {"UserModule":{"users":{"dave":{"id":"9988","secUid":"MS4wLjABAAAA_WINDOW_SEC_UID"}}}};
</script>
</body>
</html>
`

  const parsed = parseTikTokRehydrationJson(html)
  assert.ok(parsed)
  assert.equal(parsed['webapp.user-detail']?.userInfo?.user?.secUid, 'MS4wLjABAAAA_WINDOW_SEC_UID')
})

test('parseTikTokRehydrationJson extracts data from __NEXT_DATA__ payload', () => {
  const html = `
<!DOCTYPE html>
<html>
<body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "userInfo": {
        "user": {
          "id": "next_user_1",
          "secUid": "MS4wLjABAAAA_NEXT_DATA_SEC_UID"
        }
      },
      "items": [
        {"id": "next_post_1", "desc": "Next data post"}
      ]
    }
  }
}
</script>
</body>
</html>
`

  const parsed = parseTikTokRehydrationJson(html)
  assert.ok(parsed)
  assert.equal(parsed['webapp.user-detail']?.userInfo?.user?.secUid, 'MS4wLjABAAAA_NEXT_DATA_SEC_UID')
  assert.equal(parsed['webapp.user-detail']?.itemList?.length, 1)
})

test('parseTikTokRehydrationJson extracts secUid fallback from raw HTML regex', () => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta property="al:android:url" content="snssdk1233://user/profile/12345?sec_uid=MS4wLjABAAAA_FALLBACK_SEC_UID_12345678901234567890">
</head>
<body>
  <div>Profile rendered via client SPA</div>
</body>
</html>
`

  const parsed = parseTikTokRehydrationJson(html)
  assert.ok(parsed)
  assert.equal(
    parsed['webapp.user-detail']?.userInfo?.user?.secUid,
    'MS4wLjABAAAA_FALLBACK_SEC_UID_12345678901234567890',
  )
})

test('TikTokExtractor extract forwards session cookies and query parameters in API calls', async () => {
  const {TikTokExtractor} = await import('./tiktok.js')

  let capturedApiUrl = ''
  let capturedOptions: any = null

  const mockHttpClient: any = {
    fetchText: async () => `
      <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
      {"__DEFAULT_SCOPE__":{"webapp.user-detail":{"userInfo":{"user":{"id":"55","secUid":"MS4wLjABAAAA_TEST"}}}}}
      </script>
    `,
    fetchJson: async (url: string, opts: any) => {
      capturedApiUrl = url
      capturedOptions = opts
      return {
        itemList: [
          {
            id: 'post_api_1',
            desc: 'API video',
            createTime: '1700000000',
            video: {playAddr: 'https://cdn.tiktok.com/v1.mp4'},
          },
        ],
        hasMore: false,
        cursor: '0',
      }
    },
  }

  const extractor = new TikTokExtractor(mockHttpClient)
  const items = []
  for await (const item of extractor.extract(
    {platform: 'tiktok', username: 'tester', cleanUrl: 'https://www.tiktok.com/@tester', rawInput: 'tester'},
    {subDir: 'Videos', cookiePath: 'dummy/cookies.txt'},
  )) {
    items.push(item)
  }

  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'post_api_1')
  // Assert aid and app_name query parameters are present
  assert.match(capturedApiUrl, /aid=1988/)
  assert.match(capturedApiUrl, /app_name=tiktok_web/)
  assert.match(capturedApiUrl, /device_platform=web_pc/)
  assert.equal(capturedOptions?.cookiePath, 'dummy/cookies.txt')
  assert.equal(capturedOptions?.cookieDomain, 'tiktok.com')
})

