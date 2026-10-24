import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type BrowserEngine =
  | 'chrome'
  | 'firefox'
  | 'safari'
  | 'edge'
  | 'brave'
  | 'opera'
  | 'vivaldi'
  | 'chromium'

export interface DetectedBrowser {
  id: string
  name: string
  profileDir: string
  available: boolean
  engine?: BrowserEngine
}

export interface BrowserIdentity {
  id: string
  name: string
  engine: BrowserEngine
  profileDir?: string
}

export function listDetectedBrowsers(): DetectedBrowser[] {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const home = os.homedir()

  const candidates: Array<{
    id: string
    name: string
    winDir: string
    macDir: string
    linuxDir: string
    engine?: BrowserEngine
  }> = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      winDir: path.join(
        process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
        'Google',
        'Chrome',
        'User Data',
      ),
      macDir: path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
      linuxDir: path.join(home, '.config', 'google-chrome'),
      engine: 'chrome',
    },
    {
      id: 'edge',
      name: 'Microsoft Edge',
      winDir: path.join(
        process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
        'Microsoft',
        'Edge',
        'User Data',
      ),
      macDir: path.join(home, 'Library', 'Application Support', 'Microsoft Edge'),
      linuxDir: path.join(home, '.config', 'microsoft-edge'),
      engine: 'edge',
    },
    {
      id: 'brave',
      name: 'Brave Browser',
      winDir: path.join(
        process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
        'BraveSoftware',
        'Brave-Browser',
        'User Data',
      ),
      macDir: path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser'),
      linuxDir: path.join(home, '.config', 'BraveSoftware', 'Brave-Browser'),
      engine: 'brave',
    },
    {
      id: 'firefox',
      name: 'Mozilla Firefox',
      winDir: path.join(
        process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
        'Mozilla',
        'Firefox',
        'Profiles',
      ),
      macDir: path.join(home, 'Library', 'Application Support', 'Firefox', 'Profiles'),
      linuxDir: path.join(home, '.mozilla', 'firefox'),
      engine: 'firefox',
    },
    {
      id: 'helium',
      name: 'Helium',
      winDir: path.join(
        process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
        'imput',
        'Helium',
        'User Data',
      ),
      macDir: path.join(home, 'Library', 'Application Support', 'net.imput.Helium'),
      linuxDir: path.join(home, '.config', 'helium'),
      engine: 'chrome',
    },
    {
      id: 'opera',
      name: 'Opera',
      winDir: path.join(
        process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
        'Opera Software',
        'Opera Stable',
      ),
      macDir: path.join(home, 'Library', 'Application Support', 'com.operasoftware.Opera'),
      linuxDir: path.join(home, '.config', 'opera'),
      engine: 'opera',
    },
    {
      id: 'vivaldi',
      name: 'Vivaldi',
      winDir: path.join(
        process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
        'Vivaldi',
        'User Data',
      ),
      macDir: path.join(home, 'Library', 'Application Support', 'Vivaldi'),
      linuxDir: path.join(home, '.config', 'vivaldi'),
      engine: 'vivaldi',
    },
  ]

  return candidates.map(c => {
    const profileDir = isWin ? c.winDir : isMac ? c.macDir : c.linuxDir
    return {
      id: c.id,
      name: c.name,
      profileDir,
      available: fs.existsSync(profileDir),
      engine: c.engine,
    }
  })
}

/**
 * Parses ProgId from Windows registry query output.
 */
export function parseWindowsDefaultBrowserProgId(rawOutput: string): string | null {
  if (!rawOutput) return null
  const lines = rawOutput.split(/\r?\n/)
  const pattern = /^\s*ProgId\s+REG_\w+\s+(\S.*)$/i
  for (const line of lines) {
    const match = line.match(pattern)
    if (match && match[1]) {
      const progId = match[1].trim()
      if (progId) return progId
    }
  }
  return null
}

/**
 * Maps Windows ProgId and optional command output to a structured BrowserIdentity.
 */
