import {HttpClient, sleep} from './http.js'
import type {Extractor, ExtractOptions, MediaItem} from './types.js'
import type {ParsedProfile} from '../../parser.js'

export function parseTikTokRehydrationJson(html: string): any {
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  )
  if (!match) return null

  try {
    const raw = JSON.parse(match[1])
    return raw?.['__DEFAULT_SCOPE__']
  } catch {
    return null
  }
}

export function parseTikTokItem(item: any, username: string): MediaItem[] {
  const items: MediaItem[] = []
  const id = item.id || item.itemId || String(Date.now())
  const date = Number(item.createTime) || undefined
  const caption = item.desc

  // 1. Photo posts / carousels
  const imageList = item.imagePost?.images
  if (Array.isArray(imageList) && imageList.length > 0) {
    imageList.forEach((img: any, idx: number) => {
      const imgUrl = img.imageURL?.urlList?.[0] || img.displayImage?.urlList?.[0]
      if (imgUrl) {
        items.push({
          id: `${id}_${idx + 1}`,
          url: imgUrl,
          filename: `${username}_${id}_${idx + 1}`,
          extension: 'jpg',
          type: 'photo',
          caption,
          date,
        })
      }
    })
    return items
  }

  // 2. Video post
  const video = item.video
  const videoUrl = video?.playAddr || video?.downloadAddr
  if (videoUrl) {
    items.push({
      id,
      url: videoUrl,
      filename: `${username}_${id}`,
      extension: 'mp4',
      type: 'video',
      caption,
      date,
      width: video?.width,
      height: video?.height,
      thumbnailUrl: video?.cover || video?.originCover,
    })
  }

  return items
}

export class TikTokExtractor implements Extractor {
  platform = 'tiktok' as const
  private httpClient: HttpClient

  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      'Referer': 'https://www.tiktok.com/',
    })
  }

  async *extract(profile: ParsedProfile, options: ExtractOptions): AsyncGenerator<MediaItem, void, unknown> {
    const cleanUsername = profile.username.replace(/^@/, '')
    const subDir = options.subDir

    options.onProgress?.({
      stage: 'Profile',
      found: 0,
      message: `Fetching TikTok profile @${cleanUsername}...`,
    })

    const profileUrl = `https://www.tiktok.com/@${cleanUsername}`
    const html = await this.httpClient.fetchText(profileUrl, {
      cookiePath: options.cookiePath,
      cookieDomain: 'tiktok.com',
      signal: options.signal,
    })

    const scope = parseTikTokRehydrationJson(html)
    const userDetail = scope?.['webapp.user-detail']
    const userInfo = userDetail?.userInfo?.user
    const secUid = userInfo?.secUid

    let found = 0

    // 1. Yield items present directly in initial SSR hydration
    const initialItems = userDetail?.itemList || []
    for (const rawItem of initialItems) {
      const mediaList = parseTikTokItem(rawItem, cleanUsername)
      for (const item of mediaList) {
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

    if (!secUid) {
      return
    }

    // 2. Fetch paginated posts using item_list API
    let cursor = '0'
    let hasMore = true
    const visitedCursors = new Set<string>()

    while (hasMore) {
      if (options.signal?.aborted) break
      if (visitedCursors.has(cursor)) break
      visitedCursors.add(cursor)

      const apiUrl = `https://www.tiktok.com/api/post/item_list/?secUid=${encodeURIComponent(secUid)}&count=30&cursor=${cursor}&post_item_list_request_type=0`

      let res: any
      try {
        res = await this.httpClient.fetchJson<any>(apiUrl, {
          cookiePath: options.cookiePath,
          cookieDomain: 'tiktok.com',
          signal: options.signal,
        })
      } catch {
        break
      }

      const items = res?.itemList || []
      if (items.length === 0) break

      for (const rawItem of items) {
        const mediaList = parseTikTokItem(rawItem, cleanUsername)
        for (const item of mediaList) {
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

      hasMore = Boolean(res?.hasMore)
      cursor = String(res?.cursor ?? '0')

      await sleep(1000, 2000, options.signal)
    }
  }
}
