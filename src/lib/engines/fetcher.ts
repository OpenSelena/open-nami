import {spawn, type ChildProcess} from 'node:child_process'
import {createWriteStream} from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'

export function getOpenNamiBinDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.OPEN_NAMI_BIN_DIR && env.OPEN_NAMI_BIN_DIR.trim()) {
    return path.resolve(env.OPEN_NAMI_BIN_DIR.trim())
  }
  const base = env.OPEN_NAMI_DIR && env.OPEN_NAMI_DIR.trim() ? env.OPEN_NAMI_DIR.trim() : os.homedir()
  return path.join(base, '.open-nami', 'bin')
}

export const YTDLP_RELEASE_BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download'
export const GALLERYDL_CODEBERG_API = 'https://codeberg.org/api/v1/repos/mikf/gallery-dl/releases/latest'
export const GALLERYDL_GITHUB_FALLBACK = 'https://github.com/mikf/gallery-dl/releases/latest/download'

export function ytDlpAssetName(platform: string = process.platform, arch: string = process.arch): string {
  if (platform === 'win32') return 'yt-dlp.exe'
  if (platform === 'darwin') return 'yt-dlp_macos'
  return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux'
}

export function galleryDlAssetName(platform: string = process.platform): string {
  if (platform === 'win32') return 'gallery-dl.exe'
  return 'gallery-dl.bin'
}

export function commandWorks(cmd: string, args: string[], timeoutMs = 10_000): Promise<boolean> {
  return new Promise(resolve => {
    let child: ChildProcess
    try {
      child = spawn(cmd, args, {stdio: 'ignore', timeout: timeoutMs})
    } catch {
      resolve(false)
      return
    }
    child.on('error', () => resolve(false))
    child.on('close', code => resolve(code === 0))
  })
}

export function getBinaryVersion(executablePath: string): Promise<string | undefined> {
  return new Promise(resolve => {
    let child: ChildProcess
    let out = ''
    try {
      child = spawn(executablePath, ['--version'])
    } catch {
      resolve(undefined)
      return
    }
    child.stdout?.on('data', (d: Buffer) => {
      out += d.toString()
    })
    child.on('error', () => resolve(undefined))
    child.on('close', code => {
      if (code === 0 && out.trim()) {
        resolve(out.trim())
      } else {
        resolve(undefined)
      }
    })
  })
}

export async function downloadBinary(
  url: string,
  targetFile: string,
  signal?: AbortSignal,
): Promise<string> {
  await fs.mkdir(path.dirname(targetFile), {recursive: true})
  const response = await fetch(url, {
    signal,
    headers: {'User-Agent': 'open-nami'},
  })
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download binary from ${url} (HTTP ${response.status}). Check your connection and try again.`)
  }
  const tmp = `${targetFile}.download`
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(tmp), {signal})
  try {
    await fs.chmod(tmp, 0o755)
  } catch {}
  await fs.rename(tmp, targetFile)
  return targetFile
}

export async function downloadLatestYtDlp(
  targetDir?: string,
  signal?: AbortSignal,
  onStatus?: (msg: string) => void,
): Promise<string> {
  const dir = targetDir || getOpenNamiBinDir()
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  const local = path.join(dir, binaryName)
  const asset = ytDlpAssetName()
  const url = `${YTDLP_RELEASE_BASE}/${asset}`

  onStatus?.(`fetching latest yt-dlp (${asset})…`)
  return await downloadBinary(url, local, signal)
}

export async function getGalleryDlDownloadUrls(
  assetName: string,
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<string[]> {
  const urls: string[] = []

  // Try Codeberg API for latest release assets
  try {
    const res = await fetchFn(GALLERYDL_CODEBERG_API, {
      signal,
      headers: {'User-Agent': 'open-nami'},
    })
    if (res.ok) {
      const data = (await res.json()) as {
        tag_name?: string
        assets?: Array<{
          name?: string
          download_url?: string
          browser_download_url?: string
        }>
      }
      const asset = data.assets?.find(a => a.name === assetName)
      const downloadUrl = asset?.browser_download_url || asset?.download_url
      if (downloadUrl) {
        urls.push(downloadUrl)
      } else if (data.tag_name) {
        urls.push(`https://codeberg.org/mikf/gallery-dl/releases/download/${data.tag_name}/${assetName}`)
      }
    }
  } catch {}

  // Fallback to GitHub releases mirror
  urls.push(`${GALLERYDL_GITHUB_FALLBACK}/${assetName}`)

  return urls
}

