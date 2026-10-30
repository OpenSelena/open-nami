import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import { EngineEventBus } from './event-bus.js'
import { MediaLedger } from '../storage/ledger.js'
import { countMediaFilesInDir } from '../storage/disk-sync.js'
import { ExtractorPluginRegistry, defaultPluginRegistry } from './plugin.js'
import {
  expandPath,
  resolveDownloadBaseDir,
  resolveDefaultDownloadDir,
} from './download-dirs.js'
import type { DispatchOptions, EngineResult } from '../types.js'

export {
  expandPath,
  resolveDownloadBaseDir,
  resolveDefaultDownloadDir,
}

export async function cleanupEmptyCategoryDirs(targetDir: string): Promise<void> {
  const candidateDirs = ['All', 'Stories', 'Highlights', 'Photos', 'Videos']
  for (const dirName of candidateDirs) {
    const fullPath = path.join(targetDir, dirName)
    try {
      if (!fsSync.existsSync(fullPath)) continue
      const entries = await fs.readdir(fullPath)
      const nonArchiveEntries = entries.filter(
        e =>
          e !== '.open-nami-archive.json' &&
          e !== 'archive.txt' &&
          e !== 'archive_yt-dlp.txt' &&
          e !== 'archive_gallery-dl.sqlite3',
      )
      if (nonArchiveEntries.length === 0) {
        let hasArchiveIds = false
        for (const entry of entries) {
          const entryPath = path.join(fullPath, entry)
          if (entry === '.open-nami-archive.json') {
            try {
              const raw = await fs.readFile(entryPath, 'utf-8')
              const parsed = JSON.parse(raw)
              if (Array.isArray(parsed) && parsed.length > 0) {
                hasArchiveIds = true
                break
              }
            } catch {}
          } else if (entry === 'archive.txt' || entry === 'archive_yt-dlp.txt') {
            try {
              const raw = await fs.readFile(entryPath, 'utf-8')
              if (raw.trim().length > 0) {
                hasArchiveIds = true
                break
              }
            } catch {}
          }
        }

        if (!hasArchiveIds) {
          for (const entry of entries) {
            try {
              await fs.unlink(path.join(fullPath, entry))
            } catch {}
          }
          await fs.rmdir(fullPath).catch(() => {})
        }
      }
    } catch {}
  }
}

export class TaskManager {
  readonly events: EngineEventBus
  readonly ledger: MediaLedger
  readonly plugins: ExtractorPluginRegistry

  constructor(eventBus?: EngineEventBus, ledger?: MediaLedger, plugins?: ExtractorPluginRegistry) {
    this.events = eventBus || new EngineEventBus()
    this.ledger = ledger || new MediaLedger()
    this.plugins = plugins || defaultPluginRegistry
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
      if (!runRes.success) errors.push(runRes.error || 'Execution failed')
    }

    await cleanupEmptyCategoryDirs(targetDir)

    const result: EngineResult = {
      success: errors.length === 0,
      downloadedCount,
      skippedCount,
      errors,
      outputDir: targetDir,
    }

    if (!options.noTrack && (result.success || result.downloadedCount > 0)) {
      const diskStats = countMediaFilesInDir(targetDir)
      const existing = this.ledger.getTrackedProfile(profile.platform, profile.username)
      const finalCount = diskStats.count > 0
        ? diskStats.count
        : (existing?.mediaCount || 0) + result.downloadedCount

      this.ledger.trackProfile({
        platform: profile.platform,
        username: profile.username,
        profileUrl: profile.cleanUrl || `https://${profile.platform}.com/${profile.username}`,
        targetDir,
        choice: choice === 'all' && diskStats.choice ? diskStats.choice : choice,
        lastPulledAt: new Date().toISOString(),
        mediaCount: finalCount,
        status: errors.length === 0 ? 'ok' : 'partial',
      })
    }

    this.events.emit('job:complete', { result })
    return result
  }
}

export const defaultTaskManager = new TaskManager()
