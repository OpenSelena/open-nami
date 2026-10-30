import {HttpClient, sleep} from './http.js'
import type {Extractor, ExtractOptions, MediaItem} from './types.js'
import type {ParsedProfile} from '../../parser.js'

export function decodeEscapedUrl(raw: string): string {
  const sanitized = raw.replace(/[\r\n\t]/g, '').trim()
  try {
    return JSON.parse(`"${sanitized.replace(/"/g, '\\"')}"`)
  } catch {
    return sanitized
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\(["\\\/bfnrt])/g, (_, ch) => {
        const escapes: Record<string, string> = {
          '"': '"',
          '\\': '\\',
          '/': '/',
          b: '\b',
          f: '\f',
          n: '\n',
          r: '\r',
          t: '\t',
        }
        return escapes[ch] || ch
      })
  }
}

export function deriveFacebookMediaId(
  url: string,
  type: 'photo' | 'video',
  index: number,
): {id: string; filenameSuffix: string} {
  try {
    const parsed = new URL(url)
    const fbid = parsed.searchParams.get('fbid')
    if (fbid) {
      return {id: `fb_${type}_${fbid}`, filenameSuffix: `${type}_${fbid}`}
    }
    const pathname = parsed.pathname
    const basename = pathname.substring(pathname.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
    if (basename && !/^(image|photo|video|media)$/i.test(basename)) {
      const clean = basename.replace(/[^a-zA-Z0-9_-]/g, '_')
      if (clean.length >= 3) {
        return {id: `fb_${type}_${clean}`, filenameSuffix: `${type}_${clean}`}
      }
    }
  } catch {}
  return {id: `fb_${type}_${index}`, filenameSuffix: `${type}_${index}`}
}

export function extractFacebookMediaFromHtml(
  html: string,
  username: string,
  counters: {photoIndex: number; videoIndex: number} = {photoIndex: 1, videoIndex: 1},
): MediaItem[] {
  const items: MediaItem[] = []
  const seenUrls = new Set<string>()

  // 1. HD / SD and playable video URLs
  const videoPatterns = [
    /"browser_native_hd_url":"([^"]+)"/g,
    /"browser_native_sd_url":"([^"]+)"/g,
    /"playable_url_quality_hd":"([^"]+)"/g,
    /"playable_url":"([^"]+)"/g,
    /<video[^>]+src=["'](https?:[^"']+)["']/gi,
  ]

  for (const regex of videoPatterns) {
    let vMatch: RegExpExecArray | null
    while ((vMatch = regex.exec(html)) !== null) {
      const rawUrl = vMatch[1]
      const videoUrl = decodeEscapedUrl(rawUrl).replace(/&amp;/g, '&')
      if (videoUrl.startsWith('http') && !seenUrls.has(videoUrl)) {
        seenUrls.add(videoUrl)
        const meta = deriveFacebookMediaId(videoUrl, 'video', counters.videoIndex)
        items.push({
          id: meta.id,
          url: videoUrl,
          filename: `${username}_${meta.filenameSuffix}`,
          extension: 'mp4',
          type: 'video',
        })
        counters.videoIndex++
      }
    }
  }

  // 2. High-res photo URI nodes in JSON
  const photoRegex = /,"(?:image|viewer_image|full_size_image|display_image)":\{"uri":"([^"]+)"/g
  let match: RegExpExecArray | null

  while ((match = photoRegex.exec(html)) !== null) {
    const rawUrl = match[1]
    const photoUrl = decodeEscapedUrl(rawUrl).replace(/&amp;/g, '&')
    if (!seenUrls.has(photoUrl)) {
      seenUrls.add(photoUrl)
      const meta = deriveFacebookMediaId(photoUrl, 'photo', counters.photoIndex)
      items.push({
        id: meta.id,
        url: photoUrl,
        filename: `${username}_${meta.filenameSuffix}`,
        extension: 'jpg',
        type: 'photo',
      })
      counters.photoIndex++
    }
  }

  // 3. Mobile / mbasic server-rendered photo image tags
  const mbasicImgRegex = /<img[^>]+src=["'](https:\/\/[^"'\s]*scontent[^"'\s]*\.(?:jpg|png|webp)[^"'\s]*)["']/gi
  let mMatch: RegExpExecArray | null
  while ((mMatch = mbasicImgRegex.exec(html)) !== null) {
    const rawUrl = mMatch[1]
    const photoUrl = decodeEscapedUrl(rawUrl).replace(/&amp;/g, '&')
    if (!seenUrls.has(photoUrl)) {
      seenUrls.add(photoUrl)
      const meta = deriveFacebookMediaId(photoUrl, 'photo', counters.photoIndex)
      items.push({
        id: meta.id,
        url: photoUrl,
        filename: `${username}_${meta.filenameSuffix}`,
        extension: 'jpg',
        type: 'photo',
      })
      counters.photoIndex++
    }
  }

  // 4. Fallback: scontent photo links in raw HTML
  if (items.length === 0) {
    const scontentRegex = /https:\/\/[^"'\s<>]*scontent[^"'\s<>]*\.(?:jpg|png|webp)[^"'\s<>]*/gi
    let sMatch: RegExpExecArray | null
    while ((sMatch = scontentRegex.exec(html)) !== null) {
      const cleanUrl = sMatch[0].replace(/\\/g, '').replace(/&amp;/g, '&')
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl)
        const meta = deriveFacebookMediaId(cleanUrl, 'photo', counters.photoIndex)
        items.push({
          id: meta.id,
          url: cleanUrl,
          filename: `${username}_${meta.filenameSuffix}`,
          extension: 'jpg',
          type: 'photo',
        })
        counters.photoIndex++
      }
    }
  }

  return items
}

