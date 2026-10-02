import {HttpClient, sleep} from './http.js'
import type {Extractor, ExtractOptions, MediaItem} from './types.js'
import type {ParsedProfile} from '../../parser.js'

export const IG_APP_ID = '936619743392459'
export const IG_TIMELINE_QUERY_HASH = '69cba40317214236af40e7efa697781d'
export const IG_POLARIS_DOC_ID = '28975909992013618'

export interface IgUser {
  id: string
  username: string
  full_name?: string
  edge_owner_to_timeline_media?: {
    count?: number
    edges: Array<{node: IgMediaNode}>
    page_info?: {has_next_page: boolean; end_cursor?: string}
  }
  edge_felix_video_timeline?: {
    count?: number
    edges: Array<{node: IgMediaNode}>
  }
}

export interface IgMediaNode {
  id: string
  shortcode?: string
  is_video?: boolean
  display_url?: string
  video_url?: string
  taken_at_timestamp?: number
  edge_sidecar_to_children?: {
    edges: Array<{node: IgMediaNode}>
  }
  video_versions?: Array<{
    url?: string
    width?: number
    height?: number
  }>
  image_versions2?: {
    candidates?: Array<{
      url?: string
      width?: number
      height?: number
    }>
  }
  dimensions?: {
    width?: number
    height?: number
  }
}

export function parseIgNodeToMediaItems(node: IgMediaNode, username: string): MediaItem[] {
  const items: MediaItem[] = []
  const anyNode = node as any
  const baseId = node.shortcode || node.id || anyNode.pk
  const date = node.taken_at_timestamp || anyNode.taken_at

  // Handle carousel / sidecar posts (GraphQL edge_sidecar_to_children or REST carousel_media)
  const childrenEdges = node.edge_sidecar_to_children?.edges
  const carouselMedia = anyNode.carousel_media
  const childrenList: IgMediaNode[] = childrenEdges
    ? childrenEdges.map(e => e.node)
    : Array.isArray(carouselMedia)
      ? carouselMedia
      : []

  if (childrenList.length > 0) {
    childrenList.forEach((childNode, index) => {
      const subItems = parseIgNodeToMediaItems(childNode, username)
      for (const item of subItems) {
        item.id = `${baseId}_${index + 1}`
        item.filename = `${username}_${date || baseId}_${index + 1}`
        items.push(item)
      }
    })
    return items
  }

  // Check if video
  const isVideo = Boolean(node.is_video || node.video_url || (node.video_versions && node.video_versions.length > 0))

  if (isVideo) {
    const video = node.video_versions?.[0]
    const videoUrl = node.video_url || video?.url
    if (videoUrl) {
      items.push({
        id: baseId,
        url: videoUrl,
        filename: `${username}_${date || baseId}`,
        extension: 'mp4',
        type: 'video',
        date,
        width: video?.width ?? node.dimensions?.width,
        height: video?.height ?? node.dimensions?.height,
        thumbnailUrl: node.display_url,
      })
    }
  } else {
    // Photo
    const candidate = node.image_versions2?.candidates?.[0]
    const photoUrl = candidate?.url || node.display_url
    if (photoUrl) {
      items.push({
        id: baseId,
        url: photoUrl,
        filename: `${username}_${date || baseId}`,
        extension: 'jpg',
        type: 'photo',
        date,
        width: candidate?.width ?? node.dimensions?.width,
        height: candidate?.height ?? node.dimensions?.height,
      })
    }
  }

  return items
}

export function parseReelItemToMediaItem(item: any, username: string): MediaItem | null {
  const id = item.id || item.pk || String(Date.now())
  const date = item.taken_at || item.created_at
  const isVideo = item.media_type === 2 || Boolean(item.video_versions && item.video_versions.length > 0)

  if (isVideo) {
    const video = item.video_versions?.[0]
    const videoUrl = video?.url
    if (!videoUrl) return null

    return {
      id,
      url: videoUrl,
      filename: `${username}_${date || id}`,
      extension: 'mp4',
      type: 'video',
      date,
      width: video?.width ?? item.original_width,
      height: video?.height ?? item.original_height,
      thumbnailUrl: item.image_versions2?.candidates?.[0]?.url,
    }
  } else {
    const candidate = item.image_versions2?.candidates?.[0]
    const photoUrl = candidate?.url
    if (!photoUrl) return null

    return {
      id,
      url: photoUrl,
      filename: `${username}_${date || id}`,
      extension: 'jpg',
      type: 'photo',
      date,
      width: candidate?.width ?? item.original_width,
      height: candidate?.height ?? item.original_height,
    }
  }
}

