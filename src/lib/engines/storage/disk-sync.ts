import fs from 'node:fs'
import path from 'node:path'
import { resolveDownloadBaseDir } from '../core/download-dirs.js'
import { buildProfileUrl } from '../../parser.js'
import type { MediaLedger } from './ledger.js'

export const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'])
export const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v'])
export const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.wav', '.aac'])

const KNOWN_PLATFORMS = new Set(['instagram', 'tiktok', 'facebook', 'x'])

export function isMediaFile(fileName: string): boolean {
  const base = path.basename(fileName)
  if (base.startsWith('.')) return false
  if (base.endsWith('.download') || base.endsWith('.tmp') || base.endsWith('.part')) return false
  const ext = path.extname(base).toLowerCase()
  return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)
}

export interface DiskMediaStats {
  count: number
  lastMtimeMs: number
  choice: 'photos' | 'videos' | 'all'
  photoCount: number
  videoCount: number
}

export function countMediaFilesInDir(dir: string): DiskMediaStats {
  let photoCount = 0
  let videoCount = 0
  let lastMtimeMs = 0

  if (!fs.existsSync(dir)) {
    return { count: 0, lastMtimeMs: 0, choice: 'all', photoCount: 0, videoCount: 0 }
  }

  function walk(currentDir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue

      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        if (!isMediaFile(entry.name)) continue

        const ext = path.extname(entry.name).toLowerCase()
        if (IMAGE_EXTS.has(ext)) {
          photoCount++
        } else if (VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)) {
          videoCount++
        }

        try {
          const stat = fs.statSync(fullPath)
          if (stat.mtimeMs > lastMtimeMs) {
            lastMtimeMs = stat.mtimeMs
          }
        } catch {}
      }
    }
  }

  walk(dir)

  let choice: 'photos' | 'videos' | 'all' = 'all'
  if (photoCount > 0 && videoCount === 0) {
    choice = 'photos'
  } else if (videoCount > 0 && photoCount === 0) {
    choice = 'videos'
  }

  return {
    count: photoCount + videoCount,
    lastMtimeMs,
    choice,
    photoCount,
    videoCount,
  }
}

export function extractArchiveItemIds(dir: string): string[] {
  const ids = new Set<string>()

  function parseArchiveFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return
    try {
      const base = path.basename(filePath)
      if (base === '.open-nami-archive.json') {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item) ids.add(String(item))
          }
        }
      } else if (base === 'archive.txt' || base === 'archive_yt-dlp.txt') {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const lines = raw.split(/\r?\n/)
        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line || line.startsWith('#')) continue
          const parts = line.split(/\s+/)
          const id = parts[parts.length - 1]
          if (id) ids.add(id)
        }
      }
    } catch {}
  }

  const candidateDirs = [dir]
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        candidateDirs.push(path.join(dir, e.name))
      }
    }
  } catch {}

  for (const cDir of candidateDirs) {
    parseArchiveFile(path.join(cDir, '.open-nami-archive.json'))
    parseArchiveFile(path.join(cDir, 'archive.txt'))
    parseArchiveFile(path.join(cDir, 'archive_yt-dlp.txt'))
  }

  return Array.from(ids)
}

export function syncDiskProfilesToLedger(
  ledger: MediaLedger,
  customBaseDir?: string,
): { scanned: number; added: number; updated: number } {
  let baseDir: string
  try {
    baseDir = resolveDownloadBaseDir(customBaseDir)
  } catch {
    return { scanned: 0, added: 0, updated: 0 }
  }

  if (!fs.existsSync(baseDir)) {
    return { scanned: 0, added: 0, updated: 0 }
  }

  let scanned = 0
  let added = 0
  let updated = 0

  let platformEntries: fs.Dirent[]
  try {
    platformEntries = fs.readdirSync(baseDir, { withFileTypes: true })
  } catch {
    return { scanned: 0, added: 0, updated: 0 }
  }

  for (const platEntry of platformEntries) {
    if (!platEntry.isDirectory()) continue
    const platform = platEntry.name.toLowerCase()
    if (!KNOWN_PLATFORMS.has(platform)) continue

    const platformDir = path.join(baseDir, platEntry.name)
    let creatorEntries: fs.Dirent[]
    try {
      creatorEntries = fs.readdirSync(platformDir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const creatorEntry of creatorEntries) {
      if (!creatorEntry.isDirectory()) continue
      if (creatorEntry.name.startsWith('.')) continue

      const username = creatorEntry.name.toLowerCase()
      if (ledger.isUntracked(platform, username)) {
        continue
      }

      const creatorDir = path.join(platformDir, creatorEntry.name)
      const stats = countMediaFilesInDir(creatorDir)
      if (stats.count === 0) continue

      scanned++
      const archiveIds = extractArchiveItemIds(creatorDir)
      for (const id of archiveIds) {
        ledger.recordMedia({
          id,
          platform,
          author: username,
          url: '',
          filename: '',
          filePath: '',
          downloadedAt: new Date(stats.lastMtimeMs || Date.now()).toISOString(),
        })
      }

      const existing = ledger.getTrackedProfile(platform, username)
      if (!existing) {
        let profileUrl: string
        try {
          profileUrl = buildProfileUrl(platform as any, username)
        } catch {
          profileUrl = `https://${platform}.com/${username}`
        }

        ledger.trackProfile({
          platform,
          username,
          profileUrl,
          targetDir: creatorDir,
          choice: stats.choice,
          lastPulledAt: stats.lastMtimeMs
            ? new Date(stats.lastMtimeMs).toISOString()
            : new Date().toISOString(),
          mediaCount: stats.count,
          status: 'ok',
        })
        added++
      } else {
        if (existing.mediaCount !== stats.count || existing.targetDir !== creatorDir) {
          ledger.trackProfile({
            ...existing,
            targetDir: creatorDir,
            mediaCount: stats.count,
            choice: existing.choice === 'all' && stats.choice !== 'all' ? existing.choice : stats.choice,
          })
          updated++
        }
      }
    }
  }

  return { scanned, added, updated }
}
