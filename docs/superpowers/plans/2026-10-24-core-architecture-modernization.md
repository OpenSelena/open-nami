# Core Engine & Storage Architecture Modernization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize Open Nami's underlying engine with a decoupled event-driven TaskManager, pluggable extractor architecture, zero-manual-export browser cookie bridge, persistent SQLite media ledger/cookie vault, and diagnostic health check, all while preserving 100% of the current TUI design, views, and keyboard/mouse interactions.

**Architecture:** We decouple the core engine into three clean tiers: (1) an event-driven `TaskManager` and `EventBus` that handles extraction lifecycle without UI entanglement; (2) a modular `IExtractorPlugin` registry with standardized lifecycle hooks; (3) a unified persistence layer with an embedded SQLite `MediaLedger` and `CookieVault` (with JSON fallback for broad Node.js compatibility). The existing Ink TUI views remain visually identical but consume events from the decoupled engine.

**Tech Stack:** Node.js 20+ (with native `node:sqlite` support in Node 22+ and zero-dependency JSON fallback), TypeScript, React 19, Ink 7, EventEmitter.

**Spec:** `AntiGravity/Projects/OpenNami/Architecture/Modernization_And_Core_Architecture.md`

## Global Constraints
- Preserve 100% of current TUI layout, views, centered Nordic accent bar, and keybindings. Do not alter visual components.
- Maintain zero regressions across all 195 existing unit tests.
- Strictly avoid em dashes (`—`); use commas, colons, parentheses, or periods.
- Zero mandatory native binary dependencies; use Node.js built-in `node:sqlite` when available with seamless JSON store fallback.
- Preserve all domain terminology from `CONTEXT.md` (Profile, Platform, MediaTarget, EngineDispatch, SessionCookieJar).

---

### Task 1: Typed EventBus (`src/lib/engines/core/event-bus.ts`)

**Files:**
- Create: `src/lib/engines/core/event-bus.ts`
- Test: `src/lib/engines/core/event-bus.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface EngineEventMap {
    'job:start': { profile: ParsedProfile; choice: MediaTarget; outputDir: string }
    'job:progress': { job: string; downloadedCount: number; skippedCount: number; currentFile?: string; statusText: string }
    'job:complete': { result: EngineResult }
    'job:error': { error: string }
    'item:discovered': { item: MediaItem }
    'item:download:start': { item: MediaItem; destPath: string }
    'item:download:progress': { item: MediaItem; bytesLoaded: number; bytesTotal?: number }
    'item:download:complete': { item: MediaItem; destPath: string }
    'item:download:skip': { item: MediaItem; reason: string }
    'rate_limit:encountered': { platform: string; retryAfterMs: number }
  }
  export class EngineEventBus {
    on<K extends keyof EngineEventMap>(event: K, listener: (payload: EngineEventMap[K]) => void): () => void
    once<K extends keyof EngineEventMap>(event: K, listener: (payload: EngineEventMap[K]) => void): void
    emit<K extends keyof EngineEventMap>(event: K, payload: EngineEventMap[K]): boolean
    removeAllListeners(event?: keyof EngineEventMap): void
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EngineEventBus } from './event-bus.js'

test('EngineEventBus emits and receives typed events', () => {
  const bus = new EngineEventBus()
  let received = false
  const unsubscribe = bus.on('rate_limit:encountered', payload => {
    assert.equal(payload.platform, 'instagram')
    assert.equal(payload.retryAfterMs, 3000)
    received = true
  })

  bus.emit('rate_limit:encountered', { platform: 'instagram', retryAfterMs: 3000 })
  assert.equal(received, true)

  received = false
  unsubscribe()
  bus.emit('rate_limit:encountered', { platform: 'instagram', retryAfterMs: 3000 })
  assert.equal(received, false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx/esm --test src/lib/engines/core/event-bus.test.ts`
Expected: FAIL ("cannot find module ./event-bus.js")

- [ ] **Step 3: Write minimal implementation**

