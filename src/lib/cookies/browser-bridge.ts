import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface DetectedBrowser {
  id: string
  name: string
  profileDir: string
  available: boolean
}

export function listDetectedBrowsers(): DetectedBrowser[] {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const home = os.homedir()

  const candidates: Array<{ id: string; name: string; winDir: string; macDir: string; linuxDir: string }> = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      winDir: path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Google', 'Chrome', 'User Data'),
      macDir: path.join(home, 'Library', 'Application Support', 'Google', 'Chrome'),
      linuxDir: path.join(home, '.config', 'google-chrome'),
    },
    {
      id: 'edge',
      name: 'Microsoft Edge',
      winDir: path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Microsoft', 'Edge', 'User Data'),
      macDir: path.join(home, 'Library', 'Application Support', 'Microsoft Edge'),
      linuxDir: path.join(home, '.config', 'microsoft-edge'),
    },
    {
      id: 'brave',
      name: 'Brave Browser',
      winDir: path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'BraveSoftware', 'Brave-Browser', 'User Data'),
      macDir: path.join(home, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser'),
      linuxDir: path.join(home, '.config', 'BraveSoftware', 'Brave-Browser'),
    },
    {
      id: 'firefox',
      name: 'Mozilla Firefox',
      winDir: path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Mozilla', 'Firefox', 'Profiles'),
      macDir: path.join(home, 'Library', 'Application Support', 'Firefox', 'Profiles'),
      linuxDir: path.join(home, '.mozilla', 'firefox'),
    },
  ]

  return candidates.map(c => {
    const profileDir = isWin ? c.winDir : isMac ? c.macDir : c.linuxDir
    return {
      id: c.id,
      name: c.name,
      profileDir,
      available: fs.existsSync(profileDir),
    }
  })
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