export class InstagramExtractor implements Extractor {
  platform = 'instagram' as const
  private httpClient: HttpClient

  constructor(httpClient?: HttpClient) {
    this.httpClient = httpClient ?? new HttpClient({
      'X-IG-App-ID': IG_APP_ID,
      'Referer': 'https://www.instagram.com/',
    })
  }

  async fetchUserProfile(username: string, options: ExtractOptions): Promise<IgUser> {
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
    const res = await this.httpClient.fetchJson<{data?: {user?: IgUser}}>(url, {
      cookiePath: options.cookiePath,
      cookieDomain: 'instagram.com',
      signal: options.signal,
      headers: {
        'X-IG-App-ID': IG_APP_ID,
        'Referer': `https://www.instagram.com/${username}/`,
      },
    })

    if (!res.data?.user) {
      throw new Error(`Instagram user not found or private profile: ${username}`)
    }

    return res.data.user
  }

  async fetchHighlightsTray(userId: string, options: ExtractOptions): Promise<any[]> {
    const url = `https://www.instagram.com/api/v1/highlights/${userId}/highlights_tray/`
    try {
      const res = await this.httpClient.fetchJson<{tray?: any[]}>(url, {
        cookiePath: options.cookiePath,
        cookieDomain: 'instagram.com',
        signal: options.signal,
        headers: {
          'X-IG-App-ID': IG_APP_ID,
        },
      })
      return res.tray ?? []
    } catch {
      return []
    }
  }

  async fetchReelsMedia(reelIds: string[], options: ExtractOptions): Promise<any[]> {
    if (reelIds.length === 0) return []
    const idsParam = reelIds.join(',')
    const url = `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(idsParam)}`

    try {
      const res = await this.httpClient.fetchJson<{reels_media?: any[]; reels?: Record<string, any>}>(url, {
        cookiePath: options.cookiePath,
        cookieDomain: 'instagram.com',
        signal: options.signal,
        headers: {
          'X-IG-App-ID': IG_APP_ID,
        },
      })

      if (res.reels_media) return res.reels_media
      if (res.reels) return Object.values(res.reels)
      return []
    } catch {
      return []
    }
  }

  async fetchNextPostsPage(
    userId: string,
    username: string,
    cursor: string,
    options: ExtractOptions,
  ): Promise<{edges: Array<{node: IgMediaNode}>; hasNextPage: boolean; nextCursor?: string}> {
    // 1. Try GraphQL query endpoint with query_hash
    const variables = JSON.stringify({id: userId, first: 12, after: cursor})
    const url = `https://www.instagram.com/graphql/query/?query_hash=${IG_TIMELINE_QUERY_HASH}&variables=${encodeURIComponent(variables)}`

    try {
      const res = await this.httpClient.fetchJson<any>(url, {
        cookiePath: options.cookiePath,
        cookieDomain: 'instagram.com',
        signal: options.signal,
        headers: {
          'X-IG-App-ID': IG_APP_ID,
          'Referer': `https://www.instagram.com/${username}/`,
        },
      })

      const data = res?.data?.user?.edge_owner_to_timeline_media
      if (data?.edges && data.edges.length > 0) {
        return {
          edges: data.edges,
          hasNextPage: Boolean(data.page_info?.has_next_page),
          nextCursor: data.page_info?.end_cursor,
        }
      }
    } catch {}

    // 2. Try POST with doc_id PolarisProfilePostsTabContentQuery_connection
    try {
      const postVariables = JSON.stringify({
        after: cursor,
        first: 12,
        username,
        data: {count: 12},
      })
      const postUrl = 'https://www.instagram.com/graphql/query'
      const body = new URLSearchParams({
        doc_id: IG_POLARIS_DOC_ID,
        variables: postVariables,
      }).toString()

      const res = await this.httpClient.fetchJson<any>(postUrl, {
        method: 'POST',
        body,
        cookiePath: options.cookiePath,
        cookieDomain: 'instagram.com',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-IG-App-ID': IG_APP_ID,
          'X-FB-Friendly-Name': 'PolarisProfilePostsTabContentQuery_connection',
          'Referer': `https://www.instagram.com/${username}/`,
        },
      })

      const connection =
        res?.data?.xdt_api__v1__feed__user_timeline_graphql_connection ||
        res?.data?.user?.edge_owner_to_timeline_media
      if (connection?.edges && connection.edges.length > 0) {
        return {
          edges: connection.edges,
          hasNextPage: Boolean(connection.page_info?.has_next_page),
          nextCursor: connection.page_info?.end_cursor,
        }
      }
    } catch {}

