import fs from 'node:fs'
import {spawn} from 'node:child_process'
import path from 'node:path'

export function buildOpenBrowserCommand(
  url: string,
  platform: NodeJS.Platform = process.platform,
): {command: string; args: string[]} | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
  } catch {
    return null
  }

  if (platform === 'darwin') {
    return {command: 'open', args: [url]}
  }
  if (platform === 'win32') {
    return {command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url]}
  }
  return {command: 'xdg-open', args: [url]}
}

export function openBrowser(url: string): void {
  try {
    const spec = buildOpenBrowserCommand(url)
    if (!spec) return
    spawn(spec.command, spec.args, {detached: true, stdio: 'ignore'}).unref()
  } catch {}
}

export function getRevealCommand(
  targetPath: string,
  platform: NodeJS.Platform = process.platform,
  isDirectory?: boolean,
): {command: string; args: string[]} {
  const pathModule = platform === 'win32' ? path.win32 : (platform === 'darwin' ? path.posix : path)
  const resolved = pathModule.resolve(targetPath)
  const isDir =
    isDirectory !== undefined
      ? isDirectory
      : (() => {
          try {
            if (fs.existsSync(resolved)) {
              return fs.statSync(resolved).isDirectory()
            }
          } catch {}
          return !pathModule.extname(resolved)
        })()

  if (platform === 'darwin') {
    return isDir
      ? {command: 'open', args: [resolved]}
      : {command: 'open', args: ['-R', resolved]}
  }
  if (platform === 'win32') {
    if (isDir) {
      return {command: 'explorer.exe', args: [resolved]}
    }
    return {command: 'explorer.exe', args: [`/select,${resolved}`]}
  }
  return {command: 'xdg-open', args: [isDir ? resolved : pathModule.dirname(resolved)]}
}

export function revealInFileManager(targetPath: string): void {
  try {
    const {command, args} = getRevealCommand(targetPath)
    spawn(command, args, {detached: true, stdio: 'ignore'}).unref()
  } catch {}
}
