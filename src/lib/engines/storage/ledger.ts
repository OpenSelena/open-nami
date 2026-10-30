import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export interface MediaRecord {
  id: string
  platform: string
  author: string
  url: string
  filename: string
  filePath: string
  downloadedAt: string
}

export interface CheckpointRecord {
  platform: string
  username: string
  targetDir: string
  cursors: Record<string, string>
  updatedAt: string
}

export interface TrackedProfileRecord {
  platform: string
  username: string
  profileUrl: string
  targetDir: string
  choice: string
  lastPulledAt: string
  mediaCount: number
  status?: string
}

export class MediaLedger {
  private db: any = null
  private inMemoryFallback = {
    media: new Map<string, MediaRecord>(),
    checkpoints: new Map<string, CheckpointRecord>(),
    trackedProfiles: new Map<string, TrackedProfileRecord>(),
  }
  private isFallback = false
  private resolvedPath: string

  constructor(dbPath?: string, forceFallback = false) {
    const isTest =
      process.env.NODE_ENV === 'test' ||
      process.env.OPEN_NAMI_TEST === '1' ||
      process.argv.some(a => a.includes('--test'))
    const envDb = process.env.OPEN_NAMI_DB?.trim()
    const defaultPath = isTest
      ? ':memory:'
      : path.join(os.homedir(), '.open-nami', 'nami.db')
    const resolvedPath = dbPath ?? (envDb || (forceFallback ? ':memory:' : defaultPath))
    this.resolvedPath = resolvedPath
    if (forceFallback) {
      this.isFallback = true
      this.loadFallbackDisk()
      return
    }
    try {
      if (resolvedPath !== ':memory:') {
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
      }
      const { DatabaseSync } = require('node:sqlite')
      this.db = new DatabaseSync(resolvedPath)
      if (resolvedPath !== ':memory:') {
        try {
          this.db.exec('PRAGMA journal_mode = WAL;')
          this.db.exec('PRAGMA busy_timeout = 5000;')
        } catch {}
      }
      this.initTables()
    } catch {
      this.isFallback = true
      this.loadFallbackDisk()
    }
  }

  private loadFallbackDisk(): void {
    if (this.resolvedPath === ':memory:') return
    try {
      if (fs.existsSync(this.resolvedPath)) {
        const raw = fs.readFileSync(this.resolvedPath, 'utf8')
        const data = JSON.parse(raw)
        if (data && typeof data === 'object') {
          if (data.media && typeof data.media === 'object') {
            for (const [k, v] of Object.entries(data.media)) {
              this.inMemoryFallback.media.set(k, v as MediaRecord)
            }
          }
          if (data.checkpoints && typeof data.checkpoints === 'object') {
            for (const [k, v] of Object.entries(data.checkpoints)) {
              this.inMemoryFallback.checkpoints.set(k, v as CheckpointRecord)
            }
          }
          if (data.trackedProfiles && typeof data.trackedProfiles === 'object') {
            for (const [k, v] of Object.entries(data.trackedProfiles)) {
              this.inMemoryFallback.trackedProfiles.set(k, v as TrackedProfileRecord)
            }
          }
        }
      }
    } catch {}
  }

  private flushFallbackDisk(): void {
    if (this.resolvedPath === ':memory:') return
    try {
      fs.mkdirSync(path.dirname(this.resolvedPath), { recursive: true })
      const data = {
        media: Object.fromEntries(this.inMemoryFallback.media),
        checkpoints: Object.fromEntries(this.inMemoryFallback.checkpoints),
        trackedProfiles: Object.fromEntries(this.inMemoryFallback.trackedProfiles),
      }
      fs.writeFileSync(this.resolvedPath, JSON.stringify(data, null, 2), 'utf8')
    } catch {}
  }