    // 3. Try v1 user feed REST endpoint
    try {
      const restUrl = `https://www.instagram.com/api/v1/feed/user/${userId}/?count=12&max_id=${encodeURIComponent(cursor)}`
      const res = await this.httpClient.fetchJson<any>(restUrl, {
        cookiePath: options.cookiePath,
        cookieDomain: 'instagram.com',
        signal: options.signal,
        headers: {
          'X-IG-App-ID': IG_APP_ID,
          'Referer': `https://www.instagram.com/${username}/`,
        },
      })

      if (Array.isArray(res?.items) && res.items.length > 0) {
        const edges = res.items.map((item: any) => ({node: item}))
        return {
          edges,
          hasNextPage: Boolean(res.more_available),
          nextCursor: res.next_max_id ? String(res.next_max_id) : undefined,
        }
      }
    } catch {}

    return {edges: [], hasNextPage: false}
  }

  async *extract(profile: ParsedProfile, options: ExtractOptions): AsyncGenerator<MediaItem, void, unknown> {
    const username = profile.username
    const subDir = options.subDir

    options.onProgress?.({
      stage: 'Profile',
      found: 0,
      message: `Fetching Instagram profile @${username}...`,
    })

    const user = await this.fetchUserProfile(username, options)
    const userId = user.id

    // 1. Stories
    if (subDir === 'Stories') {
      options.onProgress?.({
        stage: 'Stories',
        found: 0,
        message: `Fetching stories for @${username}...`,
      })
      const reels = await this.fetchReelsMedia([userId], options)
      for (const reel of reels) {
        for (const rawItem of reel.items || []) {
          const item = parseReelItemToMediaItem(rawItem, username)
          if (item) yield item
        }
      }
      return
    }

    // 2. Highlights
    if (subDir === 'Highlights') {
      options.onProgress?.({
        stage: 'Highlights',
        found: 0,
        message: `Fetching highlights tray for @${username}...`,
      })
      const tray = await this.fetchHighlightsTray(userId, options)
      const highlightIds = tray.map(t => t.id).filter(Boolean)

      if (highlightIds.length > 0) {
        // Chunk into groups of 5 to avoid query size limits
        const chunkSize = 5
        for (let i = 0; i < highlightIds.length; i += chunkSize) {
          if (options.signal?.aborted) break
          const chunk = highlightIds.slice(i, i + chunkSize)
          const reels = await this.fetchReelsMedia(chunk, options)
          for (const reel of reels) {
            for (const rawItem of reel.items || []) {
              const item = parseReelItemToMediaItem(rawItem, username)
              if (item) yield item
            }
          }
          await sleep(1000, 1500, options.signal)
        }
      }
      return
    }

    // 3. Posts & Videos (Timeline and Reels with pagination loop)
    let found = 0

    // Timeline Media with pagination
    let currentEdges = user.edge_owner_to_timeline_media?.edges ?? []
    let hasNextPage = Boolean(user.edge_owner_to_timeline_media?.page_info?.has_next_page)
    let endCursor = user.edge_owner_to_timeline_media?.page_info?.end_cursor

    while (true) {
      for (const edge of currentEdges) {
        const items = parseIgNodeToMediaItems(edge.node, username)
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

      if (!hasNextPage || !endCursor || options.signal?.aborted) {
        break
      }

      await sleep(1500, 2500, options.signal)

      try {
        const nextPage = await this.fetchNextPostsPage(userId, username, endCursor, options)
        currentEdges = nextPage.edges
        hasNextPage = nextPage.hasNextPage
        endCursor = nextPage.nextCursor
        if (currentEdges.length === 0) {
          break
        }
      } catch {
        break
      }
    }

    // Felix / Reels timeline
    if (subDir === 'Videos') {
      const videoEdges = user.edge_felix_video_timeline?.edges ?? []
      for (const edge of videoEdges) {
        const items = parseIgNodeToMediaItems(edge.node, username)
        for (const item of items) {
          if (item.type !== 'video') continue
          found++
          options.onProgress?.({
            stage: 'Videos',
            found,
            message: `Found reel: ${item.filename}`,
          })
          yield item
        }
      }
    }
  }
}
