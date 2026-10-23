import type {MediaItem} from './extractors/types.js'

export interface MediaFilterOptions {
  since?: number // Unix timestamp (seconds)
  until?: number // Unix timestamp (seconds)
  limit?: number // Max total items
  reverseChronological?: boolean // Defaults to true for social feeds
}

/**
 * Parses user-provided date representations (ISO-8601, YYYY-MM-DD, YYYYMMDD, relative, unix timestamps)
 * into a Unix epoch timestamp in seconds.
 * 
 * - For 'since', '2024-05-01' becomes 2024-05-01T00:00:00.000Z
 * - For 'until', '2024-05-01' becomes 2024-05-01T23:59:59.999Z
 */
export function parseDateBoundary(
  input: string | number | Date | undefined,
  boundary: 'since' | 'until',
): number | undefined {
  if (input === undefined || input === null) return undefined

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return undefined
    return Math.floor(input.getTime() / 1000)
  }

  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return undefined
    // If it looks like milliseconds (greater than year 2100 in seconds, ~4.1e9)
    if (input > 4e9) {
      return Math.floor(input / 1000)
    }
    return Math.floor(input)
  }

  const trimmed = input.trim()
  if (!trimmed) return undefined

  // Relative format: e.g. "7d", "24h", "30d", "1y"
  const relMatch = trimmed.match(/^(\d+)\s*(s|m|h|d|w|y)$/i)
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10)
    const unit = relMatch[2].toLowerCase()
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
      y: 31536000,
    }
    const offsetSeconds = amount * (multipliers[unit] ?? 86400)
    const nowSeconds = Math.floor(Date.now() / 1000)
    return nowSeconds - offsetSeconds
  }

  // Pure numeric string
  if (/^\d+$/.test(trimmed)) {
    // 4-digit year: YYYY (e.g. 2021, 2022)
    if (trimmed.length === 4) {
      const year = parseInt(trimmed, 10)
      if (year >= 1990 && year <= 2100) {
        const date = boundary === 'until'
          ? new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
          : new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
        if (!isNaN(date.getTime())) {
          return Math.floor(date.getTime() / 1000)
        }
      }
    }

    // 8-digit compact date: YYYYMMDD
    if (trimmed.length === 8) {
      const year = parseInt(trimmed.slice(0, 4), 10)
      const month = parseInt(trimmed.slice(4, 6), 10) - 1
      const day = parseInt(trimmed.slice(6, 8), 10)
      const date = new Date(Date.UTC(year, month, day, boundary === 'until' ? 23 : 0, boundary === 'until' ? 59 : 0, boundary === 'until' ? 59 : 0))
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000)
      }
    }

    const num = parseInt(trimmed, 10)
    if (num > 4e9) {
      return Math.floor(num / 1000)
    }
    return num
  }

  // Year + Month string: YYYY-MM (e.g. "2021-05")
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const year = parseInt(trimmed.slice(0, 4), 10)
    const month = parseInt(trimmed.slice(5, 7), 10)
    const date = boundary === 'until'
      ? new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
      : new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000)
    }
  }

  // Standard date strings: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  // If it's a date without time (e.g. "2024-05-01"), handle boundary
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const timeStr = boundary === 'until' ? 'T23:59:59.999Z' : 'T00:00:00.000Z'
    const parsed = new Date(`${trimmed}${timeStr}`)
    if (!isNaN(parsed.getTime())) {
      return Math.floor(parsed.getTime() / 1000)
    }
  }

  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    return Math.floor(parsed.getTime() / 1000)
  }

  return undefined
}

/**
 * Resolves a high-level user date filter (e.g. '2021', '2021..2022', '7d', '24h', 'all')
 * into concrete since and until boundaries.
 */
export function resolveDateFilter(input: string | undefined): {since?: string; until?: string} {
  if (!input) return {}
  const trimmed = input.trim()
  if (!trimmed || trimmed.toLowerCase() === 'all' || trimmed.toLowerCase() === 'none') return {}

  if (trimmed.includes('..') || /\s+-\s+/.test(trimmed)) {
    const parts = trimmed.split(/\.\.|\s+-\s+/)
    return {
      since: parts[0]?.trim(),
      until: parts[1]?.trim(),
    }
  }

  // 4-digit year or year-month: bound both since and until to that year/month
  if (/^\d{4}$/.test(trimmed) || /^\d{4}-\d{2}$/.test(trimmed)) {
    return {
      since: trimmed,
      until: trimmed,
    }
  }

  return {
    since: trimmed,
    until: undefined,
  }
}

export function parseLimit(input: string | number | undefined): number | undefined {
  if (input === undefined || input === null) return undefined
  if (typeof input === 'string') {
    const trimmed = input.trim().toLowerCase()
    if (!trimmed || trimmed === 'all' || trimmed === 'none' || trimmed === '0') return undefined
  }
  const num = typeof input === 'number' ? input : parseInt(String(input).trim(), 10)
  if (isNaN(num) || num <= 0) return undefined
  return Math.floor(num)
}

export interface ItemFilterResult {
  include: boolean
  stop: boolean
}

/**
 * Evaluates whether an item should be included based on filters,
 * and whether pagination can be early-terminated.
 */
export function shouldIncludeItem(
  item: MediaItem,
  filters: MediaFilterOptions,
): ItemFilterResult {
  const reverseChrono = filters.reverseChronological ?? true

  if (item.date !== undefined && item.date !== null) {
    // If newer than until boundary: skip this item, continue paginating to reach older items
    if (filters.until !== undefined && item.date > filters.until) {
      return {include: false, stop: false}
    }

    // If older than since boundary:
    if (filters.since !== undefined && item.date < filters.since) {
      // In reverse-chronological feeds, subsequent items will only be older, so stop completely
      return {include: false, stop: reverseChrono}
    }
  }

  return {include: true, stop: false}
}

/**
 * Wraps an async iterable of media items, enforcing since/until date bounds
 * and stopping once limit is satisfied or stream passes since date.
 */
export async function* filterMediaStream(
  items: AsyncIterable<MediaItem>,
  filters: MediaFilterOptions,
): AsyncGenerator<MediaItem, void, unknown> {
  const maxLimit = filters.limit
  let count = 0

  if (maxLimit !== undefined && maxLimit <= 0) {
    return
  }

  for await (const item of items) {
    if (maxLimit !== undefined && count >= maxLimit) {
      break
    }

    const {include, stop} = shouldIncludeItem(item, filters)

    if (include) {
      count++
      yield item
      if (maxLimit !== undefined && count >= maxLimit) {
        break
      }
    }

    if (stop) {
      break
    }
  }
}
