import path from 'node:path'
import os from 'node:os'
import { resolvePlatformDownloadsDir } from '../../known-folders.js'
import { loadConfig } from '../../config.js'

export function expandPath(dir: string): string {
  if (dir.startsWith('~/') || dir.startsWith('~\\') || dir === '~') {
    return path.join(os.homedir(), dir.slice(1))
  }
  return dir
}

export function resolveDownloadBaseDir(customBaseDir?: string): string {
  if (customBaseDir && customBaseDir.trim()) {
    return path.resolve(expandPath(customBaseDir.trim()))
  }
  const envDir = process.env.OPEN_NAMI_DIR || process.env.NAMI_DIR
  if (envDir && envDir.trim()) {
    return path.resolve(expandPath(envDir.trim()))
  }
  const configDir = loadConfig().downloadDir
  if (configDir && configDir.trim()) {
    return path.resolve(expandPath(configDir.trim()))
  }
  if (process.env.NAMI_BASE_DIR && process.env.NAMI_BASE_DIR.trim()) {
    const raw = process.env.NAMI_BASE_DIR.trim()
    return path.resolve(expandPath(raw.endsWith('downloads') ? raw : path.join(raw, 'downloads')))
  }

  // Dynamically auto-detect user's platform Downloads folder (like Open Omni)
  return path.join(resolvePlatformDownloadsDir(), 'Open Nami')
}

export function resolveDefaultDownloadDir(
  platform: string,
  username: string,
  baseDir?: string,
): string {
  const root = resolveDownloadBaseDir(baseDir)
  return path.join(root, platform, username)
}
