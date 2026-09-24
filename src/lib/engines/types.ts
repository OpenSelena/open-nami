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

export interface DispatchOptions {
  profile: ParsedProfile
  choice: MediaTarget
  outputDir?: string
  signal?: AbortSignal
  onProgress?: (progress: EngineProgress) => void
}

