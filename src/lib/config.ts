import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface AppConfig {
  theme?: 'auto' | 'light' | 'dark'
  cookiesDir?: string
  downloadDir?: string
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
      return {
        theme: typeof parsed.theme === 'string' ? parsed.theme : undefined,
        cookiesDir: typeof parsed.cookiesDir === 'string' ? parsed.cookiesDir.trim() : undefined,
        downloadDir: typeof parsed.downloadDir === 'string' ? parsed.downloadDir.trim() : undefined,
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
