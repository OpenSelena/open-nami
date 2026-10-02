import {InstagramExtractor} from './instagram.js'
import {XExtractor} from './x.js'
import {TikTokExtractor} from './tiktok.js'
import {FacebookExtractor} from './facebook.js'
import type {Extractor} from './types.js'
import type {SupportedPlatform} from '../../parser.js'

export * from './types.js'
export * from './http.js'
export * from './instagram.js'
export * from './x.js'
export * from './tiktok.js'
export * from './facebook.js'

export function getExtractor(platform: SupportedPlatform): Extractor {
  switch (platform) {
    case 'instagram':
      return new InstagramExtractor()
    case 'x':
      return new XExtractor()
    case 'tiktok':
      return new TikTokExtractor()
    case 'facebook':
      return new FacebookExtractor()
    default:
      throw new Error(`Unsupported extractor platform: ${platform}`)
  }
}
