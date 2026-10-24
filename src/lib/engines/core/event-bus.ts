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

  off<K extends keyof EngineEventMap>(event: K, listener: (payload: EngineEventMap[K]) => void): void {
    this.emitter.off(event, listener as (...args: any[]) => void)
  }

  once<K extends keyof EngineEventMap>(event: K, listener: (payload: EngineEventMap[K]) => void): void {
    this.emitter.once(event, listener as (...args: any[]) => void)
  }

  emit<K extends keyof EngineEventMap>(event: K, payload: EngineEventMap[K]): boolean {
    return this.emitter.emit(event, payload)
  }

  removeAllListeners(event?: keyof EngineEventMap): void {
    if (event !== undefined) {
      this.emitter.removeAllListeners(event)
    } else {
      this.emitter.removeAllListeners()
    }
  }
}
