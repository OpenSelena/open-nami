import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface AppConfig {
  theme?: 'auto' | 'light' | 'dark'
  cookiesDir?: string
  cookiesFromBrowser?:
    | 'auto'
    | 'none'
    | 'chrome'
    | 'edge'
    | 'brave'
    | 'firefox'
    | 'helium'
    | 'opera'
    | 'vivaldi'
    | (string & {})
  downloadDir?: string
  writeMetadata?: boolean
  defaultLimit?: number
}

export function getDefaultConfigPath(): string {
  if (process.env.OPEN_NAMI_CONFIG && process.env.OPEN_NAMI_CONFIG.trim()) {
    return path.resolve(process.env.OPEN_NAMI_CONFIG.trim())
  }
  return path.join(os.homedir(), '.open-nami', 'config.json')
}

export function loadConfig(configPath = getDefaultConfigPath()): AppConfig {
  try {
    if (!fs.existsSync(configPath)) return {}
    const raw = fs.readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      let cookiesFromBrowser: AppConfig['cookiesFromBrowser'] = 'auto'
      if (typeof parsed.cookiesFromBrowser === 'string') {
        const trimmed = parsed.cookiesFromBrowser.trim()
        const lower = trimmed.toLowerCase()
        if (lower === 'none') {
          cookiesFromBrowser = 'none'
        } else if (lower === 'auto' || trimmed === '') {
          cookiesFromBrowser = 'auto'
        } else {
          const knownBrowsers = ['chrome', 'edge', 'brave', 'firefox', 'helium', 'opera', 'vivaldi']
          cookiesFromBrowser = (knownBrowsers.includes(lower)
            ? lower
            : trimmed) as NonNullable<AppConfig['cookiesFromBrowser']>
        }
      } else {
        cookiesFromBrowser = 'auto'
      }

      return {
        theme: typeof parsed.theme === 'string' ? parsed.theme : undefined,
        cookiesDir: typeof parsed.cookiesDir === 'string' ? parsed.cookiesDir.trim() : undefined,
        cookiesFromBrowser,
        downloadDir: typeof parsed.downloadDir === 'string' ? parsed.downloadDir.trim() : undefined,
        writeMetadata: typeof parsed.writeMetadata === 'boolean' ? parsed.writeMetadata : undefined,
        defaultLimit: typeof parsed.defaultLimit === 'number' ? parsed.defaultLimit : undefined,
      }
    }
  } catch {}
  return {}
}

export function saveConfig(config: AppConfig, configPath = getDefaultConfigPath()): void {
  try {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true, mode: 0o700})
    }
    const data = JSON.stringify(config, null, 2)
    fs.writeFileSync(configPath, data, {encoding: 'utf8', mode: 0o600})
  } catch {}
}
