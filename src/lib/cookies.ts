import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {loadConfig} from './config.js'
import type {Platform} from './parser.js'

export interface ResolvedCookie {
  filePath: string
  isTemporary: boolean
  cleanup: () => Promise<void>
}

export const CANDIDATE_DIRS: string[] = [
  path.join(process.cwd(), 'cookies'),
  path.join(os.homedir(), '.open-nami', 'cookies'),
  path.join(os.homedir(), '.nami', 'cookies'),
]

export function getCandidateDirs(customDir?: string): string[] {
  const dirs: string[] = []
  const configured = loadConfig().cookiesDir
  const custom = customDir || process.env.OPEN_NAMI_COOKIES_DIR || process.env.NAMI_COOKIES_DIR || configured
  if (custom && custom.trim()) {
    dirs.push(path.resolve(custom.trim()))
  }
  const seen = new Set(dirs.map(d => path.normalize(d).toLowerCase()))
  for (const dir of CANDIDATE_DIRS) {
    const norm = path.normalize(dir).toLowerCase()
    if (!seen.has(norm)) {
      seen.add(norm)
      dirs.push(dir)
    }
  }
  return dirs
}

export function findCookieFile(platform: Platform, customDir?: string): string | null {
  if (platform === 'unknown') return null

  const domainNames: Record<Platform, string[]> = {
    instagram: ['instagram.com_cookies.txt'],
    tiktok: ['tiktok.com_cookies.txt'],
    facebook: ['facebook.com_cookies.txt', 'fb.com_cookies.txt'],
    x: ['x.com_cookies.txt', 'twitter.com_cookies.txt'],
    unknown: [],
  }

  const filenames = domainNames[platform] || []
  const candidateDirs = getCandidateDirs(customDir)

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue
    for (const file of filenames) {
      const fullPath = path.join(dir, file)
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath)
          if (stats.size > 20) {
            return fullPath
          }
        } catch {}
      }
    }
  }

  return null
}

export function detectAvailableCookies(customDir?: string): Platform[] {
  const platforms: Platform[] = ['instagram', 'tiktok', 'facebook', 'x']
  return platforms.filter(p => Boolean(findCookieFile(p, customDir)))
}

export async function createSafeCookieCopy(masterPath: string): Promise<ResolvedCookie> {
  const userTempDir = path.join(os.homedir(), '.open-nami', 'temp')
  let targetDir = userTempDir
  try {
    await fsPromises.mkdir(userTempDir, {recursive: true, mode: 0o700})
  } catch {
    targetDir = os.tmpdir()
  }

  const tempPath = path.join(targetDir, `nami_cookie_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`)
  await fsPromises.copyFile(masterPath, tempPath)
  await fsPromises.chmod(tempPath, 0o600).catch(() => {})

  return {
    filePath: tempPath,
    isTemporary: true,
    cleanup: async () => {
      try {
        await fsPromises.unlink(tempPath)
      } catch {}
    },
  }
}