export function extractFacebookPaginationCursor(html: string): string | null {
  // 1. JSON page_info end_cursor or cursor
  const jsonCursorMatch = html.match(/"end_cursor":"([^"]+)"/) || html.match(/"cursor":"([^"]+)"/)
  if (jsonCursorMatch && jsonCursorMatch[1]) {
    return jsonCursorMatch[1]
  }

  // 2. Mobile / mbasic pagination links with cursor or after parameter
  const linkCursorMatch = html.match(/[?&](?:cursor|after)=([^"'\s&<>]+)/i)
  if (linkCursorMatch && linkCursorMatch[1]) {
    try {
      return decodeURIComponent(linkCursorMatch[1])
    } catch {
      return linkCursorMatch[1]
    }
  }

  return null
}

export function resolveFacebookUrl(href: string, currentUrl: string): string {
  const cleanHref = href.replace(/\\/g, '').replace(/&amp;/g, '&')
  try {
    return new URL(cleanHref, currentUrl).toString()
  } catch {
    return cleanHref
  }
}

export function extractFacebookNextPageUrl(html: string, currentUrl: string): string | null {
  // 1. Check for dedicated more item containers in mbasic / mobile HTML
  const moreItemMatch = html.match(/<div[^>]*id=["'](?:m_more_item|m_more_posts)["'][^>]*>\s*<a[^>]+href=["']([^"']+)["']/i)
  if (moreItemMatch && moreItemMatch[1]) {
    return resolveFacebookUrl(moreItemMatch[1], currentUrl)
  }

  // 2. Check for anchor tag with cursor/after and pagination label
  const cursorLabelMatch = html.match(/<a[^>]+href=["']([^"']*(?:cursor=|after=)[^"']+)["'][^>]*>[\s\S]*?(?:See [Mm]ore|More [Pp]hotos|More|Next|Older [Pp]osts)[\s\S]*?<\/a>/i)
  if (cursorLabelMatch && cursorLabelMatch[1]) {
    return resolveFacebookUrl(cursorLabelMatch[1], currentUrl)
  }

  // 3. Check for any link containing cursor= or after=
  const genericCursorMatch = html.match(/<a[^>]+href=["']([^"']*(?:[?&]|&amp;)(?:cursor|after)=[^"']+)["']/i)
  if (genericCursorMatch && genericCursorMatch[1]) {
    return resolveFacebookUrl(genericCursorMatch[1], currentUrl)
  }

  // 4. Fallback: if cursor is present in JSON or HTML, append it to currentUrl
  const cursor = extractFacebookPaginationCursor(html)
  if (cursor) {
    try {
      const u = new URL(currentUrl)
      if (u.searchParams.get('cursor') !== cursor) {
        u.searchParams.set('cursor', cursor)
        return u.toString()
      }
    } catch {
      if (!currentUrl.includes(cursor)) {
        const sep = currentUrl.includes('?') ? '&' : '?'
        return `${currentUrl}${sep}cursor=${encodeURIComponent(cursor)}`
      }
    }
  }

  return null
}

export class FacebookExtractor implements Extractor {
  platform = 'facebook' as const
  private httpClient: HttpClient

  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      'Referer': 'https://www.facebook.com/',
    })
  }

  async *extract(profile: ParsedProfile, options: ExtractOptions): AsyncGenerator<MediaItem, void, unknown> {
    const username = profile.username
    const subDir = options.subDir

    options.onProgress?.({
      stage: 'Profile',
      found: 0,
      message: `Fetching Facebook profile @${username}...`,
    })

    const isTest =
      process.env.NODE_ENV === 'test' ||
      Boolean(process.env.NODE_TEST_CONTEXT) ||
      process.execArgv.some(a => a.includes('test'))
    const pathsToScrape = subDir === 'All' ? ['photos', 'videos'] : [subDir === 'Photos' ? 'photos' : 'videos']
    const seenUrls = new Set<string>()
    const counters = {photoIndex: 1, videoIndex: 1}
    let found = 0

    for (const targetPath of pathsToScrape) {
      if (options.signal?.aborted) break

      const desktopUrl = `https://www.facebook.com/${encodeURIComponent(username)}/${targetPath}`
      const mbasicUrl = `https://mbasic.facebook.com/${encodeURIComponent(username)}/${targetPath}`
      const mobileUrl = `https://m.facebook.com/${encodeURIComponent(username)}/${targetPath}`

      let currentUrl = desktopUrl
      let html = ''

      try {
        html = await this.httpClient.fetchText(desktopUrl, {
          cookiePath: options.cookiePath,
          cookieDomain: 'facebook.com',
          signal: options.signal,
          retries: 0,
          timeoutMs: 4000,
        })
      } catch {
        html = ''
      }

      let initialItems = extractFacebookMediaFromHtml(html, username)

      // Fallback to mobile endpoints if desktop returns blank shell
      if (initialItems.length === 0) {
        options.onProgress?.({
          stage: 'Profile',
          found,
          message: `Desktop yielded 0 items. Falling back to mbasic.facebook.com for @${username}/${targetPath}...`,
        })
        try {
          const mbasicHtml = await this.httpClient.fetchText(mbasicUrl, {
            cookiePath: options.cookiePath,
            cookieDomain: 'facebook.com',
            signal: options.signal,
            retries: 1,
            timeoutMs: 5000,
            headers: {
              'Referer': 'https://mbasic.facebook.com/',
            },
          })
          const mbasicItems = extractFacebookMediaFromHtml(mbasicHtml, username)
          if (mbasicItems.length > 0 || mbasicHtml.length > 200) {
            html = mbasicHtml
            currentUrl = mbasicUrl
            initialItems = mbasicItems
          }
        } catch {
          // Fall through to m.facebook.com
        }

        if (initialItems.length === 0) {
          try {
            const mobileHtml = await this.httpClient.fetchText(mobileUrl, {
              cookiePath: options.cookiePath,
              cookieDomain: 'facebook.com',
              signal: options.signal,
              retries: 0,
              timeoutMs: 5000,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://m.facebook.com/',
              },
            })
            const mobileItems = extractFacebookMediaFromHtml(mobileHtml, username)
            if (mobileItems.length > 0) {
              html = mobileHtml
              currentUrl = mobileUrl
              initialItems = mobileItems
            }
          } catch {
            // Fallbacks exhausted
          }
        }
      }

      let page = 1
      const maxPages = options.limit ? Math.max(10, Math.ceil(options.limit / 5) + 5) : 500

      while (true) {
        const items = extractFacebookMediaFromHtml(html, username, counters)
        let pageNewCount = 0

        for (const item of items) {
          if (subDir === 'Photos' && item.type !== 'photo') continue
          if (subDir === 'Videos' && item.type !== 'video') continue
          if (seenUrls.has(item.url)) continue

          seenUrls.add(item.url)
          found++
          pageNewCount++
          options.onProgress?.({
            stage: subDir === 'All' ? (targetPath === 'photos' ? 'Photos' : 'Videos') : subDir,
            found,
            message: `Found item: ${item.filename}`,
          })
          yield item
        }

        if (page >= maxPages || options.signal?.aborted) {
          break
        }

        const nextUrl = extractFacebookNextPageUrl(html, currentUrl)
        if (!nextUrl || nextUrl === currentUrl) {
          break
        }

        if (pageNewCount === 0 && page > 1) {
          break
        }

        if (!isTest) {
          await sleep(1000, 2000, options.signal)
        }

        try {
          currentUrl = nextUrl
          html = await this.httpClient.fetchText(currentUrl, {
            cookiePath: options.cookiePath,
            cookieDomain: 'facebook.com',
            signal: options.signal,
            retries: 1,
            timeoutMs: 5000,
            headers: {
              'Referer': currentUrl.includes('mbasic') ? 'https://mbasic.facebook.com/' : 'https://www.facebook.com/',
            },
          })
          page++
        } catch {
          break
        }
      }
    }
  }
}

