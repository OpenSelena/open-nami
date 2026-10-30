import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)

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

export interface BrowserCandidate {
  id: string
  name: string
  winDirs: string[]
  macDirs: string[]
  linuxDirs: string[]
  engine: BrowserEngine
}

export function listDetectedBrowsers(): DetectedBrowser[] {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const home = os.homedir()

  const candidates: BrowserCandidate[] = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      winDirs: [
        path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Google', 'Chrome', 'User Data'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
      ],
      linuxDirs: [
        path.join(home, '.config', 'google-chrome'),
        path.join(home, '.var', 'app', 'com.google.Chrome', 'config', 'google-chrome'),
        path.join(home, '.config', 'chromium'),
        path.join(home, '.var', 'app', 'org.chromium.Chromium', 'config', 'chromium'),
      ],
      engine: 'chrome',
    },
    {
      id: 'edge',
      name: 'Microsoft Edge',
      winDirs: [
        path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Microsoft', 'Edge', 'User Data'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'Microsoft Edge'),
      ],
      linuxDirs: [
        path.join(home, '.config', 'microsoft-edge'),
        path.join(home, '.var', 'app', 'com.microsoft.Edge', 'config', 'microsoft-edge'),
      ],
      engine: 'edge',
    },
    {
      id: 'brave',
      name: 'Brave Browser',
      winDirs: [
        path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'BraveSoftware', 'Brave-Browser', 'User Data'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser'),
      ],
      linuxDirs: [
        path.join(home, '.config', 'BraveSoftware', 'Brave-Browser'),
        path.join(home, '.var', 'app', 'com.brave.Browser', 'config', 'BraveSoftware', 'Brave-Browser'),
      ],
      engine: 'brave',
    },
    {
      id: 'firefox',
      name: 'Mozilla Firefox',
      winDirs: [
        path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Mozilla', 'Firefox', 'Profiles'),
        path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Mozilla', 'Firefox'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'Firefox', 'Profiles'),
        path.join(home, 'Library', 'Application Support', 'Firefox'),
      ],
      linuxDirs: [
        path.join(home, '.config', 'mozilla', 'firefox'),
        path.join(home, '.mozilla', 'firefox'),
        path.join(home, '.var', 'app', 'org.mozilla.firefox', '.mozilla', 'firefox'),
      ],
      engine: 'firefox',
    },
    {
      id: 'zen',
      name: 'Zen Browser',
      winDirs: [
        path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'zen', 'Profiles'),
        path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'zen'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'zen', 'Profiles'),
        path.join(home, 'Library', 'Application Support', 'zen'),
      ],
      linuxDirs: [
        path.join(home, '.var', 'app', 'app.zen_browser.zen', '.zen'),
        path.join(home, '.zen'),
      ],
      engine: 'firefox',
    },
    {
      id: 'helium',
      name: 'Helium',
      winDirs: [
        path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'imput', 'Helium', 'User Data'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'net.imput.Helium'),
      ],
      linuxDirs: [
        path.join(home, '.config', 'helium'),
        path.join(home, '.var', 'app', 'net.imput.Helium', 'config', 'helium'),
      ],
      engine: 'chrome',
    },
    {
      id: 'opera',
      name: 'Opera',
      winDirs: [
        path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Opera Software', 'Opera Stable'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'com.operasoftware.Opera'),
      ],
      linuxDirs: [
        path.join(home, '.config', 'opera'),
        path.join(home, '.var', 'app', 'com.opera.Opera', 'config', 'opera'),
      ],
      engine: 'opera',
    },
    {
      id: 'vivaldi',
      name: 'Vivaldi',
      winDirs: [
        path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Vivaldi', 'User Data'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'Vivaldi'),
      ],
      linuxDirs: [
        path.join(home, '.config', 'vivaldi'),
        path.join(home, '.var', 'app', 'com.vivaldi.Vivaldi', 'config', 'vivaldi'),
      ],
      engine: 'vivaldi',
    },
    {
      id: 'librewolf',
      name: 'LibreWolf',
      winDirs: [
        path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'librewolf', 'Profiles'),
      ],
      macDirs: [
        path.join(home, 'Library', 'Application Support', 'librewolf', 'Profiles'),
      ],
      linuxDirs: [
        path.join(home, '.librewolf'),
        path.join(home, '.var', 'app', 'io.gitlab.librewolf-community', '.librewolf'),
      ],
      engine: 'firefox',
    },
  ]

  return candidates.map(c => {
    const dirs = isWin ? c.winDirs : isMac ? c.macDirs : c.linuxDirs
    const existing = dirs.find(d => {
      try {
        return fs.existsSync(d)
      } catch {
        return false
      }
    })
    const profileDir = existing || dirs[0] || ''
    return {
      id: c.id,
      name: c.name,
      profileDir,
      available: Boolean(existing),
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
      if (/^[a-zA-Z0-9_.-]+$/.test(progId)) return progId
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

  // Zen Browser
  if (pLower.includes('zen') || cmd.includes('zen')) {
    return {
      id: 'zen',
      name: 'Zen Browser',
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
  if (lower.includes('zen')) {
    return { id: 'zen', name: 'Zen Browser', engine: 'firefox' }
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
  if (lower.includes('zen')) {
    return { id: 'zen', name: 'Zen Browser', engine: 'firefox' }
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
 * Finds the actual profile directory containing cookies.sqlite for a Gecko/Firefox browser.
 * Inspects profiles.ini or scans subdirectories.
 */
export function findGeckoProfileDir(baseDir: string): string | null {
  if (!baseDir) return null
  try {
    if (!fs.existsSync(baseDir)) return null
  } catch {
    return null
  }

  // 1. If baseDir itself directly contains cookies.sqlite, return baseDir
  try {
    if (fs.existsSync(path.join(baseDir, 'cookies.sqlite'))) {
      return baseDir
    }
  } catch {}

  // 2. Try profiles.ini
  const iniPath = path.join(baseDir, 'profiles.ini')
  if (fs.existsSync(iniPath)) {
    try {
      const content = fs.readFileSync(iniPath, 'utf8')
      const lines = content.split(/\r?\n/)
      let defaultPath: string | null = null
      let firstPath: string | null = null
      let currentPath: string | null = null
      let currentIsDefault = false

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('[')) {
          if (currentPath) {
            if (currentIsDefault && !defaultPath) defaultPath = currentPath
            if (!firstPath) firstPath = currentPath
          }
          currentPath = null
          currentIsDefault = false
        } else if (trimmed.startsWith('Path=')) {
          currentPath = trimmed.slice(5).trim()
        } else if (trimmed === 'Default=1') {
          currentIsDefault = true
        }
      }
      if (currentPath) {
        if (currentIsDefault && !defaultPath) defaultPath = currentPath
        if (!firstPath) firstPath = currentPath
      }

      const targetRel = defaultPath || firstPath
      if (targetRel) {
        const full = path.isAbsolute(targetRel) ? targetRel : path.join(baseDir, targetRel)
        if (fs.existsSync(path.join(full, 'cookies.sqlite'))) {
          return full
        }
      }
    } catch {}
  }

  // 3. Fallback scan subdirectories for cookies.sqlite
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true })
    const sorted = entries
      .filter(e => e.isDirectory())
      .sort((a, b) => {
        const aScore = a.name.includes('default-release') ? 2 : a.name.includes('default') ? 1 : 0
        const bScore = b.name.includes('default-release') ? 2 : b.name.includes('default') ? 1 : 0
        return bScore - aScore
      })
    for (const entry of sorted) {
      const full = path.join(baseDir, entry.name)
      if (fs.existsSync(path.join(full, 'cookies.sqlite'))) {
        return full
      }
    }
  } catch {}

  return null
}

/**
 * Extracts platform cookies from Gecko/Firefox cookies.sqlite into Netscape format string.
 * Uses an ephemeral temporary copy to bypass SQLite database locking while the browser is open.
 */
export function extractGeckoCookiesToNetscape(
  profileDir: string,
  platformDomains: string[],
): string | null {
  const sqliteFile = path.join(profileDir, 'cookies.sqlite')
  if (!fs.existsSync(sqliteFile)) return null

  const tempDb = path.join(
    os.tmpdir(),
    `open_nami_gecko_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`,
  )
  const tempWal = `${tempDb}-wal`
  const srcWal = `${sqliteFile}-wal`

  try {
    fs.copyFileSync(sqliteFile, tempDb)
    if (fs.existsSync(srcWal)) {
      try {
        fs.copyFileSync(srcWal, tempWal)
      } catch {}
    }

    let DatabaseSync: any
    try {
      const sqliteModule = require('node:sqlite')
      DatabaseSync = sqliteModule?.DatabaseSync
    } catch {
      return null
    }
    if (!DatabaseSync) return null

    const db = new DatabaseSync(tempDb, { open: true, readOnly: true })
    const whereClauses = platformDomains.map(() => 'host LIKE ?').join(' OR ')
    const query = `SELECT host, path, isSecure, expiry, name, value, isHttpOnly FROM moz_cookies ${
      whereClauses ? `WHERE ${whereClauses}` : ''
    }`
    const stmt = db.prepare(query)
    const rows = stmt.all(...platformDomains) as Array<{
      host: string
      path: string
      isSecure: number
      expiry: number
      name: string
      value: string
      isHttpOnly: number
    }>
    db.close()

    if (!rows || rows.length === 0) return null

    const lines = ['# Netscape HTTP Cookie File']
    for (const r of rows) {
      const domain = r.isHttpOnly ? `#HttpOnly_${r.host}` : r.host
      const sub = r.host.startsWith('.') ? 'TRUE' : 'FALSE'
      const p = r.path || '/'
      const sec = r.isSecure ? 'TRUE' : 'FALSE'
      let exp = r.expiry || 0
      if (exp > 1e13) exp = Math.floor(exp / 1000000)
      else if (exp > 1e11) exp = Math.floor(exp / 1000)
      else exp = Math.floor(exp)

      lines.push(`${domain}\t${sub}\t${p}\t${sec}\t${exp}\t${r.name}\t${r.value}`)
    }

    return lines.join('\n') + '\n'
  } catch {
    return null
  } finally {
    try {
      if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb)
    } catch {}
    try {
      if (fs.existsSync(tempWal)) fs.unlinkSync(tempWal)
    } catch {}
  }
}

/**
 * Resolves browser cookie argument for gallery-dl and yt-dlp engines.
 * For Helium: returns chrome:<profileDir> to point Chromium engines to custom user data.
 * For Zen: returns firefox:<profileDir> pointing to Gecko profile.
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
    const lower = trimmed.toLowerCase()
    if (lower === 'auto') {
      const defaultBrowser = detectSystemDefaultBrowser()
      return resolveBrowserCookieArg(defaultBrowser)
    }
    if (lower === 'helium') {
      const detectedHelium = listDetectedBrowsers().find(b => b.id === 'helium')
      const profileDir = detectedHelium?.profileDir
      return profileDir ? `chrome:${profileDir}` : 'chrome'
    }
    if (lower === 'zen') {
      const detectedZen = listDetectedBrowsers().find(b => b.id === 'zen')
      if (detectedZen?.profileDir) {
        const geckoDir = findGeckoProfileDir(detectedZen.profileDir)
        return geckoDir ? `firefox:${geckoDir}` : `firefox:${detectedZen.profileDir}`
      }
      return 'firefox'
    }
    return trimmed
  }

  if (!browser.id || browser.id.toLowerCase() === 'none') {
    return null
  }

  const id = browser.id.toLowerCase()
  if (id === 'helium') {
    const profileDir =
      browser.profileDir || listDetectedBrowsers().find(b => b.id === 'helium')?.profileDir
    return profileDir ? `chrome:${profileDir}` : 'chrome'
  }

  if (id === 'zen') {
    const profileDir =
      browser.profileDir || listDetectedBrowsers().find(b => b.id === 'zen')?.profileDir
    if (profileDir) {
      const geckoDir = findGeckoProfileDir(profileDir)
      return geckoDir ? `firefox:${geckoDir}` : `firefox:${profileDir}`
    }
    return 'firefox'
  }

  return browser.id
}

/**
 * Automatically extracts session cookies for a specific social media platform from
 * the user's browser, serializing them into a standard Netscape cookie file at destPath.
 */
export async function exportCookiesForPlatform(
  browserId: string,
  platform: string,
  destPath: string,
): Promise<boolean> {
  const browsers = listDetectedBrowsers()
  let browser: DetectedBrowser | undefined

  if (browserId.toLowerCase() === 'auto') {
    browser = detectSystemDefaultBrowser() ?? undefined
    if (!browser || !browser.available || !browser.profileDir) {
      browser = browsers.find(b => b.available && b.profileDir)
    }
  } else {
    browser = browsers.find(b => b.id.toLowerCase() === browserId.toLowerCase())
  }

  if (!browser || !browser.available || !browser.profileDir) {
    return false
  }

  if (browser.engine === 'firefox') {
    const profileDir = findGeckoProfileDir(browser.profileDir)
    if (!profileDir) return false

    const platformDomainMap: Record<string, string[]> = {
      instagram: ['%instagram.com%'],
      tiktok: ['%tiktok.com%'],
      facebook: ['%facebook.com%'],
      x: ['%x.com%', '%twitter.com%'],
      twitter: ['%x.com%', '%twitter.com%'],
    }

    const domains = platformDomainMap[platform.toLowerCase()] || [`%${platform.toLowerCase()}%`]
    const netscapeData = extractGeckoCookiesToNetscape(profileDir, domains)
    if (!netscapeData) return false

    try {
      fs.mkdirSync(path.dirname(destPath), { recursive: true })
      fs.writeFileSync(destPath, netscapeData, { encoding: 'utf8', mode: 0o600 })
      return true
    } catch {
      return false
    }
  }

  return false
}
