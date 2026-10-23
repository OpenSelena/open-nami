import fsPromises from 'node:fs/promises'
import path from 'node:path'
import type {MediaItem, MediaType} from './extractors/types.js'

export interface CarouselInfo {
  id: string
  index: number
  total: number
}

export interface MediaMetadataSidecar {
  id: string
  platform?: string
  author?: string
  url: string
  filename: string
  type: MediaType
  extension: string
  caption?: string
  date?: number
  isoDate?: string
  width?: number
  height?: number
  thumbnailUrl?: string
  hashtags: string[]
  carousel?: CarouselInfo
  metadata?: Record<string, any>
  extractedAt: string
}

/**
 * Extracts distinct hashtags from a caption text (without the # prefix).
 * Preserves unicode characters in international hashtags.
 */
export function extractHashtags(caption?: string): string[] {
  if (!caption) return []
  const matches = caption.match(/#([\p{L}\p{N}_]+)/gu)
  if (!matches) return []
  const tags = matches.map(m => m.replace(/^#/, ''))
  return Array.from(new Set(tags))
}

/**
 * Assembles a standardized JSON sidecar object for a media item.
 */
export function buildMetadataSidecar(
  item: MediaItem,
  finalFilename: string,
  fallbackPlatform?: string,
  fallbackAuthor?: string,
): MediaMetadataSidecar {
  const hashtags = extractHashtags(item.caption)
  const cleanExt = item.extension.replace(/^\./, '') || (item.type === 'video' ? 'mp4' : 'jpg')
  const isoDate = item.date ? new Date(item.date * 1000).toISOString() : undefined

  let carousel: CarouselInfo | undefined
  if (item.carouselId && item.carouselIndex !== undefined && item.carouselTotal !== undefined) {
    carousel = {
      id: item.carouselId,
      index: item.carouselIndex,
      total: item.carouselTotal,
    }
  }

  return {
    id: item.id,
    platform: item.platform || fallbackPlatform,
    author: item.author || fallbackAuthor,
    url: item.url,
    filename: finalFilename,
    type: item.type,
    extension: cleanExt,
    ...(item.caption ? {caption: item.caption} : {}),
    ...(item.date ? {date: item.date, isoDate} : {}),
    ...(item.width ? {width: item.width} : {}),
    ...(item.height ? {height: item.height} : {}),
    ...(item.thumbnailUrl ? {thumbnailUrl: item.thumbnailUrl} : {}),
    hashtags,
    ...(carousel ? {carousel} : {}),
    ...(item.metadata ? {metadata: item.metadata} : {}),
    extractedAt: new Date().toISOString(),
  }
}

/**
 * Atomically writes a metadata sidecar JSON file and optionally synchronizes mtime.
 */
export async function writeMetadataSidecar(
  sidecarPath: string,
  sidecar: MediaMetadataSidecar,
  date?: number,
): Promise<void> {
  const tmpPath = `${sidecarPath}.tmp`
  const jsonContent = JSON.stringify(sidecar, null, 2)
  await fsPromises.writeFile(tmpPath, jsonContent, 'utf-8')
  await fsPromises.rename(tmpPath, sidecarPath)

  if (date) {
    try {
      const mtime = new Date(date * 1000)
      await fsPromises.utimes(sidecarPath, mtime, mtime)
    } catch {}
  }
}
