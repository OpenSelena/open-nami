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

export class MediaLedger {
  private db: any = null
  private inMemoryFallback = {
    media: new Map<string, MediaRecord>(),
    checkpoints: new Map<string, CheckpointRecord>(),
  }
  private isFallback = false
  private resolvedPath: string

  constructor(dbPath?: string, forceFallback = false) {
    const resolvedPath = dbPath ?? (forceFallback ? ':memory:' : path.join(os.homedir(), '.open-nami', 'nami.db'))
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

  close(): void {
    if (this.db) {
      try {
        this.db.close()
      } catch {}
      this.db = null
    }
  }
}