  private initTables(): void {
    if (!this.db) return
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_ledger (
        id TEXT PRIMARY KEY,
        platform TEXT,
        author TEXT,
        url TEXT,
        filename TEXT,
        file_path TEXT,
        downloaded_at TEXT
      );
      CREATE TABLE IF NOT EXISTS checkpoints (
        key TEXT PRIMARY KEY,
        platform TEXT,
        username TEXT,
        target_dir TEXT,
        cursors_json TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS tracked_profiles (
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        profile_url TEXT NOT NULL,
        target_dir TEXT NOT NULL,
        choice TEXT NOT NULL,
        last_pulled_at TEXT NOT NULL,
        media_count INTEGER DEFAULT 0,
        status TEXT,
        PRIMARY KEY (platform, username)
      );
    `)
  }

  hasMedia(id: string): boolean {
    if (this.isFallback || !this.db) {
      return this.inMemoryFallback.media.has(id)
    }
    const stmt = this.db.prepare('SELECT 1 FROM media_ledger WHERE id = ?')
    const row = stmt.get(id)
    return Boolean(row)
  }

  recordMedia(media: MediaRecord): void {
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.media.set(media.id, media)
      this.flushFallbackDisk()
      return
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO media_ledger (id, platform, author, url, filename, file_path, downloaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      media.id,
      media.platform,
      media.author,
      media.url,
      media.filename,
      media.filePath,
      media.downloadedAt,
    )
  }

  saveCheckpoint(checkpoint: CheckpointRecord): void {
    const key = `${checkpoint.platform}:${checkpoint.username.toLowerCase()}`
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.checkpoints.set(key, checkpoint)
      this.flushFallbackDisk()
      return
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO checkpoints (key, platform, username, target_dir, cursors_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      key,
      checkpoint.platform,
      checkpoint.username,
      checkpoint.targetDir,
      JSON.stringify(checkpoint.cursors),
      checkpoint.updatedAt,
    )
  }

  getCheckpoint(platform: string, username: string): CheckpointRecord | null {
    const key = `${platform}:${username.toLowerCase()}`
    if (this.isFallback || !this.db) {
      return this.inMemoryFallback.checkpoints.get(key) || null
    }
    const stmt = this.db.prepare(
      'SELECT platform, username, target_dir, cursors_json, updated_at FROM checkpoints WHERE key = ?',
    )
    const row = stmt.get(key) as any
    if (!row) return null
    return {
      platform: row.platform,
      username: row.username,
      targetDir: row.target_dir,
      cursors: JSON.parse(row.cursors_json || '{}'),
      updatedAt: row.updated_at,
    }
  }

  clearCheckpoint(platform: string, username: string): void {
    const key = `${platform}:${username.toLowerCase()}`
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.checkpoints.delete(key)
      this.flushFallbackDisk()
      return
    }
    const stmt = this.db.prepare('DELETE FROM checkpoints WHERE key = ?')
    stmt.run(key)
  }

  trackProfile(profile: TrackedProfileRecord): void {
    const key = `${profile.platform}:${profile.username.toLowerCase()}`
    const normalized: TrackedProfileRecord = {
      ...profile,
      username: profile.username.toLowerCase(),
    }
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.trackedProfiles.set(key, normalized)
      this.flushFallbackDisk()
      return
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tracked_profiles (
        platform, username, profile_url, target_dir, choice, last_pulled_at, media_count, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      normalized.platform,
      normalized.username,
      normalized.profileUrl,
      normalized.targetDir,
      normalized.choice,
      normalized.lastPulledAt,
      normalized.mediaCount,
      normalized.status ?? null,
    )
  }

  getTrackedProfiles(): TrackedProfileRecord[] {
    if (this.isFallback || !this.db) {
      return Array.from(this.inMemoryFallback.trackedProfiles.values())
    }
    const stmt = this.db.prepare(
      'SELECT platform, username, profile_url, target_dir, choice, last_pulled_at, media_count, status FROM tracked_profiles ORDER BY last_pulled_at DESC',
    )
    const rows = stmt.all() as any[]
    return rows.map(r => ({
      platform: r.platform,
      username: r.username,
      profileUrl: r.profile_url,
      targetDir: r.target_dir,
      choice: r.choice,
      lastPulledAt: r.last_pulled_at,
      mediaCount: Number(r.media_count || 0),
      status: r.status || undefined,
    }))
  }

  getTrackedProfile(platform: string, username: string): TrackedProfileRecord | null {
    const key = `${platform}:${username.toLowerCase()}`
    if (this.isFallback || !this.db) {
      return this.inMemoryFallback.trackedProfiles.get(key) || null
    }
    const stmt = this.db.prepare(
      'SELECT platform, username, profile_url, target_dir, choice, last_pulled_at, media_count, status FROM tracked_profiles WHERE platform = ? AND username = ?',
    )
    const row = stmt.get(platform, username.toLowerCase()) as any
    if (!row) return null
    return {
      platform: row.platform,
      username: row.username,
      profileUrl: row.profile_url,
      targetDir: row.target_dir,
      choice: row.choice,
      lastPulledAt: row.last_pulled_at,
      mediaCount: Number(row.media_count || 0),
      status: row.status || undefined,
    }
  }

  untrackProfile(platform: string, username: string): void {
    const key = `${platform}:${username.toLowerCase()}`
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.trackedProfiles.delete(key)
      this.flushFallbackDisk()
      return
    }
    const stmt = this.db.prepare('DELETE FROM tracked_profiles WHERE platform = ? AND username = ?')
    stmt.run(platform, username.toLowerCase())
  }

  untrackProfiles(profiles: Array<{platform: string; username: string}>): void {
    for (const p of profiles) {
      this.untrackProfile(p.platform, p.username)
    }
  }

  clearTrackedProfiles(): void {
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.trackedProfiles.clear()
      this.flushFallbackDisk()
      return
    }
    const stmt = this.db.prepare('DELETE FROM tracked_profiles')
    stmt.run()
  }

  close(): void {
    if (this.db) {
      try {
        this.db.close()
      } catch {}
      this.db = null
    }
  }
}