export function mapProgIdToBrowserId(
  progId: string,
  commandOutput?: string,
  platformOverride: string = 'win32',
): BrowserIdentity {
  const p = (progId || '').trim()
  const pLower = p.toLowerCase()
  const cmd = (commandOutput || '').toLowerCase()

  const isWin = platformOverride === 'win32'
  const isMac = platformOverride === 'darwin'
  const home = os.homedir()
  const heliumDir = isWin
    ? path.join(
        process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'),
        'imput',
        'Helium',
        'User Data',
      )
    : isMac
    ? path.join(home, 'Library', 'Application Support', 'net.imput.Helium')
    : path.join(home, '.config', 'helium')

  // Helium recognition (ProgId or executable command path)
  if (pLower.includes('helium') || cmd.includes('helium')) {
    return {
      id: 'helium',
      name: 'Helium',
      engine: 'chrome',
      profileDir: heliumDir,
    }
  }

  // Google Chrome
  if (pLower.startsWith('chromehtml') || pLower.includes('chrome') || cmd.includes('chrome.exe')) {
    return {
      id: 'chrome',
      name: 'Google Chrome',
      engine: 'chrome',
    }
  }

  // Microsoft Edge (supports classic and modern AppX identifiers)
  if (
    pLower.startsWith('msedge') ||
    pLower.includes('edge') ||
    pLower.startsWith('appxq0fevzme2pys62n3e0fbqsw5cj08ege9') ||
    cmd.includes('msedge.exe')
  ) {
    return {
      id: 'edge',
      name: 'Microsoft Edge',
      engine: 'edge',
    }
  }

  // Brave Browser
  if (pLower.startsWith('brave') || pLower.includes('brave') || cmd.includes('brave.exe')) {
    return {
      id: 'brave',
      name: 'Brave Browser',
      engine: 'brave',
    }
  }

  // Mozilla Firefox
  if (pLower.startsWith('firefox') || pLower.includes('firefox') || cmd.includes('firefox.exe')) {
    return {
      id: 'firefox',
      name: 'Mozilla Firefox',
      engine: 'firefox',
    }
  }

  // Opera
  if (pLower.startsWith('opera') || pLower.includes('opera') || cmd.includes('opera.exe')) {
    return {
      id: 'opera',
      name: 'Opera',
      engine: 'opera',
    }
  }

  // Vivaldi
  if (pLower.startsWith('vivaldi') || pLower.includes('vivaldi') || cmd.includes('vivaldi.exe')) {
    return {
      id: 'vivaldi',
      name: 'Vivaldi',
      engine: 'vivaldi',
    }
  }

  return {
    id: pLower || 'chromium',
    name: p || 'Chromium',
    engine: 'chromium',
  }
}

/**
 * Parses macOS LaunchServices output for default URL scheme handler bundle ID.
 */
export function parseMacDefaultBrowserBundleId(rawOutput: string): string | null {
  if (!rawOutput) return null
  const blocks = rawOutput.split(/[{}]/)
  let httpBundle: string | null = null

  for (const block of blocks) {
    const isHttps = /LSHandlerURLScheme\s*=\s*https\b/i.test(block)
    const isHttp = /LSHandlerURLScheme\s*=\s*http\b/i.test(block)
    if (!isHttps && !isHttp) continue

    const roleMatch = block.match(/LSHandlerRole(?:All|Viewer)\s*=\s*["']?([^"';\s]+)["']?/i)
    if (roleMatch && roleMatch[1]) {
      const bundleId = roleMatch[1].trim()
      if (isHttps) {
        return bundleId
      }
      if (!httpBundle) {
        httpBundle = bundleId
      }
    }
  }

  return httpBundle
}

/**
 * Maps macOS bundle ID to a structured BrowserIdentity.
 */
