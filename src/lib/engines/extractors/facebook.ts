import {HttpClient, sleep} from './http.js'
import type {Extractor, ExtractOptions, MediaItem} from './types.js'
import type {ParsedProfile} from '../../parser.js'

function decodeEscapedUrl(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`)
  } catch {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\\//g, '/')
  }
}

export function extractFacebookMediaFromHtml(html: string, username: string): MediaItem[] {
  const items: MediaItem[] = []
  const seenUrls = new Set<string>()

  const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/)
  const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/)
  const rawVideoUrl = hdMatch?.[1] || sdMatch?.[1]

  if (rawVideoUrl) {
    const videoUrl = decodeEscapedUrl(rawVideoUrl)
    if (!seenUrls.has(videoUrl)) {
      seenUrls.add(videoUrl)
      items.push({
        id: `fb_video_${Date.now()}`,
        url: videoUrl,
        filename: `${username}_video_${Date.now()}`,
        extension: 'mp4',
        type: 'video',
      })
    }
  }

  const photoRegex = /,"image":\{"uri":"([^"]+)"/g
  let match: RegExpExecArray | null
  let photoIndex = 1

  while ((match = photoRegex.exec(html)) !== null) {
    const rawUrl = match[1]
    const photoUrl = decodeEscapedUrl(rawUrl)
    if (!seenUrls.has(photoUrl)) {
      seenUrls.add(photoUrl)
      items.push({
        id: `fb_photo_${photoIndex}`,
        url: photoUrl,
        filename: `${username}_photo_${photoIndex}`,
        extension: 'jpg',
        type: 'photo',
      })
      photoIndex++
    }
  }

  // Fallback: scontent photo links in HTML
  if (items.length === 0) {
    const scontentRegex = /https:\/\/[^"'\s]*scontent[^"'\s]*\.(?:jpg|png|webp)[^"'\s]*/gi
    let sMatch: RegExpExecArray | null
    while ((sMatch = scontentRegex.exec(html)) !== null) {
      const cleanUrl = sMatch[0].replace(/\\/g, '')
      if (!seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl)
        items.push({
          id: `fb_photo_${photoIndex}`,
          url: cleanUrl,
          filename: `${username}_photo_${photoIndex}`,
          extension: 'jpg',
          type: 'photo',
        })
        photoIndex++
      }
    }
  }

  return items
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

    const targetUrl = subDir === 'Photos'
      ? `https://www.facebook.com/${encodeURIComponent(username)}/photos`
      : `https://www.facebook.com/${encodeURIComponent(username)}/videos`

    const html = await this.httpClient.fetchText(targetUrl, {
      cookiePath: options.cookiePath,
      cookieDomain: 'facebook.com',
      signal: options.signal,
      retries: 0,
      timeoutMs: 4000,
    })

    const items = extractFacebookMediaFromHtml(html, username)
    let found = 0

    for (const item of items) {
      if (subDir === 'Photos' && item.type !== 'photo') continue
      if (subDir === 'Videos' && item.type !== 'video') continue

      found++
      options.onProgress?.({
        stage: subDir,
        found,
        message: `Found item: ${item.filename}`,
      })
      yield item
    }
  }
}
