import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { detectAvailableCookies } from '../cookies.js'
import { resolveEngineCommand } from '../engines/exec.js'

const execFileAsync = promisify(execFile)

export interface DoctorReport {
  nodeVersion: string
  binaries: Record<'gallery-dl' | 'yt-dlp' | 'ffmpeg', boolean>
  cookies: Record<string, boolean>
  storageOk: boolean
}

export interface DoctorOptions {
  cookiesDir?: string
  storageDir?: string
  binaryChecker?: (bin: 'gallery-dl' | 'yt-dlp' | 'ffmpeg') => Promise<boolean>
}

async function defaultCheckBinary(bin: 'gallery-dl' | 'yt-dlp' | 'ffmpeg'): Promise<boolean> {
  const versionFlag = bin === 'ffmpeg' ? '-version' : '--version'
  try {
    await execFileAsync(bin, [versionFlag], { timeout: 3000 })
    return true
  } catch {
    if (bin === 'gallery-dl' || bin === 'yt-dlp') {
      try {
        const resolved = resolveEngineCommand(bin)
        await execFileAsync(resolved.command, [...resolved.baseArgs, versionFlag], { timeout: 3000 })
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorReport> {
  const check = options.binaryChecker ?? defaultCheckBinary

  const [gdl, ytdlp, ffmpeg] = await Promise.all([
    check('gallery-dl'),
    check('yt-dlp'),
    check('ffmpeg'),
  ])

  const availableCookies = detectAvailableCookies(options.cookiesDir)
  const cookieStatus: Record<string, boolean> = {
    instagram: availableCookies.includes('instagram'),
    tiktok: availableCookies.includes('tiktok'),
    facebook: availableCookies.includes('facebook'),
    x: availableCookies.includes('x'),
  }

  let storageOk = false
  try {
    const testDir = options.storageDir || path.join(os.homedir(), '.open-nami')
    fs.mkdirSync(testDir, { recursive: true })
    const testFile = path.join(testDir, `.doctor_test_${Date.now()}_${Math.random().toString(36).slice(2)}`)
    fs.writeFileSync(testFile, 'ok')
    fs.unlinkSync(testFile)
    storageOk = true
  } catch {}

  return {
    nodeVersion: process.version,
    binaries: {
      'gallery-dl': gdl,
      'yt-dlp': ytdlp,
      ffmpeg,
    },
    cookies: cookieStatus,
    storageOk,
  }
}
