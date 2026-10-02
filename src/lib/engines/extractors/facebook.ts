import {HttpClient, sleep} from './http.js'
import type {Extractor, ExtractOptions, MediaItem} from './types.js'
import type {ParsedProfile} from '../../parser.js'

export function extractFacebookMediaFromHtml(html: string, username: string): MediaItem[] {
  const items: MediaItem[] = []
  const seenUrls = new Set<string>()

  // 1. HD or SD Video URLs
  const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/)
  const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/)
  const rawVideoUrl = hdMatch?.[1] || sdMatch?.[1]

  if (rawVideoUrl) {
    try {
      const videoUrl = JSON.parse(`"${rawVideoUrl}"`)
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
    } catch {}
  }

  // 2. High-res Photo URLs
  // Pattern: ,"image":{"uri":"https:\/\/scontent...
  const photoRegex = /,"image":\{"uri":"([^"]+)"/g
  let match: RegExpExecArray | null
  let photoIndex = 1

  while ((match = photoRegex.exec(html)) !== null) {
    try {
      const rawUrl = match[1]
      const photoUrl = JSON.parse(`"${rawUrl}"`)
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
    } catch {}
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
