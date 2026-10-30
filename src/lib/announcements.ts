import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {compareSemVer} from './update-check.js'

export type AnnouncementLevel = 'info' | 'warning' | 'alert'

export interface Announcement {
  id: string
  title: string
  message: string
  url?: string
  level?: AnnouncementLevel
  expiresAt?: string
  minVersion?: string
  maxVersion?: string
}

export interface AnnouncementCacheData {
  lastChecked: number
  activeAnnouncement: Announcement | null
  dismissedIds: string[]
}

export interface CheckAnnouncementOptions {
  currentVersion?: string
  cachePath?: string
  announcementUrl?: string
  force?: boolean
  timeoutMs?: number
  checkIntervalMs?: number
  fetchFn?: typeof fetch
}

export const DEFAULT_ANNOUNCEMENT_URL =
  'https://raw.githubusercontent.com/OpenSelena/open-nami/main/announcements.json'

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours
const DEFAULT_TIMEOUT_MS = 2000

export function getDefaultAnnouncementCachePath(): string {
  if (process.env.OPEN_NAMI_ANNOUNCEMENT_CACHE && process.env.OPEN_NAMI_ANNOUNCEMENT_CACHE.trim()) {
    return path.resolve(process.env.OPEN_NAMI_ANNOUNCEMENT_CACHE.trim())
  }
  return path.join(os.homedir(), '.open-nami', 'announcements.json')
}

export function isAnnouncementEligible(
  item: unknown,
  currentVersion: string,
  dismissedIds: string[] = [],
): item is Announcement {
  if (!item || typeof item !== 'object') return false
  const a = item as Record<string, unknown>

  if (typeof a.id !== 'string' || !a.id.trim()) return false
  if (typeof a.title !== 'string' || !a.title.trim()) return false
  if (typeof a.message !== 'string' || !a.message.trim()) return false

  if (dismissedIds.includes(a.id.trim())) return false

  if (typeof a.expiresAt === 'string' && a.expiresAt.trim()) {
    const expiry = Date.parse(a.expiresAt.trim())
    if (!isNaN(expiry) && Date.now() > expiry) {
      return false
    }
  }

  if (typeof a.minVersion === 'string' && a.minVersion.trim()) {
    if (compareSemVer(currentVersion, a.minVersion.trim()) < 0) {
      return false
    }
  }

  if (typeof a.maxVersion === 'string' && a.maxVersion.trim()) {
    if (compareSemVer(currentVersion, a.maxVersion.trim()) > 0) {
      return false
    }
  }

  return true
}

export function parseAnnouncementsPayload(
  payload: unknown,
  currentVersion: string,
  dismissedIds: string[] = [],
): Announcement | null {
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (isAnnouncementEligible(item, currentVersion, dismissedIds)) {
        return item
      }
    }
    return null
  }

  if (isAnnouncementEligible(payload, currentVersion, dismissedIds)) {
    return payload
  }

  return null
}

export function getCachedAnnouncement(
  currentVersion: string,
  cachePath = getDefaultAnnouncementCachePath(),
): Announcement | null {
  try {
    if (!fs.existsSync(cachePath)) return null
    const raw = fs.readFileSync(cachePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<AnnouncementCacheData>
    const dismissedIds = Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : []

    if (parsed.activeAnnouncement && isAnnouncementEligible(parsed.activeAnnouncement, currentVersion, dismissedIds)) {
      return parsed.activeAnnouncement
    }
  } catch {}
  return null
}

export function dismissAnnouncement(
  id: string,
  cachePath = getDefaultAnnouncementCachePath(),
): void {
  try {
    let cache: AnnouncementCacheData = {
      lastChecked: 0,
      activeAnnouncement: null,
      dismissedIds: [],
    }

    if (fs.existsSync(cachePath)) {
      try {
        const raw = fs.readFileSync(cachePath, 'utf8')
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          cache = {
            lastChecked: parsed.lastChecked ?? 0,
            activeAnnouncement: parsed.activeAnnouncement ?? null,
            dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [],
          }
        }
      } catch {}
    }

    const cleanId = id.trim()
    if (!cache.dismissedIds.includes(cleanId)) {
      cache.dismissedIds.push(cleanId)
    }

    if (cache.activeAnnouncement?.id === cleanId) {
      cache.activeAnnouncement = null
    }

    fs.mkdirSync(path.dirname(cachePath), {recursive: true})
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8')
  } catch {}
}

export async function fetchAnnouncement(
  options: CheckAnnouncementOptions = {},
): Promise<Announcement | null> {
  const currentVersion = options.currentVersion ?? '1.0.0'
  const cachePath = options.cachePath ?? getDefaultAnnouncementCachePath()
  const interval = options.checkIntervalMs ?? DEFAULT_INTERVAL_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetcher = options.fetchFn ?? globalThis.fetch
  const url = options.announcementUrl ?? process.env.OPEN_NAMI_ANNOUNCEMENT_URL ?? DEFAULT_ANNOUNCEMENT_URL

  if (
    process.env.NO_ANNOUNCEMENTS === '1' ||
    process.env.OPEN_NAMI_NO_ANNOUNCEMENTS === '1'
  ) {
    return null
  }

  let cache: AnnouncementCacheData = {
    lastChecked: 0,
    activeAnnouncement: null,
    dismissedIds: [],
  }

  if (fs.existsSync(cachePath)) {
    try {
      const raw = fs.readFileSync(cachePath, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        cache = {
          lastChecked: typeof parsed.lastChecked === 'number' ? parsed.lastChecked : 0,
          activeAnnouncement: parsed.activeAnnouncement ?? null,
          dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [],
        }
      }
    } catch {}
  }

  if (!options.force && cache.lastChecked && Date.now() - cache.lastChecked < interval) {
    if (cache.activeAnnouncement && isAnnouncementEligible(cache.activeAnnouncement, currentVersion, cache.dismissedIds)) {
      return cache.activeAnnouncement
    }
    return null
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetcher(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': `open-nami/${currentVersion}`,
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      return cache.activeAnnouncement && isAnnouncementEligible(cache.activeAnnouncement, currentVersion, cache.dismissedIds)
        ? cache.activeAnnouncement
        : null
    }

    const json = await res.json()
    const active = parseAnnouncementsPayload(json, currentVersion, cache.dismissedIds)

    cache.lastChecked = Date.now()
    cache.activeAnnouncement = active

    try {
      fs.mkdirSync(path.dirname(cachePath), {recursive: true})
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8')
    } catch {}

    return active
  } catch {
    return cache.activeAnnouncement && isAnnouncementEligible(cache.activeAnnouncement, currentVersion, cache.dismissedIds)
      ? cache.activeAnnouncement
      : null
  }
}
