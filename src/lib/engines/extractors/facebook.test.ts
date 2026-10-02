import test from 'node:test'
import assert from 'node:assert/strict'
import {extractFacebookMediaFromHtml} from './facebook.js'

test('extractFacebookMediaFromHtml extracts HD video URL', () => {
  const html = `
<div>Some post</div>
<script>
{"browser_native_hd_url":"https:\\/\\/video.xx.fbcdn.net\\/v\\/t15\\/sample_hd.mp4?_nc_cat=101"}
</script>
`

  const items = extractFacebookMediaFromHtml(html, 'zuck')
  assert.equal(items.length, 1)
  assert.equal(items[0].type, 'video')
  assert.equal(items[0].extension, 'mp4')
  assert.equal(items[0].url, 'https://video.xx.fbcdn.net/v/t15/sample_hd.mp4?_nc_cat=101')
})

test('extractFacebookMediaFromHtml extracts photo nodes', () => {
  const html = `
<script>
,"image":{"uri":"https:\\/\\/scontent.xx.fbcdn.net\\/v\\/t39\\/photo1.jpg?stp=dst-jpg"}
</script>
<script>
,"image":{"uri":"https:\\/\\/scontent.xx.fbcdn.net\\/v\\/t39\\/photo2.jpg?stp=dst-jpg"}
</script>
`

  const items = extractFacebookMediaFromHtml(html, 'meta')
  assert.equal(items.length, 2)
  assert.equal(items[0].type, 'photo')
  assert.equal(items[0].extension, 'jpg')
  assert.equal(items[0].url, 'https://scontent.xx.fbcdn.net/v/t39/photo1.jpg?stp=dst-jpg')
  assert.equal(items[1].url, 'https://scontent.xx.fbcdn.net/v/t39/photo2.jpg?stp=dst-jpg')
})