export async function downloadLatestGalleryDl(
  targetDir?: string,
  signal?: AbortSignal,
  onStatus?: (msg: string) => void,
): Promise<string> {
  if (process.platform === 'darwin') {
    throw new Error(
      "Standalone gallery-dl binary is not distributed for macOS. Please install it via Homebrew: 'brew install gallery-dl'",
    )
  }

  const dir = targetDir || getOpenNamiBinDir()
  const binaryName = process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl'
  const local = path.join(dir, binaryName)
  const asset = galleryDlAssetName()

  const candidateUrls = await getGalleryDlDownloadUrls(asset, fetch, signal)
  let lastError: Error | undefined

  for (const url of candidateUrls) {
    try {
      onStatus?.('fetching gallery-dl from Codeberg / GitHub…')
      return await downloadBinary(url, local, signal)
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw new Error(`Could not download gallery-dl (${lastError?.message || 'unknown error'}). Check your connection and try again.`)
}

export async function ensureYtDlp(
  onStatus?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (await commandWorks('yt-dlp', ['--version'])) return 'yt-dlp'

  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  const local = path.join(getOpenNamiBinDir(), binaryName)
  if (await commandWorks(local, ['--version'])) return local

  if (await commandWorks('python', ['-m', 'yt_dlp', '--version'])) return 'python'
  if (await commandWorks('python3', ['-m', 'yt_dlp', '--version'])) return 'python3'

  onStatus?.('first run: downloading standalone yt-dlp…')
  return await downloadLatestYtDlp(getOpenNamiBinDir(), signal, onStatus)
}

export async function ensureGalleryDl(
  onStatus?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (await commandWorks('gallery-dl', ['--version'])) return 'gallery-dl'

  const binaryName = process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl'
  const local = path.join(getOpenNamiBinDir(), binaryName)
  if (await commandWorks(local, ['--version'])) return local

  if (await commandWorks('python', ['-m', 'gallery_dl', '--version'])) return 'python'
  if (await commandWorks('python3', ['-m', 'gallery_dl', '--version'])) return 'python3'

  onStatus?.('first run: downloading standalone gallery-dl…')
  return await downloadLatestGalleryDl(getOpenNamiBinDir(), signal, onStatus)
}

export interface EngineUpdateResult {
  engine: 'yt-dlp' | 'gallery-dl'
  previousVersion?: string
  currentVersion: string
  updated: boolean
}

export async function updateYtDlp(options?: {
  force?: boolean
  onStatus?: (msg: string) => void
  signal?: AbortSignal
}): Promise<EngineUpdateResult> {
  const onStatus = options?.onStatus ?? (() => {})
  const signal = options?.signal
  const dir = getOpenNamiBinDir()
  const binaryName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  const local = path.join(dir, binaryName)

  let previousVersion: string | undefined
  if (await commandWorks(local, ['--version'])) {
    previousVersion = await getBinaryVersion(local)
  } else if (await commandWorks('yt-dlp', ['--version'])) {
    previousVersion = await getBinaryVersion('yt-dlp')
  }

  onStatus('fetching fresh standalone yt-dlp release…')
  const downloadedPath = await downloadLatestYtDlp(dir, signal, onStatus)
  const currentVersion = (await getBinaryVersion(downloadedPath)) ?? 'unknown'

  return {
    engine: 'yt-dlp',
    previousVersion,
    currentVersion,
    updated: previousVersion !== currentVersion,
  }
}

export async function updateGalleryDl(options?: {
  force?: boolean
  onStatus?: (msg: string) => void
  signal?: AbortSignal
}): Promise<EngineUpdateResult> {
  const onStatus = options?.onStatus ?? (() => {})
  const signal = options?.signal
  const dir = getOpenNamiBinDir()
  const binaryName = process.platform === 'win32' ? 'gallery-dl.exe' : 'gallery-dl'
  const local = path.join(dir, binaryName)

  let previousVersion: string | undefined
  if (await commandWorks(local, ['--version'])) {
    previousVersion = await getBinaryVersion(local)
  } else if (await commandWorks('gallery-dl', ['--version'])) {
    previousVersion = await getBinaryVersion('gallery-dl')
  }

  onStatus('fetching fresh standalone gallery-dl release…')
  const downloadedPath = await downloadLatestGalleryDl(dir, signal, onStatus)
  const currentVersion = (await getBinaryVersion(downloadedPath)) ?? 'unknown'

  return {
    engine: 'gallery-dl',
    previousVersion,
    currentVersion,
    updated: previousVersion !== currentVersion,
  }
}