export function mapBundleIdToBrowserId(bundleId: string): BrowserIdentity {
  const lower = bundleId.toLowerCase()
  if (lower.includes('helium')) {
    const home = os.homedir()
    return {
      id: 'helium',
      name: 'Helium',
      engine: 'chrome',
      profileDir: path.join(home, 'Library', 'Application Support', 'net.imput.Helium'),
    }
  }
  if (lower.includes('chrome')) {
    return { id: 'chrome', name: 'Google Chrome', engine: 'chrome' }
  }
  if (lower.includes('edge')) {
    return { id: 'edge', name: 'Microsoft Edge', engine: 'edge' }
  }
  if (lower.includes('brave')) {
    return { id: 'brave', name: 'Brave Browser', engine: 'brave' }
  }
  if (lower.includes('firefox')) {
    return { id: 'firefox', name: 'Mozilla Firefox', engine: 'firefox' }
  }
  if (lower.includes('opera')) {
    return { id: 'opera', name: 'Opera', engine: 'opera' }
  }
  if (lower.includes('vivaldi')) {
    return { id: 'vivaldi', name: 'Vivaldi', engine: 'vivaldi' }
  }
  if (lower.includes('safari')) {
    return { id: 'safari', name: 'Safari', engine: 'safari' }
  }
  return { id: lower, name: bundleId, engine: 'chromium' }
}

/**
 * Parses Linux xdg-settings or xdg-mime output for .desktop filename.
 */
export function parseLinuxDefaultBrowserDesktop(rawOutput: string): string | null {
  if (!rawOutput) return null
  const lines = rawOutput.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('ERROR:') && !trimmed.includes('not found')) {
      return trimmed
    }
  }
  return null
}

/**
 * Maps Linux .desktop identifier to a structured BrowserIdentity.
 */
export function mapLinuxDesktopToBrowserId(desktopFile: string): BrowserIdentity {
  const lower = desktopFile.toLowerCase()
  if (lower.includes('helium')) {
    const home = os.homedir()
    return {
      id: 'helium',
      name: 'Helium',
      engine: 'chrome',
      profileDir: path.join(home, '.config', 'helium'),
    }
  }
  if (lower.includes('chrome')) {
    return { id: 'chrome', name: 'Google Chrome', engine: 'chrome' }
  }
  if (lower.includes('edge')) {
    return { id: 'edge', name: 'Microsoft Edge', engine: 'edge' }
  }
  if (lower.includes('brave')) {
    return { id: 'brave', name: 'Brave Browser', engine: 'brave' }
  }
  if (lower.includes('firefox')) {
    return { id: 'firefox', name: 'Mozilla Firefox', engine: 'firefox' }
  }
  if (lower.includes('opera')) {
    return { id: 'opera', name: 'Opera', engine: 'opera' }
  }
  if (lower.includes('vivaldi')) {
    return { id: 'vivaldi', name: 'Vivaldi', engine: 'vivaldi' }
  }
  return { id: lower.replace(/\.desktop$/, ''), name: desktopFile, engine: 'chromium' }
}

function queryWindows(execute: (cmd: string) => string, platformOverride?: string): BrowserIdentity | null {
  let out = execute(
    'reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice" /v ProgId',
  )
  let progId = parseWindowsDefaultBrowserProgId(out)
  if (!progId) {
    out = execute(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId',
    )
    progId = parseWindowsDefaultBrowserProgId(out)
  }
  if (progId) {
    const cmdOut = execute(`reg query "HKCR\\${progId}\\shell\\open\\command"`)
    return mapProgIdToBrowserId(progId, cmdOut, platformOverride ?? 'win32')
  }
  return null
}

function queryMac(execute: (cmd: string) => string): BrowserIdentity | null {
  const out = execute(
    'defaults read com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers',
  )
  const bundleId = parseMacDefaultBrowserBundleId(out)
  if (bundleId) {
    return mapBundleIdToBrowserId(bundleId)
  }
  return null
}

function queryLinux(execute: (cmd: string) => string): BrowserIdentity | null {
  let out = execute('xdg-settings get default-web-browser')
  let desktop = parseLinuxDefaultBrowserDesktop(out)
  if (!desktop) {
    out = execute('xdg-mime query default x-scheme-handler/https')
    desktop = parseLinuxDefaultBrowserDesktop(out)
  }
  if (!desktop) {
    out = execute('xdg-mime query default x-scheme-handler/http')
    desktop = parseLinuxDefaultBrowserDesktop(out)
  }
  if (desktop) {
    return mapLinuxDesktopToBrowserId(desktop)
  }
  return null
}

