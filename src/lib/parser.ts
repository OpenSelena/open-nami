export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'x' | 'unknown'
export type SupportedPlatform = 'instagram' | 'tiktok' | 'facebook' | 'x'

export interface ParsedProfile {
  platform: Platform
  username: string
  cleanUrl: string
  rawInput: string
}

const INVALID_CHARS_REGEX = /[<>:"/\\|?*\x00-\x1f]/g
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

export function sanitizeUsername(username: string): string {
  let cleaned = username.replace(INVALID_CHARS_REGEX, '_').trim().replace(/^[.\s]+|[.\s]+$/g, '')
  if (WINDOWS_RESERVED_NAMES.test(cleaned)) {
    cleaned = `_${cleaned}`
  }
  return cleaned.slice(0, 120) || 'unknown'
}

export function buildProfileUrl(platform: SupportedPlatform, username: string): string {
  const cleanUser = username.trim().replace(/^@/, '').replace(/^[.\s]+|[.\s]+$/g, '')
  switch (platform) {
    case 'instagram':
      return `https://www.instagram.com/${cleanUser}/`
    case 'tiktok':
      return `https://www.tiktok.com/@${cleanUser}`
    case 'facebook':
      return `https://www.facebook.com/${cleanUser}`
    case 'x':
      return `https://x.com/${cleanUser}`
  }
}

export function buildCanonicalProfile(
  platform: SupportedPlatform,
  username: string,
  rawInput?: string,
): ParsedProfile {
  const cleanUser = username.trim().replace(/^@/, '').replace(/^[.\s]+|[.\s]+$/g, '')
  return {
    platform,
    username: sanitizeUsername(cleanUser),
    cleanUrl: buildProfileUrl(platform, cleanUser),
    rawInput: rawInput ?? cleanUser,
  }
}

export function isBareUsername(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false
  if (/^https?:\/\//i.test(trimmed) || /[\/\\:\s]/.test(trimmed)) return false
  const user = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  if (!user) return false
  if (!/^[a-zA-Z0-9._-]+$/.test(user)) return false
  // Must contain at least one alphanumeric character
  if (!/[a-zA-Z0-9]/.test(user)) return false
  const cleaned = user.replace(/^[.\s]+|[.\s]+$/g, '')
  return cleaned.length > 0 && /[a-zA-Z0-9]/.test(cleaned)
}

export function parseProfileInput(input: string): ParsedProfile {
  const trimmed = input.trim()
  if (!trimmed) {
    return { platform: 'unknown', username: '', cleanUrl: '', rawInput: input }
  }

  // Handle prefix shortcuts like "ig:therock", "tt:username", "x:elonmusk", "fb:username"
  const prefixMatch = trimmed.match(/^(ig|instagram|tt|tiktok|fb|facebook|x|twitter):([^\s/]+)$/i)
  if (prefixMatch) {
    const rawPrefix = prefixMatch[1].toLowerCase()
    const rawUser = prefixMatch[2]

    if (rawPrefix === 'ig' || rawPrefix === 'instagram') {
      return buildCanonicalProfile('instagram', rawUser, input)
    } else if (rawPrefix === 'tt' || rawPrefix === 'tiktok') {
      return buildCanonicalProfile('tiktok', rawUser, input)
    } else if (rawPrefix === 'fb' || rawPrefix === 'facebook') {
      return buildCanonicalProfile('facebook', rawUser, input)
    } else if (rawPrefix === 'x' || rawPrefix === 'twitter') {
      return buildCanonicalProfile('x', rawUser, input)
    }
  }

  // Handle URLs
  let candidate = trimmed
  if (!/^https?:\/\//i.test(candidate)) {
    if (candidate.includes('instagram.com') || candidate.includes('tiktok.com') || candidate.includes('facebook.com') || candidate.includes('x.com') || candidate.includes('twitter.com')) {
      candidate = 'https://' + candidate
    }
  }

  try {
    const url = new URL(candidate)
    const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
    const pathname = url.pathname.replace(/\/+$/, '')
    const pathParts = pathname.split('/').filter(Boolean)

    if (host.includes('tiktok.com')) {
      // e.g. /@username, /@username/video/123
      const userPart = pathParts[0] || ''
      const username = userPart.startsWith('@') ? userPart.slice(1) : userPart
      if (username) {
        return {
          platform: 'tiktok',
          username: sanitizeUsername(username),
          cleanUrl: `https://www.tiktok.com/@${username}`,
          rawInput: input,
        }
      }
    }

    if (host.includes('instagram.com')) {
      // e.g. /username, /username/reels
      const firstPart = pathParts[0] || ''
      const reserved = ['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'direct', 'accounts']
      if (firstPart && !reserved.includes(firstPart.toLowerCase())) {
        const username = firstPart.replace(/^@/, '')
        return {
          platform: 'instagram',
          username: sanitizeUsername(username),
          cleanUrl: `https://www.instagram.com/${username}/`,
          rawInput: input,
        }
      }
    }

    if (host.includes('facebook.com') || host === 'fb.com') {
      // e.g. /profile.php?id=123, /people/Name/123, /username
      if (pathParts[0]?.toLowerCase() === 'profile.php') {
        const id = url.searchParams.get('id')
        if (id) {
          return {
            platform: 'facebook',
            username: sanitizeUsername(id),
            cleanUrl: `https://www.facebook.com/profile.php?id=${id}`,
            rawInput: input,
          }
        }
      } else if (pathParts[0]?.toLowerCase() === 'people' && pathParts[1]) {
        return {
          platform: 'facebook',
          username: sanitizeUsername(pathParts[1]),
          cleanUrl: `https://www.facebook.com/people/${pathParts[1]}`,
          rawInput: input,
        }
      } else if (pathParts[0]) {
        const reserved = ['watch', 'videos', 'reel', 'groups', 'pages', 'events', 'photo']
        if (!reserved.includes(pathParts[0].toLowerCase())) {
          return {
            platform: 'facebook',
            username: sanitizeUsername(pathParts[0]),
            cleanUrl: `https://www.facebook.com/${pathParts[0]}`,
            rawInput: input,
          }
        }
      }
    }

    if (host.includes('x.com') || host.includes('twitter.com')) {
      const firstPart = pathParts[0] || ''
      const reserved = ['home', 'explore', 'notifications', 'messages', 'i', 'settings']
      if (firstPart && !reserved.includes(firstPart.toLowerCase())) {
        const username = firstPart.replace(/^@/, '')
        return {
          platform: 'x',
          username: sanitizeUsername(username),
          cleanUrl: `https://x.com/${username}`,
          rawInput: input,
        }
      }
    }
  } catch {
    // Not a valid URL
  }

  // Bare username (e.g. "momo", "@momo")
  if (isBareUsername(trimmed)) {
    const rawUser = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
    const user = rawUser.replace(/^[.\s]+|[.\s]+$/g, '')
    return {
      platform: 'unknown',
      username: user,
      cleanUrl: '',
      rawInput: input,
    }
  }

  return {
    platform: 'unknown',
    username: '',
    cleanUrl: '',
    rawInput: input,
  }
}