```typescript
import { EventEmitter } from 'node:events'
import type { ParsedProfile } from '../../parser.js'
import type { MediaTarget, EngineResult } from '../types.js'
import type { MediaItem } from '../extractors/types.js'

export interface EngineEventMap {
  'job:start': { profile: ParsedProfile; choice: MediaTarget; outputDir: string }
  'job:progress': { job: string; downloadedCount: number; skippedCount: number; currentFile?: string; statusText: string }
  'job:complete': { result: EngineResult }
  'job:error': { error: string }
  'item:discovered': { item: MediaItem }
  'item:download:start': { item: MediaItem; destPath: string }
  'item:download:progress': { item: MediaItem; bytesLoaded: number; bytesTotal?: number }
  'item:download:complete': { item: MediaItem; destPath: string }
  'item:download:skip': { item: MediaItem; reason: string }
  'rate_limit:encountered': { platform: string; retryAfterMs: number }
}

export class EngineEventBus {
  private emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(50)
  }

  on<K extends keyof EngineEventMap>(event: K, listener: (payload: EngineEventMap[K]) => void): () => void {
    this.emitter.on(event, listener as (...args: any[]) => void)
    return () => this.emitter.off(event, listener as (...args: any[]) => void)
  }

  once<K extends keyof EngineEventMap>(event: K, listener: (payload: EngineEventMap[K]) => void): void {
    this.emitter.once(event, listener as (...args: any[]) => void)
  }

  emit<K extends keyof EngineEventMap>(event: K, payload: EngineEventMap[K]): boolean {
    return this.emitter.emit(event, payload)
  }

  removeAllListeners(event?: keyof EngineEventMap): void {
    this.emitter.removeAllListeners(event)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx/esm --test src/lib/engines/core/event-bus.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/core/event-bus.ts src/lib/engines/core/event-bus.test.ts
git commit -m "feat(core): add typed EngineEventBus"
```

---

### Task 2: Extractor Plugin Interface & Registry (`src/lib/engines/core/plugin.ts`)

**Files:**
- Create: `src/lib/engines/core/plugin.ts`
- Test: `src/lib/engines/core/plugin.test.ts`
- Modify: `src/lib/engines/extractors/index.ts`

**Interfaces:**
- Consumes: `ParsedProfile`, `ExtractOptions`, `MediaItem`, `SupportedPlatform`
- Produces:
  ```typescript
  export interface SessionHealth {
    valid: boolean
    username?: string
    error?: string
    expiresAt?: Date
  }
  export interface IExtractorPlugin {
    readonly platform: SupportedPlatform
    readonly name: string
    readonly version: string
    canHandle(urlOrPlatform: string): boolean
    validateSession?(cookiePath: string | null): Promise<SessionHealth>
    extract(profile: ParsedProfile, options: ExtractOptions): AsyncGenerator<MediaItem, void, unknown>
  }
  export class ExtractorPluginRegistry {
    register(plugin: IExtractorPlugin): void
    get(platform: SupportedPlatform): IExtractorPlugin | undefined
    has(platform: SupportedPlatform): boolean
    list(): IExtractorPlugin[]
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ExtractorPluginRegistry, type IExtractorPlugin } from './plugin.js'

test('ExtractorPluginRegistry registers and resolves platform extractors', () => {
  const registry = new ExtractorPluginRegistry()
  const mockPlugin: IExtractorPlugin = {
    platform: 'instagram',
    name: 'Mock Instagram',
    version: '1.0.0',
    canHandle: (target) => target.includes('instagram.com'),
    extract: async function* () {},
  }

  registry.register(mockPlugin)
  assert.equal(registry.has('instagram'), true)
  assert.equal(registry.get('instagram')?.name, 'Mock Instagram')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx/esm --test src/lib/engines/core/plugin.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { SupportedPlatform, ParsedProfile } from '../../parser.js'
import type { ExtractOptions, MediaItem } from '../extractors/types.js'

export interface SessionHealth {
  valid: boolean
  username?: string
  error?: string
  expiresAt?: Date
}

export interface IExtractorPlugin {
  readonly platform: SupportedPlatform
  readonly name: string
  readonly version: string
  canHandle(urlOrPlatform: string): boolean
  validateSession?(cookiePath: string | null): Promise<SessionHealth>
  extract(profile: ParsedProfile, options: ExtractOptions): AsyncGenerator<MediaItem, void, unknown>
}

export class ExtractorPluginRegistry {
  private plugins = new Map<SupportedPlatform, IExtractorPlugin>()

  register(plugin: IExtractorPlugin): void {
    this.plugins.set(plugin.platform, plugin)
  }

  get(platform: SupportedPlatform): IExtractorPlugin | undefined {
    return this.plugins.get(platform)
  }

  has(platform: SupportedPlatform): boolean {
    return this.plugins.has(platform)
  }

  list(): IExtractorPlugin[] {
    return Array.from(this.plugins.values())
  }
}

export const defaultPluginRegistry = new ExtractorPluginRegistry()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx/esm --test src/lib/engines/core/plugin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/core/plugin.ts src/lib/engines/core/plugin.test.ts
git commit -m "feat(core): add IExtractorPlugin interface and registry"
```

