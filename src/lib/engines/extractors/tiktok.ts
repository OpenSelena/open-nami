import crypto from 'node:crypto'
import {HttpClient, sleep} from './http.js'
import type {Extractor, ExtractOptions, MediaItem} from './types.js'
import type {ParsedProfile} from '../../parser.js'

export function solveTikTokWafChallenge(html: string): {name: string; value: string}[] | null {
  const csMatch = html.match(/id=["']cs["']\s+class=["']([^"']+)["']/)
  const wciMatch = html.match(/id=["']wci["']\s+class=["']([^"']+)["']/)
  const rciMatch = html.match(/id=["']rci["']\s+class=["']([^"']+)["']/)
  const rsMatch = html.match(/id=["']rs["']\s+class=["']([^"']+)["']/)
  if (!csMatch || !csMatch[1]) return null

  const cs = csMatch[1]
  const wci = wciMatch?.[1] || '_wafchallengeid'
  const rci = rciMatch?.[1] || ''
  const rs = rsMatch?.[1] || ''

  try {
    const pad = (4 - (cs.length % 4)) % 4
    const c = JSON.parse(Buffer.from(cs + '='.repeat(pad), 'base64').toString('utf8'))
    const cVal = c?.v
    if (!cVal?.a || !cVal?.c) return null

    const padA = (4 - (cVal.a.length % 4)) % 4
    const padC = (4 - (cVal.c.length % 4)) % 4
    const baseBuf = Buffer.from(cVal.a + '='.repeat(padA), 'base64')
    const expected = Buffer.from(cVal.c + '='.repeat(padC), 'base64')

    let foundIdx = -1
    for (let idx = 0; idx < 1000000; idx++) {
      const h = crypto.createHash('sha256').update(baseBuf).update(String(idx)).digest()
      if (h.equals(expected)) {
        foundIdx = idx
        break
      }
    }
    if (foundIdx === -1) return null

    c.d = Buffer.from(String(foundIdx)).toString('base64')
    const v = Buffer.from(JSON.stringify(c)).toString('base64')
    const cookies = [{name: wci, value: v}]
    if (rs && rci) {
      cookies.push({name: rci, value: rs})
    }
    return cookies
  } catch {
    return null
  }
}

export function parseTikTokRehydrationJson(html: string): any {
  // Pattern 1: Modern __UNIVERSAL_DATA_FOR_REHYDRATION__
  const universalMatch = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  )
  if (universalMatch) {
    try {
      const raw = JSON.parse(universalMatch[1])
      const scope = raw?.['__DEFAULT_SCOPE__'] || raw
      if (scope) return scope
    } catch {}
  }

  // Pattern 2: SIGI_STATE script tag
  const sigiTagMatch = html.match(
    /<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
  )
  if (sigiTagMatch) {
    try {
      const raw = JSON.parse(sigiTagMatch[1])
      const user = Object.values(raw?.UserModule?.users || {})[0] as any
      const items = Object.values(raw?.ItemModule || {}) as any[]
      return {
        'webapp.user-detail': {
          userInfo: { user },
          itemList: items,
        },
        SIGI_STATE: raw,
      }
    } catch {}
  }

  // Pattern 3: window['SIGI_STATE'] assignment
  const sigiWindowMatch = html.match(
    /(?:window\[['"]SIGI_STATE['"]\]|SIGI_STATE)\s*=\s*(\{[\s\S]*?\})\s*;/i,
  )
  if (sigiWindowMatch) {
    try {
      const raw = JSON.parse(sigiWindowMatch[1])
      const user = Object.values(raw?.UserModule?.users || {})[0] as any
      const items = Object.values(raw?.ItemModule || {}) as any[]
      return {
        'webapp.user-detail': {
          userInfo: { user },
          itemList: items,
        },
        SIGI_STATE: raw,
      }
    } catch {}
  }

  // Pattern 4: __NEXT_DATA__ script tag
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )
  if (nextDataMatch) {
    try {
      const raw = JSON.parse(nextDataMatch[1])
      const pageProps = raw?.props?.pageProps
      if (pageProps) {
        return {
          'webapp.user-detail': {
            userInfo: pageProps.userInfo,
            itemList: pageProps.items || pageProps.itemList || [],
          },
          __NEXT_DATA__: raw,
        }
      }
    } catch {}
  }

  // Pattern 5: Direct SecUid fallback regex
  const secUidMatch = html.match(/(?:secUid|sec_uid)["':=\s]+(MS4wLjABAAAA[\w-]{32,64})/i)
  if (secUidMatch) {
    return {
      'webapp.user-detail': {
        userInfo: {
          user: {
            secUid: secUidMatch[1],
          },
        },
        itemList: [],
      },
    }
  }

  return null
}

export function parseTikTokItem(item: any, username: string): MediaItem[] {
  const items: MediaItem[] = []
  const id = item.id || item.itemId || String(Date.now())
  const date = Number(item.createTime) || undefined
  const caption = item.desc

  const imageList = item.imagePost?.images
  if (Array.isArray(imageList) && imageList.length > 0) {
    imageList.forEach((img: any, idx: number) => {
      const imgUrl = img.imageURL?.urlList?.[0] || img.displayImage?.urlList?.[0]
      if (imgUrl) {
        items.push({
          id: `${id}_${idx + 1}`,
          url: imgUrl,
          filename: `${username}_${date ? `${date}_` : ''}${id}_${idx + 1}`,
          extension: 'jpg',
          type: 'photo',
          caption,
          date,
          author: username,
          platform: 'tiktok',
          carouselId: id,
          carouselIndex: idx + 1,
          carouselTotal: imageList.length,
        })
      }
    })
    return items
  }

  const video = item.video
  const videoUrl = video?.playAddr || video?.downloadAddr
  if (videoUrl) {
    items.push({
      id,
      url: videoUrl,
      filename: `${username}_${date ? `${date}_` : ''}${id}`,
      extension: 'mp4',
      type: 'video',
      caption,
      date,
      width: video?.width,
      height: video?.height,
      thumbnailUrl: video?.cover || video?.originCover,
      author: username,
      platform: 'tiktok',
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
    let html = await this.httpClient.fetchText(profileUrl, {
      cookiePath: options.cookiePath,
      cookieDomain: 'tiktok.com',
      signal: options.signal,
      retries: 0,
      timeoutMs: 4000,
    })

    const challengeCookies = solveTikTokWafChallenge(html)
    if (challengeCookies) {
      for (const cookie of challengeCookies) {
        this.httpClient.setCookie(cookie.name, cookie.value)
      }
      try {
        html = await this.httpClient.fetchText(profileUrl, {
          cookiePath: options.cookiePath,
          cookieDomain: 'tiktok.com',
          signal: options.signal,
          retries: 0,
          timeoutMs: 4000,
        })
      } catch {}
    }

    const scope = parseTikTokRehydrationJson(html)
    const userDetail = scope?.['webapp.user-detail']
    const userInfo = userDetail?.userInfo?.user
    const secUid = userInfo?.secUid

    let found = 0
    const emittedItemIds = new Set<string>()

    // Initial SSR hydration items
    const initialItems = userDetail?.itemList || []
    for (const rawItem of initialItems) {
      const mediaList = parseTikTokItem(rawItem, cleanUsername)
      for (const item of mediaList) {
        if (subDir === 'Photos' && item.type !== 'photo') continue
        if (subDir === 'Videos' && item.type !== 'video') continue
        if (emittedItemIds.has(item.id)) continue

        if (options.until !== undefined && item.date && item.date > options.until) continue
        if (options.since !== undefined && item.date && item.date < options.since) continue

        emittedItemIds.add(item.id)
        found++
        options.onProgress?.({
          stage: subDir,
          found,
          message: `Found item: ${item.filename}`,
        })
        yield item

        if (options.limit !== undefined && found >= options.limit) return
      }
    }

    if (!secUid) {
      return
    }

    // Paginated posts via creator/item_list and post/item_list endpoints
    let cursor = options.initialCursor || '0'
    let hasMore = true
    const visitedCursors = new Set<string>()

    const isTest =
      process.env.NODE_ENV === 'test' ||
      Boolean(process.env.NODE_TEST_CONTEXT) ||
      process.execArgv.some(a => a.includes('test'))

    while (hasMore) {
      if (options.signal?.aborted) break
      if (visitedCursors.has(cursor)) break
      visitedCursors.add(cursor)

      const deviceId = `${Math.floor(7250000000000000000 + Math.random() * 75000000000000000)}`
      const creatorParams = new URLSearchParams({
        aid: '1988',
        app_language: 'en',
        app_name: 'tiktok_web',
        browser_language: 'en-US',
        browser_name: 'Mozilla',
        browser_online: 'true',
        browser_platform: 'Win32',
        browser_version: '5.0 (Windows)',
        channel: 'tiktok_web',
        cookie_enabled: 'true',
        device_id: deviceId,
        device_platform: 'web_pc',
        focus_state: 'true',
        from_page: 'user',
        history_len: '2',
        is_fullscreen: 'false',
        is_page_visible: 'true',
        language: 'en',
        os: 'windows',
        region: 'US',
        screen_height: '1080',
        screen_width: '1920',
        tz_name: 'UTC',
        secUid,
        type: '1',
        count: '30',
        cursor: cursor === '0' ? String(Date.now() * 1000) : cursor,
      })
      const creatorUrl = `https://www.tiktok.com/api/creator/item_list/?${creatorParams.toString()}`

      let res: any
      try {
        res = await this.httpClient.fetchJson<any>(creatorUrl, {
          cookiePath: options.cookiePath,
          cookieDomain: 'tiktok.com',
          signal: options.signal,
          headers: {
            'Referer': profileUrl,
          },
        })
      } catch {}

      let items: any[] = res?.itemList || []
      let nextCursor = ''

      if (items.length > 0) {
        const lastItem = items[items.length - 1]
        if (lastItem?.createTime) {
          nextCursor = String(Number(lastItem.createTime) * 1000)
        }
        hasMore = Boolean(res?.hasMorePrevious ?? res?.hasMore) && Boolean(nextCursor) && nextCursor !== cursor
      } else {
        const postParams = new URLSearchParams({
          aid: '1988',
          app_name: 'tiktok_web',
          device_platform: 'web_pc',
          channel: 'tiktok_web',
          device_id: deviceId,
          secUid,
          count: '30',
          cursor,
          post_item_list_request_type: '0',
        })
        const postUrl = `https://www.tiktok.com/api/post/item_list/?${postParams.toString()}`
        try {
          const postRes = await this.httpClient.fetchJson<any>(postUrl, {
            cookiePath: options.cookiePath,
            cookieDomain: 'tiktok.com',
            signal: options.signal,
            headers: {
              'Referer': profileUrl,
            },
          })
          items = postRes?.itemList || []
          hasMore = Boolean(postRes?.hasMore)
          nextCursor = String(postRes?.cursor ?? '0')
        } catch {
          break
        }
      }

      if (items.length === 0) break

      let reachedSinceLimit = false
      for (const rawItem of items) {
        const mediaList = parseTikTokItem(rawItem, cleanUsername)
        for (const item of mediaList) {
          if (subDir === 'Photos' && item.type !== 'photo') continue
          if (subDir === 'Videos' && item.type !== 'video') continue
          if (emittedItemIds.has(item.id)) continue

          if (options.until !== undefined && item.date && item.date > options.until) continue
          if (options.since !== undefined && item.date && item.date < options.since) {
            reachedSinceLimit = true
            break
          }

          emittedItemIds.add(item.id)
          found++
          options.onProgress?.({
            stage: subDir,
            found,
            message: `Found item: ${item.filename}`,
          })
          yield item

          if (options.limit !== undefined && found >= options.limit) return
        }
        if (reachedSinceLimit) break
      }

      if (reachedSinceLimit) break

      cursor = nextCursor || '0'
      if (hasMore && cursor && cursor !== '0') {
        options.onCheckpoint?.('timeline', cursor)
      } else {
        options.onCheckpoint?.('timeline', '')
      }

      if (!isTest) {
        await sleep(1000, 2000, options.signal)
      }
    }
  }
}
