import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractFacebookMediaFromHtml,
  decodeEscapedUrl,
  extractFacebookPaginationCursor,
  extractFacebookNextPageUrl,
  FacebookExtractor,
} from './facebook.js'
import {HttpClient} from './http.js'
import type {ParsedProfile} from '../../parser.js'

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

test('decodeEscapedUrl parses URLs containing newlines and escaped unicode without throwing', () => {
  const dirtyUrl = 'https:\\/\\/scontent.xx.fbcdn.net\\/v\\/t39\\/photo.jpg\r\n?_nc_cat=101\\u0026oh=abc123'
  const decoded = decodeEscapedUrl(dirtyUrl)
  assert.equal(decoded, 'https://scontent.xx.fbcdn.net/v/t39/photo.jpg?_nc_cat=101&oh=abc123')
})

test('extractFacebookMediaFromHtml extracts photos from mbasic server-rendered HTML with &amp; entities', () => {
  const mbasicHtml = `
<div id="root">
  <table class="photo_grid">
    <tr>
      <td>
        <a href="/photo.php?fbid=101&amp;set=a.100">
          <img src="https://scontent.xx.fbcdn.net/v/t39.30808-6/photo_mbasic_1.jpg?_nc_cat=1&amp;oh=test1&amp;oe=6000" />
        </a>
      </td>
      <td>
        <a href="/photo.php?fbid=102&amp;set=a.100">
          <img src="https://scontent.xx.fbcdn.net/v/t39.30808-6/photo_mbasic_2.jpg?_nc_cat=1&amp;oh=test2&amp;oe=6000" />
        </a>
      </td>
    </tr>
  </table>
</div>
`
  const items = extractFacebookMediaFromHtml(mbasicHtml, 'zuck')
  assert.equal(items.length, 2)
  assert.equal(items[0].type, 'photo')
  assert.equal(items[0].url, 'https://scontent.xx.fbcdn.net/v/t39.30808-6/photo_mbasic_1.jpg?_nc_cat=1&oh=test1&oe=6000')
  assert.equal(items[1].url, 'https://scontent.xx.fbcdn.net/v/t39.30808-6/photo_mbasic_2.jpg?_nc_cat=1&oh=test2&oe=6000')
})

test('extractFacebookMediaFromHtml extracts video from playable_url and HTML5 video tags', () => {
  const html = `
<div class="video-container">
  <script>{"playable_url_quality_hd":"https:\\/\\/video.xx.fbcdn.net\\/v\\/t15\\/playable_hd.mp4?tag=1"}</script>
  <video src="https://video.xx.fbcdn.net/v/t15/tag_video.mp4?tag=2"></video>
</div>
`
  const items = extractFacebookMediaFromHtml(html, 'zuck')
  assert.equal(items.length, 2)
  assert.equal(items[0].type, 'video')
  assert.equal(items[0].url, 'https://video.xx.fbcdn.net/v/t15/playable_hd.mp4?tag=1')
  assert.equal(items[1].type, 'video')
  assert.equal(items[1].url, 'https://video.xx.fbcdn.net/v/t15/tag_video.mp4?tag=2')
})

test('extractFacebookPaginationCursor extracts cursor from JSON end_cursor and HTML links', () => {
  const jsonHtml = `{"page_info":{"has_next_page":true,"end_cursor":"AQD_json_cursor_123"}}`
  assert.equal(extractFacebookPaginationCursor(jsonHtml), 'AQD_json_cursor_123')

  const linkHtml = `<div id="m_more_item"><a href="/zuck/photos?cursor=AQD_link_cursor_456&amp;tab=albums">See More</a></div>`
  assert.equal(extractFacebookPaginationCursor(linkHtml), 'AQD_link_cursor_456')
})

test('extractFacebookNextPageUrl resolves mbasic m_more_item pagination links and relative URLs', () => {
  const mbasicHtml = `
<div id="m_more_item">
  <a href="/zuck/photos?cursor=AQD_cursor_page2&amp;tab=albums"><span>See More Photos</span></a>
</div>
`
  const nextUrl = extractFacebookNextPageUrl(mbasicHtml, 'https://mbasic.facebook.com/zuck/photos')
  assert.equal(nextUrl, 'https://mbasic.facebook.com/zuck/photos?cursor=AQD_cursor_page2&tab=albums')
})

test('FacebookExtractor falls back to mbasic.facebook.com when desktop HTML contains no media', async () => {
  class MockHttpClient extends HttpClient {
    requested: string[] = []
    override async fetchText(url: string): Promise<string> {
      this.requested.push(url)
      if (url.includes('www.facebook.com')) {
        // Blank client-rendered React shell
        return '<div id="root"></div>'
      }
      if (url.includes('mbasic.facebook.com')) {
        // Server-rendered mobile page
        return `
          <div id="root">
            <img src="https://scontent.xx.fbcdn.net/v/t39/mbasic_photo.jpg?_nc_cat=1" />
          </div>
        `
      }
      throw new Error(`Unexpected url: ${url}`)
    }
  }

  const mockClient = new MockHttpClient()
  const extractor = new FacebookExtractor(mockClient)
  const profile: ParsedProfile = {
    platform: 'facebook',
    username: 'zuck',
    cleanUrl: 'https://www.facebook.com/zuck',
    rawInput: 'https://www.facebook.com/zuck',
  }

  const items = []
  for await (const item of extractor.extract(profile, {subDir: 'Photos'})) {
    items.push(item)
  }

  assert.equal(items.length, 1)
  assert.equal(items[0].url, 'https://scontent.xx.fbcdn.net/v/t39/mbasic_photo.jpg?_nc_cat=1')
  assert.ok(mockClient.requested.some(u => u.includes('www.facebook.com')))
  assert.ok(mockClient.requested.some(u => u.includes('mbasic.facebook.com')))
})

test('FacebookExtractor paginates through multiple pages using next page URLs', async () => {
  class MockPaginationClient extends HttpClient {
    pagesFetched = 0
    override async fetchText(url: string): Promise<string> {
      this.pagesFetched++
      if (url === 'https://www.facebook.com/zuck/photos') {
        return `
          ,"image":{"uri":"https:\\/\\/scontent.xx.fbcdn.net\\/photo1.jpg"}
          <div id="m_more_item"><a href="/zuck/photos?cursor=page2_cursor">See More</a></div>
        `
      }
      if (url.includes('cursor=page2_cursor')) {
        return `
          ,"image":{"uri":"https:\\/\\/scontent.xx.fbcdn.net\\/photo2.jpg"}
        `
      }
      throw new Error(`Unexpected url: ${url}`)
    }
  }

  const mockClient = new MockPaginationClient()
  const extractor = new FacebookExtractor(mockClient)
  const profile: ParsedProfile = {
    platform: 'facebook',
    username: 'zuck',
    cleanUrl: 'https://www.facebook.com/zuck',
    rawInput: 'https://www.facebook.com/zuck',
  }

  const items = []
  for await (const item of extractor.extract(profile, {subDir: 'Photos'})) {
    items.push(item)
  }

  assert.equal(items.length, 2)
  assert.equal(items[0].url, 'https://scontent.xx.fbcdn.net/photo1.jpg')
  assert.equal(items[1].url, 'https://scontent.xx.fbcdn.net/photo2.jpg')
  assert.equal(mockClient.pagesFetched, 2)
})

