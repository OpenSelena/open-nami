import type {ParsedProfile} from '../parser.js'

export type MediaTarget = 'photos' | 'videos' | 'stories' | 'highlights' | 'all'

export interface EngineProgress {
  job: string
  downloadedCount: number
  skippedCount: number
  currentFile?: string
  statusText: string
}

export interface EngineResult {
  success: boolean
  downloadedCount: number
  skippedCount: number
  errors: string[]
  outputDir: string
}

export interface DispatchRunnerResult {
  success: boolean
  downloaded: number
  skipped: number
  error?: string
}

export interface DispatchOptions {
  profile: ParsedProfile
  choice: MediaTarget
  outputDir?: string
  since?: string | number | Date
  until?: string | number | Date
  limit?: number
  resume?: boolean
  writeMetadata?: boolean
  cookiesFromBrowser?: string
  noTrack?: boolean
  earlyExitThreshold?: number
  signal?: AbortSignal
  onProgress?: (progress: EngineProgress) => void
  runnerOverrides?: {
    nativeRunner?: (subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights' | 'All') => Promise<DispatchRunnerResult>
    gdlRunner?: (
      subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights' | 'All',
      runnerOptions?: any,
    ) => Promise<DispatchRunnerResult>
    ytRunner?: (runnerOptions?: any) => Promise<DispatchRunnerResult>
  }
}

