import React from 'react'
import {createRequire} from 'node:module'
import {render} from 'ink'
import {App} from './app.js'
import {captureFrames} from './lib/click-map.js'
import {parseProfileInput} from './lib/parser.js'
import {dispatchDownload} from './lib/engines/dispatcher.js'
import type {MediaTarget} from './lib/engines/types.js'
import {generateCompletion} from './lib/completion.js'
import {updateYtDlp, updateGalleryDl} from './lib/engines/fetcher.js'

export const resolveVersion = (): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.url) {
      return createRequire(import.meta.url)('../package.json').version
    }
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../package.json').version
  } catch {}
  return '1.0.0'
}

export const VERSION: string = resolveVersion()

const HELP = `
  Open Nami — bulk social media profile downloader for Instagram, TikTok, Facebook & X.

  Usage:
    $ open-nami                          Launch interactive TUI
    $ open-nami <profile-url-or-user>    Open directly to format picker
    $ open-nami <url> --photos           Download photos directly
    $ open-nami <url> --videos           Download videos directly
    $ open-nami <url> --all              Download all media directly

  Options:
    -h, --help           Show this help message
    -v, --version        Show version
    -o, --output         Set custom output directory
    -U, --update         Update bundled engines (yt-dlp and gallery-dl) to latest release
    --update-ytdlp       Update only bundled yt-dlp binary
    --update-gallerydl   Update only bundled gallery-dl binary
    --theme              Set color theme (auto, light, or dark)
    --photos             Download photos only
    --videos             Download videos & reels only
    --stories            Download stories only (Instagram)
    --highlights         Download highlights only (Instagram)
    --all                Download all available media
    --completion         Generate shell completion script (bash, zsh, fish, powershell)

  Hotkeys in TUI:
    [Tab]            Paste from clipboard
    [↑ / ↓]          Navigate menus
    [Enter]          Submit / Start Download
    [^t]             Cycle theme (auto / light / dark)
    [o]              Open Downloads folder on completion
    [Esc]            Back / Exit
`

const enterAltScreen = () => process.stdout.write('\x1b[?1049h\x1b[H')
const leaveAltScreen = () => process.stdout.write('\x1b[?1006l\x1b[?1000l\x1b[?1049l')

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('-h') || args.includes('--help')) {
    console.log(HELP)
    process.exit(0)
  }

  if (args.includes('-v') || args.includes('--version')) {
    console.log(`open-nami v${VERSION}`)
    process.exit(0)
  }

  const completionIdx = args.findIndex(arg => arg === '--completion' || arg.startsWith('--completion='))
  if (completionIdx !== -1) {
    const arg = args[completionIdx]
    const shell = arg.startsWith('--completion=')
      ? arg.slice('--completion='.length)
      : args[completionIdx + 1]
    if (!shell || shell.startsWith('-')) {
      console.error('Error: --completion requires a shell name (bash, zsh, fish, powershell).')
      process.exit(1)
    }
    try {
      console.log(generateCompletion(shell))
      process.exit(0)
    } catch (err: any) {
      console.error(`Error: ${err.message}`)
      process.exit(1)
    }
  }

  if (args.includes('-U') || args.includes('--update') || args.includes('--update-ytdlp') || args.includes('--update-gallerydl')) {
    const doYt = args.includes('-U') || args.includes('--update') || args.includes('--update-ytdlp')
    const doGdl = args.includes('-U') || args.includes('--update') || args.includes('--update-gallerydl')
    let hasFailure = false

    if (doYt) {
      try {
        const res = await updateYtDlp({
          onStatus: status => console.error(`[open-nami] ${status}`),
        })
        if (res.updated) {
          if (res.previousVersion && res.previousVersion !== res.currentVersion) {
            console.log(`✓ yt-dlp updated: ${res.previousVersion} → ${res.currentVersion}`)
          } else {
            console.log(`✓ yt-dlp updated to version ${res.currentVersion}`)
          }
        } else {
          console.log(`✓ yt-dlp is already up to date (version ${res.currentVersion})`)
        }
      } catch (err: any) {
        console.error(`open-nami: yt-dlp update failed: ${err.message || String(err)}`)
        hasFailure = true
      }
    }

    if (doGdl) {
      try {
        const res = await updateGalleryDl({
          onStatus: status => console.error(`[open-nami] ${status}`),
        })
        if (res.updated) {
          if (res.previousVersion && res.previousVersion !== res.currentVersion) {
            console.log(`✓ gallery-dl updated: ${res.previousVersion} → ${res.currentVersion}`)
          } else {
            console.log(`✓ gallery-dl updated to version ${res.currentVersion}`)
          }
        } else {
          console.log(`✓ gallery-dl is already up to date (version ${res.currentVersion})`)
        }
      } catch (err: any) {
        console.error(`open-nami: gallery-dl update failed: ${err.message || String(err)}`)
        hasFailure = true
      }
    }

    process.exit(hasFailure ? 1 : 0)
  }

  let initialInput: string | undefined
  let initialChoice: MediaTarget | undefined
  let outputDir: string | undefined
  let themeMode: any = 'auto'

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-o' || arg === '--output') {
      outputDir = args[++i]
    } else if (arg.startsWith('--output=')) {
      outputDir = arg.slice('--output='.length)
    } else if (arg === '--theme') {
      themeMode = args[++i]
    } else if (arg.startsWith('--theme=')) {
      themeMode = arg.slice('--theme='.length)
    } else if (arg === '--photos') {
      initialChoice = 'photos'
    } else if (arg === '--videos') {
      initialChoice = 'videos'
    } else if (arg === '--stories') {
      initialChoice = 'stories'
    } else if (arg === '--highlights') {
      initialChoice = 'highlights'
    } else if (arg === '--all') {
      initialChoice = 'all'
    } else if (!arg.startsWith('-') && !initialInput) {
      initialInput = arg
    }
  }

  const isTTY = Boolean(process.stdout.isTTY)

  // Non-interactive / headless direct execution (scripts, automation, CI)
  if (!isTTY && initialChoice && initialInput) {
    const parsed = parseProfileInput(initialInput)
    if (parsed.platform === 'unknown' || !parsed.cleanUrl) {
      console.error(`open-nami: that doesn't look like a valid profile URL or username: ${initialInput}`)
      process.exit(1)
    }
    console.log(`[open-nami] downloading ${initialChoice} for @${parsed.username}…`)
    try {
      const res = await dispatchDownload({
        profile: parsed,
        choice: initialChoice,
        outputDir,
        onProgress: (progress) => {
          if (progress.currentFile) {
            console.log(`[open-nami] [${progress.job}] ${progress.currentFile}`)
          }
        },
      })
      console.log(`✓ downloaded ${res.downloadedCount} media items to ${res.outputDir}`)
      process.exit(res.success ? 0 : 1)
    } catch (err: any) {
      console.error(`open-nami error: ${err.message || String(err)}`)
      process.exit(1)
    }
  }

  if (isTTY) {
    enterAltScreen()
    process.on('exit', leaveAltScreen)
    for (const event of ['uncaughtException', 'unhandledRejection'] as const) {
      process.on(event, (error: unknown) => {
        leaveAltScreen()
        console.error(error)
        process.exit(1)
      })
    }
  }

  try {
    const {waitUntilExit} = render(
      <App
        initialInput={initialInput}
        initialChoice={initialChoice}
        initialThemeMode={themeMode}
        outputDir={outputDir}
        version={VERSION}
      />,
      {stdout: captureFrames(process.stdout)},
    )

    await waitUntilExit()
  } finally {
    if (isTTY) leaveAltScreen()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
