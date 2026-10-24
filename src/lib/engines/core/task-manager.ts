import { EngineEventBus } from './event-bus.js'
import { MediaLedger } from '../storage/ledger.js'
import { resolveDefaultDownloadDir, cleanupEmptyCategoryDirs } from '../dispatcher.js'
import { ExtractorPluginRegistry, defaultPluginRegistry } from './plugin.js'
import type { DispatchOptions, EngineResult } from '../types.js'

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
      if (!runRes.success && runRes.error) errors.push(runRes.error)
    }

    await cleanupEmptyCategoryDirs(targetDir)

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
