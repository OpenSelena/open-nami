import {HttpClient, sleep} from './http.js'
import type {Extractor, ExtractOptions, MediaItem} from './types.js'
import type {ParsedProfile} from '../../parser.js'

export const TWITTER_BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'

export const TWITTER_FEATURES = {
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  tweetypie_unmention_optimization_enabled: true,
  vibe_api_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  interactive_text_enabled: true,
  responsive_web_text_conversations_enabled: false,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
}

export interface TwitterMediaVariant {
  bitrate?: number
  content_type?: string
  url: string
}

export interface TwitterMediaEntity {
  id_str: string
  type: 'photo' | 'video' | 'animated_gif'
  media_url_https: string
  original_info?: {width?: number; height?: number}
  video_info?: {
    aspect_ratio?: number[]
    duration_millis?: number
    variants: TwitterMediaVariant[]
  }
}

export function parseTweetMediaEntities(
  tweet: any,
  username: string,
): MediaItem[] {
  const items: MediaItem[] = []
  const tweetResult = tweet.tweet || tweet
  const legacy = tweetResult.legacy || tweetResult
  const entities = legacy.extended_entities?.media || legacy.entities?.media || []
  const tweetId = tweetResult.rest_id || legacy.id_str || String(Date.now())
  const rawDate = legacy.created_at ? new Date(legacy.created_at).getTime() / 1000 : undefined

  for (let idx = 0; idx < entities.length; idx++) {
    const media: TwitterMediaEntity = entities[idx]
    const subIndex = idx + 1
    const baseFilename = `${username}_${tweetId}_${subIndex}`

    if (media.type === 'video' || media.type === 'animated_gif') {
      const variants = (media.video_info?.variants || [])
        .filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))

      const bestVariant = variants[0]
      if (bestVariant?.url) {
        items.push({
          id: `${tweetId}_${media.id_str}`,
          url: bestVariant.url,
          filename: baseFilename,
          extension: 'mp4',
          type: 'video',
          date: rawDate,
          thumbnailUrl: media.media_url_https,
        })
      }
    } else {
      // Photo
      let photoUrl = media.media_url_https
      if (photoUrl) {
        // Strip query params and request original quality
        const cleanUrl = photoUrl.replace(/:[a-zA-Z]+$/, '')
        const urlWithOrig = cleanUrl.includes('?') ? `${cleanUrl}&name=orig` : `${cleanUrl}?name=orig`
        const extMatch = photoUrl.match(/\.([a-zA-Z0-9]+)(?:$|\?)/)
        const ext = extMatch ? extMatch[1] : 'jpg'

        items.push({
          id: `${tweetId}_${media.id_str}`,
          url: urlWithOrig,
          filename: baseFilename,
          extension: ext,
          type: 'photo',
          date: rawDate,
          width: media.original_info?.width,
          height: media.original_info?.height,
        })
      }
    }
  }

  return items
}

export class XExtractor implements Extractor {
  platform = 'x' as const
  private httpClient: HttpClient
  private guestToken?: string

  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
      'Referer': 'https://x.com/',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
    })
  }

  async ensureGuestToken(options: ExtractOptions): Promise<string> {
    if (this.guestToken) return this.guestToken

    try {
      const res = await this.httpClient.fetchJson<{guest_token?: string}>(
        'https://api.twitter.com/1.1/guest/activate.json',
        {
          method: 'POST',
          cookiePath: options.cookiePath,
          cookieDomain: 'x.com',
          signal: options.signal,
          headers: {
            'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
          },
        },
      )
      if (res.guest_token) {
        this.guestToken = res.guest_token
        this.httpClient.setHeader('x-guest-token', res.guest_token)
        return res.guest_token
      }
    } catch (err: unknown) {
      if (options.signal?.aborted) throw err
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to activate X/Twitter guest session: ${msg}`)
    }

    throw new Error('Failed to activate X/Twitter guest session: no guest token returned')
  }

  async fetchUserRestId(username: string, options: ExtractOptions): Promise<string> {
    await this.ensureGuestToken(options)

    const variables = JSON.stringify({
      screen_name: username,
      withSafetyModeUserFields: true,
    })
    const features = JSON.stringify(TWITTER_FEATURES)
    const url = `https://x.com/i/api/graphql/ck5KkZ8t5cOmoLssopN99Q/UserByScreenName?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`

    try {
      const res = await this.httpClient.fetchJson<any>(url, {
        cookiePath: options.cookiePath,
        cookieDomain: 'x.com',
        signal: options.signal,
      })

      const restId = res.data?.user?.result?.rest_id
      if (restId) return restId
    } catch {}

    // Fallback: search profile HTML or syndication
    const syndiUrl = `https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=${encodeURIComponent(username)}`
    try {
      const res = await this.httpClient.fetchJson<any[]>(syndiUrl, {signal: options.signal})
      if (res[0]?.id) return String(res[0].id)
    } catch {}

    throw new Error(`Failed to resolve X/Twitter user ID for @${username}`)
  }

  async *extract(profile: ParsedProfile, options: ExtractOptions): AsyncGenerator<MediaItem, void, unknown> {
    const username = profile.username
    const subDir = options.subDir

    options.onProgress?.({
      stage: 'Profile',
      found: 0,
      message: `Fetching X profile @${username}...`,
    })

    const userId = await this.fetchUserRestId(username, options)

    const endpoint = 'https://x.com/i/api/graphql/jCRhbOzdgOHp6u9H4g2tEg/UserMedia'
    let cursor: string | undefined
    let hasMore = true
    let found = 0

    while (hasMore) {
      if (options.signal?.aborted) break

      const variables: Record<string, any> = {
        userId,
        count: 50,
        includePromotedContent: false,
        withClientEventToken: false,
        withBirdwatchNotes: false,
        withVoice: true,
      }
      if (cursor) {
        variables.cursor = cursor
      }

      const features = JSON.stringify(TWITTER_FEATURES)
      const url = `${endpoint}?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(features)}`

      let res: any
      try {
        res = await this.httpClient.fetchJson<any>(url, {
          cookiePath: options.cookiePath,
          cookieDomain: 'x.com',
          signal: options.signal,
        })
      } catch (err) {
        break
      }

      const instructions = res?.data?.user?.result?.timeline_v2?.timeline?.instructions || []
      let newCursor: string | undefined
      let pageItemCount = 0

      for (const inst of instructions) {
        const entries = inst.entries || (inst.entry ? [inst.entry] : [])
        for (const entry of entries) {
          if (entry.entryId?.startsWith('cursor-bottom-')) {
            newCursor = entry.content?.value
            continue
          }

          const tweetContent = entry.content?.itemContent?.tweet_results?.result
          if (tweetContent) {
            const mediaItems = parseTweetMediaEntities(tweetContent, username)
            for (const item of mediaItems) {
              if (subDir === 'Photos' && item.type !== 'photo') continue
              if (subDir === 'Videos' && item.type !== 'video') continue

              found++
              pageItemCount++
              options.onProgress?.({
                stage: subDir,
                found,
                message: `Found item: ${item.filename}`,
              })
              yield item
            }
          }
        }
      }

      if (!newCursor || newCursor === cursor || pageItemCount === 0) {
        hasMore = false
      } else {
        cursor = newCursor
        await sleep(1500, 2500, options.signal)
      }
    }
  }
}
