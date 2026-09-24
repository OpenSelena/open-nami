import {spawn} from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs/promises'
import {resolveEngineCommand} from './exec.js'
import {ensureYtDlp} from './fetcher.js'
import type {ParsedProfile} from '../parser.js'
import type {EngineProgress} from './types.js'

const YTDLP_ARCHIVE = 'archive_yt-dlp.txt'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface YtDlpOptions {
  profile: ParsedProfile
  targetDir: string
  cookiePath?: string | null
  signal?: AbortSignal
  onProgress?: (progress: EngineProgress) => void
}

export function buildYtDlpArgs(options: {
  destDir: string
  platform: ParsedProfile['platform']
  cleanUrl: string
  cookiePath?: string | null
}): string[] {
  const {destDir, platform, cleanUrl, cookiePath} = options
  const args = [
    '-o', path.join(destDir, '%(title).150B [%(id)s].%(ext)s'),
    '--windows-filenames',
    '--newline',
    '--ignore-errors',
    '--no-overwrites',
    '--user-agent', UA,
    '--download-archive', path.join(destDir, YTDLP_ARCHIVE),
    '--concurrent-fragments', '4',
    '--retries', '3',
    '--fragment-retries', '5',
    '--impersonate', 'chrome',
  ]

  if (platform === 'tiktok') {
    args.push('--sleep-requests', '0.5:1.2', '--retry-sleep', '429:exp=5:30')
  } else if (platform === 'instagram') {
    args.push('--sleep-requests', '1.0:2.0', '--retry-sleep', '429:exp=5:30')
  } else if (platform === 'x') {
    args.push('--sleep-requests', '0.8:1.8', '--retry-sleep', '429:exp=5:30')
  }

  if (cookiePath) {
    args.push('--cookies', cookiePath)
  }

  // End of options prevents CLI flag injection from untrusted URLs
  args.push('--', cleanUrl)
  return args
}

export async function runYtDlp(options: YtDlpOptions): Promise<{success: boolean; downloaded: number; skipped: number; error?: string}> {
  const {profile, targetDir, cookiePath, onProgress} = options
  const destDir = path.join(targetDir, 'Videos')
  await fs.mkdir(destDir, {recursive: true})

  const args = buildYtDlpArgs({
    destDir,
    platform: profile.platform,
    cleanUrl: profile.cleanUrl,
    cookiePath,
  })

  let downloadedCount = 0
  let skippedCount = 0
  let errorOutput = ''

  try {
    await ensureYtDlp((status) => {
      onProgress?.({
        job: 'Videos',
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

  const engineCmd = resolveEngineCommand('yt-dlp')
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

      if (trimmed.includes('has already been recorded in the archive') || trimmed.includes('[download] Destination:') && trimmed.includes('already exists')) {
        skippedCount++
        onProgress?.({
          job: 'Videos',
          downloadedCount,
          skippedCount,
          statusText: 'Skipped: Already archived',
        })
      } else if (trimmed.includes('[download] Destination:')) {
        const dest = trimmed.replace('[download] Destination:', '').trim()
        const filename = path.basename(dest)
        onProgress?.({
          job: 'Videos',
          downloadedCount,
          skippedCount,
          currentFile: filename,
          statusText: `Downloading: ${filename}`,
        })
      } else if (trimmed.includes('100% of')) {
        downloadedCount++
        onProgress?.({
          job: 'Videos',
          downloadedCount,
          skippedCount,
          statusText: `Completed ${downloadedCount} videos`,
        })
      } else if (trimmed.startsWith('ERROR:')) {
        errorOutput += trimmed + '\n'
      }
    }

    let stdoutBuffer = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf8')
      const lines = stdoutBuffer.split(/\r?\n/)
      stdoutBuffer = lines.pop() || ''
      for (const line of lines) handleLine(line)
    })

    let stderrBuffer = ''
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      stderrBuffer += text
      const lines = stderrBuffer.split(/\r?\n/)
      stderrBuffer = lines.pop() || ''
      for (const line of lines) handleLine(line)
    })

    child.on('close', (code) => {
      if (stdoutBuffer) handleLine(stdoutBuffer)
      if (stderrBuffer) handleLine(stderrBuffer)
      resolve({
        success: code === 0 || downloadedCount > 0,
        downloaded: downloadedCount,
        skipped: skippedCount,
        error: code !== 0 && downloadedCount === 0 ? errorOutput.slice(-300) : undefined,
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