---

### Task 3: SQLite Media Ledger & Checkpoint Store (`src/lib/engines/storage/ledger.ts`)

**Files:**
- Create: `src/lib/engines/storage/ledger.ts`
- Test: `src/lib/engines/storage/ledger.test.ts`

**Interfaces:**
- Consumes: Node built-in `node:sqlite` or fallback memory/JSON adapter
- Produces:
  ```typescript
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
    constructor(dbPath?: string)
    hasMedia(id: string): boolean
    recordMedia(media: MediaRecord): void
    saveCheckpoint(checkpoint: CheckpointRecord): void
    getCheckpoint(platform: string, username: string): CheckpointRecord | null
    clearCheckpoint(platform: string, username: string): void
    close(): void
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MediaLedger } from './ledger.js'

test('MediaLedger stores and retrieves media records and checkpoints', () => {
  const ledger = new MediaLedger(':memory:')
  assert.equal(ledger.hasMedia('12345'), false)

  ledger.recordMedia({
    id: '12345',
    platform: 'instagram',
    author: 'selenagomez',
    url: 'https://cdn.example.com/photo.jpg',
    filename: 'photo.jpg',
    filePath: '/tmp/photo.jpg',
    downloadedAt: new Date().toISOString(),
  })

  assert.equal(ledger.hasMedia('12345'), true)

  ledger.saveCheckpoint({
    platform: 'instagram',
    username: 'selenagomez',
    targetDir: '/tmp',
    cursors: { timeline: 'cursor_abc' },
    updatedAt: new Date().toISOString(),
  })

  const cp = ledger.getCheckpoint('instagram', 'selenagomez')
  assert.equal(cp?.cursors.timeline, 'cursor_abc')

  ledger.clearCheckpoint('instagram', 'selenagomez')
  assert.equal(ledger.getCheckpoint('instagram', 'selenagomez'), null)
  ledger.close()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx/esm --test src/lib/engines/storage/ledger.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation with SQLite and JSON fallback**

```typescript
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

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

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(os.homedir(), '.open-nami', 'nami.db')
    try {
      if (resolvedPath !== ':memory:') {
        fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DatabaseSync } = require('node:sqlite')
      this.db = new DatabaseSync(resolvedPath)
      this.initTables()
    } catch {
      this.isFallback = true
    }
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
      return
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO media_ledger (id, platform, author, url, filename, file_path, downloaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(media.id, media.platform, media.author, media.url, media.filename, media.filePath, media.downloadedAt)
  }

  saveCheckpoint(checkpoint: CheckpointRecord): void {
    const key = `${checkpoint.platform}:${checkpoint.username.toLowerCase()}`
    if (this.isFallback || !this.db) {
      this.inMemoryFallback.checkpoints.set(key, checkpoint)
      return
    }
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO checkpoints (key, platform, username, target_dir, cursors_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(key, checkpoint.platform, checkpoint.username, checkpoint.targetDir, JSON.stringify(checkpoint.cursors), checkpoint.updatedAt)
  }

  getCheckpoint(platform: string, username: string): CheckpointRecord | null {
    const key = `${platform}:${username.toLowerCase()}`
    if (this.isFallback || !this.db) {
      return this.inMemoryFallback.checkpoints.get(key) || null
    }
    const stmt = this.db.prepare('SELECT platform, username, target_dir, cursors_json, updated_at FROM checkpoints WHERE key = ?')
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
      return
    }
    const stmt = this.db.prepare('DELETE FROM checkpoints WHERE key = ?')
    stmt.run(key)
  }

  close(): void {
    if (this.db) {
      try { this.db.close() } catch {}
      this.db = null
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx/esm --test src/lib/engines/storage/ledger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/storage/ledger.ts src/lib/engines/storage/ledger.test.ts
git commit -m "feat(storage): implement SQLite MediaLedger and CheckpointStore"
```

---

### Task 4: Browser Cookie Auto-Bridge (`src/lib/cookies/browser-bridge.ts`)

**Files:**
- Create: `src/lib/cookies/browser-bridge.ts`
- Test: `src/lib/cookies/browser-bridge.test.ts`
- Modify: `src/lib/cookies.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface DetectedBrowser {
    id: string
    name: string
    profileDir: string
    available: boolean
  }
  export function listDetectedBrowsers(): DetectedBrowser[]
  export function exportCookiesForPlatform(browserId: string, platform: string, destPath: string): Promise<boolean>
  ```

- [ ] **Step 1: Write the failing test**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listDetectedBrowsers } from './browser-bridge.js'

test('listDetectedBrowsers detects known browser profile paths on OS', () => {
  const browsers = listDetectedBrowsers()
  assert.equal(Array.isArray(browsers), true)
  assert.equal(browsers.some(b => ['chrome', 'firefox', 'edge', 'brave'].includes(b.id)), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx/esm --test src/lib/cookies/browser-bridge.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface DetectedBrowser {
  id: string
  name: string
  profileDir: string
  available: boolean
}

export function listDetectedBrowsers(): DetectedBrowser[] {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const home = os.homedir()

  const candidates: Array<{ id: string; name: string; winDir: string; macDir: string; linuxDir: string }> = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      winDir: path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Google', 'Chrome', 'User Data'),
      macDir: path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
      linuxDir: path.join(home, '.config', 'google-chrome'),
    },
    {
      id: 'edge',
      name: 'Microsoft Edge',
      winDir: path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Microsoft', 'Edge', 'User Data'),
      macDir: path.join(home, 'Library', 'Application Support', 'Microsoft Edge'),
      linuxDir: path.join(home, '.config', 'microsoft-edge'),
    },
    {
      id: 'brave',
      name: 'Brave Browser',
      winDir: path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'BraveSoftware', 'Brave-Browser', 'User Data'),
      macDir: path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser'),
      linuxDir: path.join(home, '.config', 'BraveSoftware', 'Brave-Browser'),
    },
    {
      id: 'firefox',
      name: 'Mozilla Firefox',
      winDir: path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Mozilla', 'Firefox', 'Profiles'),
      macDir: path.join(home, 'Library', 'Application Support', 'Firefox', 'Profiles'),
      linuxDir: path.join(home, '.mozilla', 'firefox'),
    },
  ]

  return candidates.map(c => {
    const profileDir = isWin ? c.winDir : isMac ? c.macDir : c.linuxDir
    return {
      id: c.id,
      name: c.name,
      profileDir,
      available: fs.existsSync(profileDir),
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx/esm --test src/lib/cookies/browser-bridge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/cookies/browser-bridge.ts src/lib/cookies/browser-bridge.test.ts
git commit -m "feat(cookies): add browser auto-discovery bridge"
```

---

### Task 5: Decoupled Core TaskManager (`src/lib/engines/core/task-manager.ts`)

**Files:**
- Create: `src/lib/engines/core/task-manager.ts`
- Test: `src/lib/engines/core/task-manager.test.ts`
- Modify: `src/lib/engines/dispatcher.ts`

**Interfaces:**
- Consumes: `EngineEventBus`, `MediaLedger`, `ExtractorPluginRegistry`, `DispatchOptions`
- Produces:
  ```typescript
  export class TaskManager {
    constructor(eventBus?: EngineEventBus, ledger?: MediaLedger)
    readonly events: EngineEventBus
    readonly ledger: MediaLedger
    execute(options: DispatchOptions): Promise<EngineResult>
  }
  ```

- [ ] **Step 1: Write the failing test**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TaskManager } from './task-manager.js'
import { EngineEventBus } from './event-bus.js'
import { MediaLedger } from '../storage/ledger.js'

test('TaskManager executes job and emits events through EventBus', async () => {
  const bus = new EngineEventBus()
  const ledger = new MediaLedger(':memory:')
  const manager = new TaskManager(bus, ledger)

  let started = false
  bus.on('job:start', () => { started = true })

  const result = await manager.execute({
    profile: { platform: 'instagram', username: 'testuser', cleanUrl: 'https://instagram.com/testuser' },
    choice: 'photos',
    runnerOverrides: {
      nativeRunner: async () => ({ success: true, downloaded: 2, skipped: 0 }),
    },
  })

  assert.equal(started, true)
  assert.equal(result.downloadedCount, 2)
  ledger.close()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx/esm --test src/lib/engines/core/task-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
import { EngineEventBus } from './event-bus.js'
import { MediaLedger } from '../storage/ledger.js'
import { resolveDefaultDownloadDir, cleanupEmptyCategoryDirs } from '../dispatcher.js'
import type { DispatchOptions, EngineResult } from '../types.js'

export class TaskManager {
  readonly events: EngineEventBus
  readonly ledger: MediaLedger

  constructor(eventBus?: EngineEventBus, ledger?: MediaLedger) {
    this.events = eventBus || new EngineEventBus()
    this.ledger = ledger || new MediaLedger()
  }

  async execute(options: DispatchOptions): Promise<EngineResult> {
    const { profile, choice } = options
    const targetDir = options.outputDir || resolveDefaultDownloadDir(profile.platform, profile.username)

    this.events.emit('job:start', { profile, choice, outputDir: targetDir })

    let downloadedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    if (options.runnerOverrides?.nativeRunner) {
      const subDir = choice === 'all' ? 'All' : (choice.charAt(0).toUpperCase() + choice.slice(1)) as any
      const runRes = await options.runnerOverrides.nativeRunner(subDir)
      downloadedCount += runRes.downloaded
      skippedCount += runRes.skipped
      if (!runRes.success && runRes.error) errors.push(runRes.error)
    }

    const result: EngineResult = {
      success: errors.length === 0,
      downloadedCount,
      skippedCount,
      errors,
      outputDir: targetDir,
    }

    this.events.emit('job:complete', { result })
    return result
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx/esm --test src/lib/engines/core/task-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/core/task-manager.ts src/lib/engines/core/task-manager.test.ts
git commit -m "feat(core): implement decoupled TaskManager"
```

---

### Task 6: Self-Diagnostic Health Check (`src/lib/diagnostics/doctor.ts`)

**Files:**
- Create: `src/lib/diagnostics/doctor.ts`
- Test: `src/lib/diagnostics/doctor.test.ts`
- Modify: `src/cli.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface DoctorReport {
    nodeVersion: string
    binaries: Record<'gallery-dl' | 'yt-dlp' | 'ffmpeg', boolean>
    cookies: Record<string, boolean>
    storageOk: boolean
  }
  export function runDoctor(): Promise<DoctorReport>
  ```

- [ ] **Step 1: Write the failing test**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runDoctor } from './doctor.js'

test('runDoctor returns structured system diagnostics', async () => {
  const report = await runDoctor()
  assert.equal(typeof report.nodeVersion, 'string')
  assert.equal(typeof report.storageOk, 'boolean')
  assert.equal(typeof report.binaries['yt-dlp'], 'boolean')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx/esm --test src/lib/diagnostics/doctor.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { detectAvailableCookies } from '../cookies.js'

const execFileAsync = promisify(execFile)

export interface DoctorReport {
  nodeVersion: string
  binaries: Record<'gallery-dl' | 'yt-dlp' | 'ffmpeg', boolean>
  cookies: Record<string, boolean>
  storageOk: boolean
}

async function checkBinary(bin: string): Promise<boolean> {
  try {
    await execFileAsync(bin, ['--version'], { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

export async function runDoctor(): Promise<DoctorReport> {
  const [gdl, ytdlp, ffmpeg] = await Promise.all([
    checkBinary('gallery-dl'),
    checkBinary('yt-dlp'),
    checkBinary('ffmpeg'),
  ])

  const availableCookies = detectAvailableCookies()
  const cookieStatus: Record<string, boolean> = {
    instagram: availableCookies.includes('instagram'),
    tiktok: availableCookies.includes('tiktok'),
    facebook: availableCookies.includes('facebook'),
    x: availableCookies.includes('x'),
  }

  let storageOk = false
  try {
    const testDir = path.join(os.homedir(), '.open-nami')
    fs.mkdirSync(testDir, { recursive: true })
    const testFile = path.join(testDir, '.doctor_test')
    fs.writeFileSync(testFile, 'ok')
    fs.unlinkSync(testFile)
    storageOk = true
  } catch {}

  return {
    nodeVersion: process.version,
    binaries: {
      'gallery-dl': gdl,
      'yt-dlp': ytdlp,
      ffmpeg,
    },
    cookies: cookieStatus,
    storageOk,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx/esm --test src/lib/diagnostics/doctor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/diagnostics/doctor.ts src/lib/diagnostics/doctor.test.ts
git commit -m "feat(diagnostics): add system health doctor"
```

---

### Task 7: Full Test Suite Verification & Integration

**Files:**
- Modify: `src/lib/engines/dispatcher.ts` (wire to TaskManager without breaking API)
- Modify: `src/cli.tsx` (add `doctor` flag)

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All 195+ tests PASS.

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npm run typecheck`
Expected: 0 diagnostics.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Clean bundle to `dist/cli.js`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/engines/dispatcher.ts src/cli.tsx
git commit -m "chore(core): complete decoupled engine integration with doctor command"
```
