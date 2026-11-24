import test from 'node:test'
import assert from 'node:assert/strict'
import {
  extractFacebookMediaFromHtml,
  decodeEscapedUrl,
  extractFacebookPaginationCursor,
  extractFacebookNextPageUrl,
  rewriteFacebookHost,
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
  assert.notEqual(items[0].id, items[1].id, 'Page 2 item ID must not collide with Page 1 item ID')
  assert.notEqual(items[0].filename, items[1].filename, 'Page 2 filename must not collide with Page 1 filename')
  assert.equal(mockClient.pagesFetched, 2)
})

test('FacebookExtractor paginates beyond 5 pages without arbitrary hardcap', async () => {
  class MockDeepClient extends HttpClient {
    pagesFetched = 0
    override async fetchText(url: string): Promise<string> {
      this.pagesFetched++
      const pageNum = this.pagesFetched
      const hasNext = pageNum < 7
      return `
        ,"image":{"uri":"https:\\/\\/scontent.xx.fbcdn.net\\/photo_p${pageNum}.jpg"}
        ${hasNext ? `<div id="m_more_item"><a href="/zuck/photos?cursor=page${pageNum + 1}">See More</a></div>` : ''}
      `
    }
  }

  const mockClient = new MockDeepClient()
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

  assert.equal(mockClient.pagesFetched, 7)
  assert.equal(items.length, 7)
})

test('rewriteFacebookHost rewrites facebook.com hostnames without doubling and preserves fb.watch', () => {
  assert.equal(
    rewriteFacebookHost('https://www.facebook.com/reel/123', 'mbasic.facebook.com'),
    'https://mbasic.facebook.com/reel/123',
  )
  assert.equal(
    rewriteFacebookHost('https://www.facebook.com/reel/123', 'm.facebook.com'),
    'https://m.facebook.com/reel/123',
  )
  assert.equal(
    rewriteFacebookHost('https://facebook.com/reel/123?ref=share', 'mbasic.facebook.com'),
    'https://mbasic.facebook.com/reel/123?ref=share',
  )
  assert.equal(
    rewriteFacebookHost('https://fb.watch/abc123', 'mbasic.facebook.com'),
    'https://fb.watch/abc123',
  )
})

test('FacebookExtractor /reel/<id> fallback targets mbasic.facebook.com and m.facebook.com cleanly', async () => {
  class MockReelClient extends HttpClient {
    requested: string[] = []
    constructor(private resolveOnMobile: boolean) {
      super()
    }
    override async fetchText(url: string): Promise<string> {
      this.requested.push(url)
      if (url === 'https://www.facebook.com/reel/123') {
        return '<div id="root"></div>'
      }
      if (url === 'https://mbasic.facebook.com/reel/123') {
        if (this.resolveOnMobile) return '<div id="root"></div>'
        return '<video src="https://video.xx.fbcdn.net/v/reel_123_mbasic.mp4"></video>'
      }
      if (url === 'https://m.facebook.com/reel/123') {
        return '<video src="https://video.xx.fbcdn.net/v/reel_123_mobile.mp4"></video>'
      }
      throw new Error(`Unexpected url: ${url}`)
    }
  }

  const profile: ParsedProfile = {
    platform: 'facebook',
    username: 'reel_123',
    cleanUrl: 'https://www.facebook.com/reel/123',
    rawInput: 'https://www.facebook.com/reel/123',
  }

  const mbasicClient = new MockReelClient(false)
  const mbasicItems = []
  for await (const item of new FacebookExtractor(mbasicClient).extract(profile, {subDir: 'Videos'})) {
    mbasicItems.push(item)
  }
  assert.deepEqual(mbasicClient.requested, [
    'https://www.facebook.com/reel/123',
    'https://mbasic.facebook.com/reel/123',
  ])
  assert.ok(mbasicClient.requested.every(u => !u.includes('mbasic.mbasic.facebook.com')))
  assert.equal(mbasicItems.length, 1)
  assert.equal(mbasicItems[0].url, 'https://video.xx.fbcdn.net/v/reel_123_mbasic.mp4')

  const mobileClient = new MockReelClient(true)
  const mobileItems = []
  for await (const item of new FacebookExtractor(mobileClient).extract(profile, {subDir: 'Videos'})) {
    mobileItems.push(item)
  }
  assert.deepEqual(mobileClient.requested, [
    'https://www.facebook.com/reel/123',
    'https://mbasic.facebook.com/reel/123',
    'https://m.facebook.com/reel/123',
  ])
  assert.ok(mobileClient.requested.every(u => !u.includes('m.m.facebook.com')))
  assert.equal(mobileItems.length, 1)
  assert.equal(mobileItems[0].url, 'https://video.xx.fbcdn.net/v/reel_123_mobile.mp4')
})

test('FacebookExtractor preserves https://fb.watch/<id> without rewriting host on fallback', async () => {
  class MockWatchClient extends HttpClient {
    requested: string[] = []
    override async fetchText(url: string): Promise<string> {
      this.requested.push(url)
      if (this.requested.length === 1) {
        return '<div id="root"></div>'
      }
      return '<video src="https://video.xx.fbcdn.net/v/watch_xyz.mp4"></video>'
    }
  }

  const client = new MockWatchClient()
  const profile: ParsedProfile = {
    platform: 'facebook',
    username: 'watch_xyz',
    cleanUrl: 'https://fb.watch/xyz',
    rawInput: 'https://fb.watch/xyz',
  }

  const items = []
  for await (const item of new FacebookExtractor(client).extract(profile, {subDir: 'Videos'})) {
    items.push(item)
  }

  assert.equal(items.length, 1)
  assert.equal(items[0].url, 'https://video.xx.fbcdn.net/v/watch_xyz.mp4')
  assert.ok(client.requested.length >= 2)
  assert.ok(client.requested.every(u => u === 'https://fb.watch/xyz'))
})

