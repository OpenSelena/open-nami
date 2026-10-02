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