/**
 * Cross-platform detection of the operating system default web browser.
 * Queries Windows Registry, macOS LaunchServices, or Linux XDG.
 * Falls back gracefully to first available browser in listDetectedBrowsers() or null.
 */
export function detectSystemDefaultBrowser(
  execFn?: (cmd: string) => string,
  platformOverride?: string,
): DetectedBrowser | null {
  const platform = platformOverride ?? process.platform
  const execute =
    execFn ??
    ((cmd: string) => {
      try {
        return execSync(cmd, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 2500,
        })
      } catch {
        return ''
      }
    })

  let detectedInfo: BrowserIdentity | null = null

  if (platform === 'win32') {
    detectedInfo = queryWindows(execute, platform)
  } else if (platform === 'darwin') {
    detectedInfo = queryMac(execute)
  } else if (platform === 'linux') {
    detectedInfo = queryLinux(execute)
  }

  // If mock execFn was supplied without explicit platform override, probe other OS commands
  if (!detectedInfo && execFn && !platformOverride) {
    if (platform !== 'win32') detectedInfo = queryWindows(execute, 'win32')
    if (!detectedInfo && platform !== 'darwin') detectedInfo = queryMac(execute)
    if (!detectedInfo && platform !== 'linux') detectedInfo = queryLinux(execute)
  }

  const allBrowsers = listDetectedBrowsers()

  if (detectedInfo) {
    const matched = allBrowsers.find(b => b.id === detectedInfo!.id)
    if (matched) {
      if (detectedInfo.profileDir) {
        return {
          ...matched,
          profileDir: detectedInfo.profileDir,
          available: fs.existsSync(detectedInfo.profileDir),
        }
      }
      return matched
    }

    const profDir = detectedInfo.profileDir || ''
    return {
      id: detectedInfo.id,
      name: detectedInfo.name || detectedInfo.id,
      profileDir: profDir,
      available: profDir ? fs.existsSync(profDir) : false,
      engine: detectedInfo.engine,
    }
  }

  // Graceful fallback to first available installed browser or null
  const availableFallback = allBrowsers.find(b => b.available)
  return availableFallback || null
}

/**
 * Resolves browser cookie argument for gallery-dl and yt-dlp engines.
 * For Helium: returns chrome:<profileDir> to point Chromium engines to custom user data.
 * For standard browsers: returns browser id.
 * For null/none: returns null.
 */
export function resolveBrowserCookieArg(
  browser: DetectedBrowser | string | null | undefined,
): string | null {
  if (!browser) {
    return null
  }

  if (typeof browser === 'string') {
    const trimmed = browser.trim()
    if (!trimmed || trimmed.toLowerCase() === 'none') {
      return null
    }
    if (trimmed.toLowerCase() === 'helium') {
      const detectedHelium = listDetectedBrowsers().find(b => b.id === 'helium')
      const profileDir = detectedHelium?.profileDir
      return profileDir ? `chrome:${profileDir}` : 'chrome'
    }
    if (trimmed.toLowerCase() === 'auto') {
      const defaultBrowser = detectSystemDefaultBrowser()
      return resolveBrowserCookieArg(defaultBrowser)
    }
    return trimmed
  }

  if (!browser.id || browser.id.toLowerCase() === 'none') {
    return null
  }

  if (browser.id.toLowerCase() === 'helium') {
    const profileDir =
      browser.profileDir || listDetectedBrowsers().find(b => b.id === 'helium')?.profileDir
    return profileDir ? `chrome:${profileDir}` : 'chrome'
  }

  return browser.id
}

export async function exportCookiesForPlatform(
  browserId: string,
  platform: string,
  destPath: string,
): Promise<boolean> {
  const browsers = listDetectedBrowsers()
  const browser = browsers.find(b => b.id === browserId)
  if (!browser || !browser.available) {
    return false
  }
  return false
}
