import {execFileSync} from 'node:child_process'

const COMMANDS: Array<[string, string[]]> =
  process.platform === 'darwin'
    ? [['pbpaste', []]]
    : process.platform === 'win32'
      ? [['powershell', ['-NoProfile', '-Command', 'Get-Clipboard']]]
      : [
          ['wl-paste', ['--no-newline']],
          ['xclip', ['-selection', 'clipboard', '-o']],
          ['xsel', ['--clipboard', '--output']],
        ]

export function readClipboard(execFn: typeof execFileSync = execFileSync): string {
  for (const [command, args] of COMMANDS) {
    try {
      const out = execFn(command, args, {encoding: 'utf8', timeout: 1500, stdio: ['ignore', 'pipe', 'ignore']})
      if (out && typeof out === 'string') {
        return out.trim()
      }
    } catch {}
  }
  return ''
}
