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

  findByUrl(url: string): IExtractorPlugin | undefined {
    return this.list().find((plugin) => plugin.canHandle(url))
  }

  clear(): void {
    this.plugins.clear()
  }
}

export const defaultPluginRegistry = new ExtractorPluginRegistry()
