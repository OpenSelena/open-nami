import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const KNOWN_FOLDER_DOWNLOADS_GUID = '{374DE290-123F-4565-9164-39C4925E467B}'
export const USER_SHELL_FOLDERS_REG_KEY =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders'

/**
 * Expands %VAR% environment variables using case-insensitive matching on Windows.
 */
export function expandWindowsEnv(
  str: string,
  env: Record<string, string | undefined> = process.env,
  homeDir?: string,
): string {
  return str.replace(/%([^%]+)%/g, (original, name: string) => {
    if (homeDir && name.toLowerCase() === 'userprofile') {
      return homeDir
    }
    const key = Object.keys(env).find(k => k.toLowerCase() === name.toLowerCase())
    if (key && env[key] !== undefined) {
      return env[key] as string
    }
    return original
  })
}

/**
 * Parse output from "reg query <key> /v <val>" to extract the data string.
 */
export function parseWindowsRegistryOutput(
  output: string,
  targetKey = KNOWN_FOLDER_DOWNLOADS_GUID,
): string | undefined {
  const lines = output.split(/\r?\n/)
  const escaped = targetKey.replace(/[{}]/g, '\\$&')
  const pattern = new RegExp(`^\\s*${escaped}\\s+REG_\\w+\\s+(.*)$`, 'i')

  for (const line of lines) {
    const match = line.match(pattern)
    if (match && match[1]) {
      const rawPath = match[1].trim()
      if (rawPath) return rawPath
    }
  }
  return undefined
}

/**
 * Parse Linux ~/.config/user-dirs.dirs for XDG_DOWNLOAD_DIR="...".
 */
export function parseLinuxUserDirsOutput(content: string): string | undefined {
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) continue
    const match = trimmed.match(/^XDG_DOWNLOAD_DIR=["']?([^"']+)["']?$/)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return undefined
}

/**
 * Check if the root drive/volume or mount point of a path is currently mounted and accessible.
 */
export function isPathDriveAccessible(
  filePath: string,
  fsExists: (p: string) => boolean = fs.existsSync,
  platform: string = process.platform,
): boolean {
  try {
    if (fsExists(filePath)) {
      return true
    }

    if (platform === 'win32') {
      const match = filePath.match(/^([a-zA-Z]:[\\/])/i)
      const driveRoot = match ? match[1] : path.win32.parse(path.win32.resolve(filePath)).root
      return fsExists(driveRoot)
    }

    // POSIX path handling
    const normalized = filePath.replace(/\\/g, '/')
    const mountMatch = normalized.match(/^(\/(?:media(?:\/[^/]+)?|mnt|run\/media(?:\/[^/]+)?)\/[^/]+)/)
    if (mountMatch) {
      return fsExists(mountMatch[1])
    }

    let curr = path.posix.dirname(normalized)
    while (curr && curr !== '/') {
      if (fsExists(curr)) return true
      curr = path.posix.dirname(curr)
    }
    return fsExists('/')
  } catch {
    return false
  }
}

export type ResolveKnownFolderOptions = {
  platform?: string
  homeDir?: string
  env?: Record<string, string | undefined>
  regQueryFn?: (key: string, value: string) => string
  readFileFn?: (filePath: string) => string
  driveAccessibleFn?: (filePath: string) => boolean
}

/**
 * Resolves the relocated Windows Downloads folder from User Shell Folders registry.
 */
export function resolveWindowsDownloadsDir(options: ResolveKnownFolderOptions = {}): string | undefined {
  const homeDir = options.homeDir ?? os.homedir()
  const env = options.env ?? process.env
  const runQuery =
    options.regQueryFn ??
    ((key, value) => {
      try {
        return execFileSync('reg', ['query', key, '/v', value], {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        })
      } catch {
        return ''
      }
    })
  const checkAccessible =
    options.driveAccessibleFn ?? (p => isPathDriveAccessible(p, fs.existsSync, 'win32'))

  // 1. Try Known Folder GUID
  let raw = parseWindowsRegistryOutput(
    runQuery(USER_SHELL_FOLDERS_REG_KEY, KNOWN_FOLDER_DOWNLOADS_GUID),
    KNOWN_FOLDER_DOWNLOADS_GUID,
  )
  // 2. Fallback to legacy "Downloads" value if GUID is missing
  if (!raw) {
    raw = parseWindowsRegistryOutput(runQuery(USER_SHELL_FOLDERS_REG_KEY, 'Downloads'), 'Downloads')
  }

  if (raw) {
    const expanded = expandWindowsEnv(raw, env, homeDir)
    if (checkAccessible(expanded)) {
      return path.win32.resolve(expanded)
    }
  }

  return undefined
}

/**
 * Resolves the relocated Linux Downloads folder from XDG user-dirs.
 */
export function resolveLinuxDownloadsDir(options: ResolveKnownFolderOptions = {}): string | undefined {
  const homeDir = options.homeDir ?? os.homedir()
  const env = options.env ?? process.env
  const readFn =
    options.readFileFn ??
    (p => {
      try {
        return fs.readFileSync(p, 'utf8')
      } catch {
        return ''
      }
    })
  const checkAccessible =
    options.driveAccessibleFn ?? (p => isPathDriveAccessible(p, fs.existsSync, 'linux'))

  const configHome = env.XDG_CONFIG_HOME || path.join(homeDir, '.config')
  const userDirsFile = path.join(configHome, 'user-dirs.dirs')
  const content = readFn(userDirsFile)
  if (!content) return undefined

  const raw = parseLinuxUserDirsOutput(content)
  if (!raw) return undefined

  const expanded = raw
    .replace(/\$HOME/g, homeDir)
    .replace(/\$\{HOME\}/g, homeDir)

  if (checkAccessible(expanded)) {
    return path.posix.resolve(expanded)
  }

  return undefined
}

/**
 * Platform-native Downloads folder resolver.
 * Inspects Windows Registry / Linux XDG user-dirs, falling back safely to ~/Downloads.
 */
export function resolvePlatformDownloadsDir(options: ResolveKnownFolderOptions = {}): string {
  const platform = options.platform ?? process.platform
  const homeDir = options.homeDir ?? os.homedir()
  const defaultFallback = path.join(homeDir, 'Downloads')

  if (platform === 'win32') {
    const resolved = resolveWindowsDownloadsDir(options)
    if (resolved) return resolved
  } else if (platform === 'linux') {
    const resolved = resolveLinuxDownloadsDir(options)
    if (resolved) return resolved
  }

  return defaultFallback
}
