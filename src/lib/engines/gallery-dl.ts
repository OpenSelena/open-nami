import {spawn} from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs/promises'
import {resolveEngineCommand} from './exec.js'
import {ensureGalleryDl} from './fetcher.js'
import type {ParsedProfile} from '../parser.js'
import type {EngineProgress} from './types.js'

const PHOTO_FILTER = "extension in ('jpg','jpeg','png','gif','webp','bmp','jfif','heic','avif','tiff','svg')"
const VIDEO_FILTER = "extension in ('mp4','mov','webm','mkv','avi','flv','m4v')"
const GDL_ARCHIVE = 'archive_gallery-dl.sqlite3'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const PLATFORM_SLEEP: Record<string, string> = {
  tiktok: '0.6-1.2',
  instagram: '2.0-2.8',
  facebook: '1.5-2.5',
}

export interface GalleryDlOptions {
  profile: ParsedProfile
  targetDir: string
  subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights'
  cookiePath?: string | null
  signal?: AbortSignal
  onProgress?: (progress: EngineProgress) => void
}

export function buildGalleryDlArgs(options: {
  destDir: string
  subDir: 'Photos' | 'Videos' | 'Stories' | 'Highlights'
  platform: ParsedProfile['platform']
  cleanUrl: string
  username: string
  cookiePath?: string | null
}): string[] {
  const {destDir, subDir, platform, cleanUrl, username, cookiePath} = options
  const args = [
    '-D', destDir,
    '-o', `user-agent=${UA}`,
    '-o', 'cookies-update=false',
    '-o', 'headers.sec-ch-ua="Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    '-o', 'headers.sec-ch-ua-mobile=?0',
    '-o', 'headers.sec-ch-ua-platform="Windows"',
    '--download-archive', path.join(destDir, GDL_ARCHIVE),
    '--retries', '3',
    '--sleep-429', '10',
  ]

  let targetUrl = cleanUrl
  const sleepDelay = PLATFORM_SLEEP[platform] || '0.8-1.5'

  if (subDir === 'Photos') {
    args.push('--filter', PHOTO_FILTER)
    if (platform === 'tiktok') {
      args.push('-o', 'videos=false', '-o', 'audio=false')
    } else if (platform === 'instagram') {
      args.push('-o', 'videos=false')
    }
    args.push('--sleep-request', sleepDelay)
  } else if (subDir === 'Videos') {
    args.push('--filter', VIDEO_FILTER)
    args.push('--sleep-request', sleepDelay)
  } else if (subDir === 'Stories') {
    if (platform === 'instagram') {
      targetUrl = `https://www.instagram.com/stories/${encodeURIComponent(username)}/`
      args.push('--sleep-request', '2.0-3.0')
    }
  } else if (subDir === 'Highlights') {
    if (platform === 'instagram') {
      targetUrl = `https://www.instagram.com/${encodeURIComponent(username)}/highlights/`
      args.push('--sleep-request', '2.0-3.0')
    }
  }

  if (cookiePath) {
    args.push('--cookies', cookiePath)
  }

  // End of options prevents CLI flag injection from untrusted URLs
  args.push('--', targetUrl)
  return args
}

export async function runGalleryDl(options: GalleryDlOptions): Promise<{success: boolean; downloaded: number; skipped: number; error?: string}> {
  const {profile, targetDir, subDir, cookiePath, onProgress} = options
  const destDir = path.join(targetDir, subDir)
  await fs.mkdir(destDir, {recursive: true})

  const args = buildGalleryDlArgs({
    destDir,
    subDir,
    platform: profile.platform,
    cleanUrl: profile.cleanUrl,
    username: profile.username,
    cookiePath,
  })

  let downloadedCount = 0
  let skippedCount = 0
  let errorOutput = ''

  try {
    await ensureGalleryDl((status) => {
      onProgress?.({
        job: subDir,
        downloadedCount: 0,
        skippedCount: 0,
        statusText: status,
      })
    }, options.signal)
  } catch (err: any) {
    return {
      success: false,
      downloaded: 0,
      skipped: 0,
      error: err.message || String(err),
    }
  }

  const engineCmd = resolveEngineCommand('gallery-dl')
  const fullArgs = [...engineCmd.baseArgs, ...args]

  return new Promise((resolve) => {
    const child = spawn(engineCmd.command, fullArgs, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: options.signal,
    })

    const handleLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return

      if (trimmed.startsWith('#')) {
        skippedCount++
        const filename = path.basename(trimmed.slice(1).trim())
        onProgress?.({
          job: subDir,
          downloadedCount,
          skippedCount,
          currentFile: filename,
          statusText: `Skipped: ${filename}`,
        })
      } else if (trimmed.match(/\.(jpe?g|png|gif|webp|bmp|jfif|heic|avif|tiff|svg|mp4|mov|webm|mkv|avi|flv|m4v)$/i) || trimmed.includes(path.sep)) {
        downloadedCount++
        const filename = path.basename(trimmed)
        onProgress?.({
          job: subDir,
          downloadedCount,
          skippedCount,
          currentFile: filename,
          statusText: `Downloaded: ${filename}`,
        })
      }
    }

    let stdoutBuffer = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf8')
      const lines = stdoutBuffer.split(/\r?\n/)
      stdoutBuffer = lines.pop() || ''
      for (const line of lines) handleLine(line)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      errorOutput += text
      if (text.includes('429 Too Many Requests') || text.includes('Waiting for')) {
        onProgress?.({
          job: subDir,
          downloadedCount,
          skippedCount,
          statusText: 'rate-limited by platform, waiting…',
        })
      }
    })

    child.on('close', (code) => {
      if (stdoutBuffer) handleLine(stdoutBuffer)
      resolve({
        success: code === 0,
        downloaded: downloadedCount,
        skipped: skippedCount,
        error: code !== 0 ? errorOutput.slice(-300) : undefined,
      })
    })

    child.on('error', (err) => {
      resolve({
        success: false,
        downloaded: downloadedCount,
        skipped: skippedCount,
        error: err.message,
      })
    })
  })
}
