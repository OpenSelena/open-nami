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
import {startClipboardWatcher} from './lib/watcher.js'
import {runBatchQueue} from './lib/batch.js'
import {runDoctor} from './lib/diagnostics/doctor.js'
import {checkForUpdate} from './lib/update-check.js'
import {fetchAnnouncement} from './lib/announcements.js'
import {MediaLedger, type TrackedProfileRecord} from './lib/engines/storage/ledger.js'
import {dispatchPull} from './lib/pull.js'

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
  Open Nami: bulk social media profile downloader for Instagram, TikTok, Facebook & X.

  Usage:
    $ open-nami                          Launch interactive TUI
    $ open-nami <profile-url-or-user>    Open directly to format picker
    $ open-nami pull [username]          Synchronize tracked profiles (or specific user)
    $ open-nami list                     List all tracked profiles in registry
    $ open-nami untrack <username>       Remove creator from tracking without deleting files
    $ open-nami untrack --all            Remove all creators from tracking registry
    $ open-nami <url> --photos           Download photos directly
    $ open-nami <url> --videos           Download videos directly
    $ open-nami <url> --all              Download all media directly

  Options:
    -h, --help           Show this help message
    -v, --version        Show version
    --doctor             Run environment & dependency diagnostics
    -o, --output         Set custom output directory
    -w, --watch          Watch clipboard for profile links and auto-download
    -b, --batch <file>   Download multiple profiles listed in a text file (one URL/user per line)
    -U, --update         Update bundled engines (yt-dlp and gallery-dl) to latest release
    --update-ytdlp       Update only bundled yt-dlp binary
    --update-gallerydl   Update only bundled gallery-dl binary
    --theme              Set color theme (auto, light, or dark)
    --photos             Download photos only
    --videos             Download videos & reels only
    --stories            Download stories only (Instagram)
    --highlights         Download highlights only (Instagram)
    --all                Download all available media
    --since <date>       Filter posts on or after date (YYYY-MM-DD or 7d, 30d)
    --until <date>       Filter posts on or before date (YYYY-MM-DD)
    -l, --limit <n>      Limit maximum items to download
    --resume             Resume download from saved pagination checkpoint
    --write-metadata     Save post metadata & captions to sidecar .json files
    --no-track           Do not add downloaded profile to tracked history registry
    --completion         Generate shell completion script (bash, zsh, fish, powershell)

  Hotkeys in TUI:
    [Tab]            Paste from clipboard
    [↑ / ↓]          Navigate menus
    [Enter]          Submit / Start Download
    [^w]             Clipboard Watcher Radar
    [^b]             Batch Multi-Account Queue Manager
    [^s]             Settings & Preferences
    [^t]             Cycle theme (auto / light / dark)
    [m]              Toggle metadata sidecars (.json)
    [d]              Cycle date range filter (All / 24h / 7d / 30d)
    [l]              Cycle post download limit (All / 10 / 25 / 50 / 100)
    [r]              Toggle resumable checkpoints
    [o]              Open Downloads folder on completion
    [Esc]            Back / Exit
`

export function formatTrackedProfilesTable(profiles: TrackedProfileRecord[]): string {
  if (!profiles || profiles.length === 0) {
    return 'No tracked profiles found. Download profiles first, or use open-nami <url> to start tracking.'
  }

  const headers = ['Platform', 'Username', 'Target', 'Media', 'Last Synced', 'Directory']
  const rows = profiles.map((p) => {
    const lastSync = p.lastPulledAt
      ? p.lastPulledAt.slice(0, 16).replace('T', ' ')
      : 'Never'
    return [
      p.platform,
      `@${p.username}`,
      p.choice || 'all',
      String(p.mediaCount || 0),
      lastSync,
      p.targetDir || '',
    ]
  })

  const colWidths = headers.map((h, i) => {
    const maxValLen = rows.reduce((max, r) => Math.max(max, (r[i] || '').length), 0)
    return Math.max(h.length, maxValLen)
  })

  const pad = (str: string, width: number) => str + ' '.repeat(Math.max(0, width - str.length))

  const headerLine = headers.map((h, i) => pad(h, colWidths[i]!)).join('  ')
  const dividerLine = colWidths.map((w) => '─'.repeat(w)).join('  ')
  const rowLines = rows.map((r) => r.map((cell, i) => pad(cell, colWidths[i]!)).join('  '))

  return [
    `\n  Tracked Profiles (${profiles.length}):\n`,
    `  ${headerLine}`,
    `  ${dividerLine}`,
    ...rowLines.map((l) => `  ${l}`),
    '',
  ].join('\n')
}

export function handleListCommand(ledger?: MediaLedger): string {
  const ownsLedger = !ledger
  const activeLedger = ledger || new MediaLedger()
  try {
    const profiles = activeLedger.getTrackedProfiles()
    return formatTrackedProfilesTable(profiles)
  } finally {
    if (ownsLedger) {
      activeLedger.close()
    }
  }
}

export function handleUntrackCommand(
  username?: string,
  ledger?: MediaLedger,
): { success: boolean; message: string } {
  if (!username || !username.trim()) {
    return {
      success: false,
      message: 'Please provide a username to untrack (e.g. open-nami untrack selenagomez) or use --all to clear tracked registry.',
    }
  }

  const cleanUser = username.trim().replace(/^@/, '')
  const ownsLedger = !ledger
  const activeLedger = ledger || new MediaLedger()

  try {
    if (cleanUser === '--all' || cleanUser === '-a') {
      const count = activeLedger.getTrackedProfiles().length
      activeLedger.clearTrackedProfiles()
      return {
        success: true,
        message: `Cleared ${count} tracked ${count === 1 ? 'profile' : 'profiles'} from registry. Downloaded media files preserved on disk.`,
      }
    }

    const profiles = activeLedger.getTrackedProfiles()
    const target = profiles.find(
      (p) => p.username.toLowerCase() === cleanUser.toLowerCase(),
    )

    if (!target) {
      return {
        success: false,
        message: `Profile "@${cleanUser}" is not in the tracked registry.`,
      }
    }

    activeLedger.untrackProfile(target.platform, target.username)
    return {
      success: true,
      message: `Untracked @${target.username} from registry. Downloaded media files preserved on disk.`,
    }
  } finally {
    if (ownsLedger) {
      activeLedger.close()
    }
  }
}

export async function handlePullCli(pullArgs: string[], ledger?: MediaLedger): Promise<number> {
  let target: string | undefined
  let choice: MediaTarget | undefined
  let outputDir: string | undefined
  let platform: any = undefined
  let earlyExitThreshold: number | undefined

  for (let i = 0; i < pullArgs.length; i++) {
    const arg = pullArgs[i]
    if (arg === '--photos') choice = 'photos'
    else if (arg === '--videos') choice = 'videos'
    else if (arg === '--stories') choice = 'stories'
    else if (arg === '--highlights') choice = 'highlights'
    else if (arg === '--all') choice = 'all'
    else if (arg === '-o' || arg === '--output') outputDir = pullArgs[++i]
    else if (arg.startsWith('--output=')) outputDir = arg.slice('--output='.length)
    else if (arg === '-p' || arg === '--platform') platform = pullArgs[++i]?.toLowerCase()
    else if (arg.startsWith('--platform=')) platform = arg.slice('--platform='.length).toLowerCase()
    else if (arg === '--early-exit') {
      const parsed = parseInt(pullArgs[++i], 10)
      if (!isNaN(parsed) && parsed > 0) earlyExitThreshold = parsed
    } else if (arg.startsWith('--early-exit=')) {
      const parsed = parseInt(arg.slice('--early-exit='.length), 10)
      if (!isNaN(parsed) && parsed > 0) earlyExitThreshold = parsed
    } else if (!arg.startsWith('-') && !target) {
      target = arg
    }
  }

  const controller = new AbortController()
  const sigintHandler = () => {
    console.log('\n[open-nami] Stopping profile sync…')
    controller.abort()
  }
  process.on('SIGINT', sigintHandler)

  try {
    console.log(`\n  \x1b[36mOpen Nami\x1b[0m: Profile Synchronization (v${VERSION})`)
    if (target) {
      console.log(`  \x1b[90mTarget creator:\x1b[0m @${target.replace(/^@/, '')}`)
    }
    if (choice) {
      console.log(`  \x1b[90mTarget media:\x1b[0m ${choice}`)
    }
    console.log()

    const result = await dispatchPull({
      target,
      platform,
      choice,
      outputDir,
      earlyExitThreshold,
      ledger,
      signal: controller.signal,
      onProfileStart: (profile, idx, total) => {
        console.log(`\x1b[36m[${idx + 1}/${total}]\x1b[0m \x1b[1m@${profile.username}\x1b[0m on \x1b[35m${profile.platform}\x1b[0m…`)
      },
      onProfileProgress: (progress) => {
        if (progress.engineProgress?.currentFile) {
          process.stdout.write(`\r  \x1b[90m→ ${progress.engineProgress.currentFile.slice(0, 60)}\x1b[0m\x1b[K`)
        }
      },
      onProfileComplete: (res) => {
        process.stdout.write('\r\x1b[K')
        console.log(`  \x1b[32m✓ @${res.profile.username}:\x1b[0m ${res.downloaded} new items downloaded (${res.skipped} skipped)\n`)
      },
      onProfileError: (profile, err) => {
        process.stdout.write('\r\x1b[K')
        console.error(`  \x1b[31m✗ @${profile.username}:\x1b[0m ${err.message}\n`)
      },
    })

    if (result.total === 0) {
      console.log('No tracked profiles found to synchronize. Run `open-nami <url>` to download and track a profile.')
      return 0
    }

    console.log(`\x1b[1mSync completed:\x1b[0m ${result.succeeded} up-to-date, ${result.failed} failed of ${result.total} total profiles.`)
    console.log(`\x1b[32mTotal new media:\x1b[0m ${result.totalDownloaded} downloaded (${result.totalSkipped} skipped).`)
    return result.failed > 0 ? 1 : 0
  } finally {
    process.removeListener('SIGINT', sigintHandler)
  }
}

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

  if (args.includes('--doctor')) {
    const [report, updateInfo, announcement] = await Promise.all([
      runDoctor(),
      checkForUpdate({ currentVersion: VERSION }),
      fetchAnnouncement({ currentVersion: VERSION }),
    ])
    const updateText = updateInfo.updateAvailable && updateInfo.latestVersion
      ? `\x1b[33m(update available: v${updateInfo.latestVersion})\x1b[0m`
      : '\x1b[32m(latest)\x1b[0m'
    console.log(`\n  \x1b[36mOpen Nami Doctor\x1b[0m (v${VERSION} ${updateText})\n`)
    console.log(`  \x1b[1mRuntime:\x1b[0m Node.js ${report.nodeVersion}`)
    console.log(`  \x1b[1mStorage:\x1b[0m ${report.storageOk ? '\x1b[32m✓ Ready\x1b[0m' : '\x1b[31m✗ Inaccessible\x1b[0m'}`)
    console.log(`  \x1b[1mEngines:\x1b[0m`)
    for (const [bin, ok] of Object.entries(report.binaries)) {
      console.log(`    ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${bin}`)
    }
    console.log(`  \x1b[1mCookies:\x1b[0m`)
    for (const [platform, ok] of Object.entries(report.cookies)) {
      console.log(`    ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[90m○\x1b[0m'} ${platform}`)
    }
    if (announcement) {
      const tag = announcement.level === 'warning' ? 'UPDATE' : announcement.level === 'alert' ? 'ALERT' : 'INFO'
      const color = announcement.level === 'warning' || announcement.level === 'alert' ? '\x1b[33m' : '\x1b[36m'
      console.log(`\n  ${color}[${tag}]\x1b[0m \x1b[1m${announcement.title}:\x1b[0m ${announcement.message}`)
      if (announcement.url) {
        console.log(`         \x1b[4m${announcement.url}\x1b[0m`)
      }
    }
    console.log()
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

  if (args[0] === 'list') {
    const output = handleListCommand()
    console.log(output)
    process.exit(0)
  }

  if (args[0] === 'untrack') {
    const targetUser = args[1]
    const res = handleUntrackCommand(targetUser)
    if (res.success) {
      console.log(res.message)
      process.exit(0)
    } else {
      console.error(res.message)
      process.exit(1)
    }
  }

  if (args[0] === 'pull' || args[0] === 'sync') {
    const exitCode = await handlePullCli(args.slice(1))
    process.exit(exitCode)
  }

  let initialInput: string | undefined
  let initialChoice: MediaTarget | undefined
  let outputDir: string | undefined
  let themeMode: any = 'auto'
  let isWatchMode = false
  let batchFile: string | undefined
  let cliPlatform: 'instagram' | 'tiktok' | 'facebook' | 'x' | undefined
  let since: string | undefined
  let until: string | undefined
  let limit: number | undefined
  let isResume = false
  let writeMetadata = false
  let noTrack = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-o' || arg === '--output') {
      outputDir = args[++i]
    } else if (arg.startsWith('--output=')) {
      outputDir = arg.slice('--output='.length)
    } else if (arg === '-w' || arg === '--watch') {
      isWatchMode = true
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
    } else if (arg === '--since') {
      since = args[++i]
    } else if (arg.startsWith('--since=')) {
      since = arg.slice('--since='.length)
    } else if (arg === '--until') {
      until = args[++i]
    } else if (arg.startsWith('--until=')) {
      until = arg.slice('--until='.length)
    } else if (arg === '-l' || arg === '--limit') {
      const parsed = parseInt(args[++i], 10)
      if (!isNaN(parsed) && parsed > 0) limit = parsed
    } else if (arg.startsWith('--limit=')) {
      const parsed = parseInt(arg.slice('--limit='.length), 10)
      if (!isNaN(parsed) && parsed > 0) limit = parsed
    } else if (arg === '--resume') {
      isResume = true
    } else if (arg === '--write-metadata') {
      writeMetadata = true
    } else if (arg === '--no-track') {
      noTrack = true
    } else if (arg === '-b' || arg === '--batch') {
      batchFile = args[++i]
    } else if (arg.startsWith('--batch=')) {
      batchFile = arg.slice('--batch='.length)
    } else if (arg === '-p' || arg === '--platform') {
      const val = args[++i]?.toLowerCase()
      if (val === 'instagram' || val === 'tiktok' || val === 'facebook' || val === 'x') {
        cliPlatform = val
      }
    } else if (arg.startsWith('--platform=')) {
      const val = arg.slice('--platform='.length).toLowerCase()
      if (val === 'instagram' || val === 'tiktok' || val === 'facebook' || val === 'x') {
        cliPlatform = val
      }
    } else if (!arg.startsWith('-') && !initialInput) {
      initialInput = arg
    }
  }

  if (isWatchMode) {
    const choice = initialChoice || 'all'
    console.log(`\n  \x1b[36mOpen Nami\x1b[0m: Clipboard Watcher Active (v${VERSION})`)
    console.log(`  \x1b[90mTarget media:\x1b[0m \x1b[33m${choice}\x1b[0m`)
    if (outputDir) console.log(`  \x1b[90mOutput directory:\x1b[0m ${outputDir}`)
    console.log(`  \x1b[90mMonitoring clipboard for Instagram, TikTok, Facebook & X profiles…\x1b[0m`)
    console.log(`  \x1b[90mPress Ctrl+C to stop.\x1b[0m\n`)

    const controller = new AbortController()
    process.on('SIGINT', () => {
      console.log('\n[open-nami] Stopping clipboard watcher…')
      controller.abort()
      process.exit(0)
    })

    const {promise} = startClipboardWatcher({
      choice,
      outputDir,
      writeMetadata,
      signal: controller.signal,
      onDetected: (p) => {
        console.log(`\n❯ \x1b[32mDetected:\x1b[0m @${p.username} on \x1b[35m${p.platform}\x1b[0m`)
        console.log(`  \x1b[90mDownloading ${choice}…\x1b[0m`)
      },
      onProgress: (_p, statusText) => {
        process.stdout.write(`\r  \x1b[90m→ ${statusText.slice(0, 70)}\x1b[0m\x1b[K`)
      },
      onComplete: (p, res) => {
        process.stdout.write('\r\x1b[K')
        console.log(`✓ \x1b[32mFinished @${p.username}:\x1b[0m ${res.downloadedCount} downloaded, ${res.skippedCount} skipped`)
        if (res.outputDir) console.log(`  \x1b[90mSaved to:\x1b[0m ${res.outputDir}`)
      },
      onError: (p, err) => {
        process.stdout.write('\r\x1b[K')
        console.error(`✗ \x1b[31mError downloading @${p.username}:\x1b[0m ${err.message}`)
      },
    })

    await promise
    process.exit(0)
  }

  if (batchFile) {
    const choice = initialChoice || 'all'
    console.log(`\n  \x1b[36mOpen Nami\x1b[0m: Batch Download Queue (v${VERSION})`)
    console.log(`  \x1b[90mBatch file:\x1b[0m ${batchFile}`)
    console.log(`  \x1b[90mTarget media:\x1b[0m \x1b[33m${choice}\x1b[0m`)
    if (outputDir) console.log(`  \x1b[90mOutput directory:\x1b[0m ${outputDir}`)
    if (limit) console.log(`  \x1b[90mPer-account limit:\x1b[0m ${limit}`)
    console.log()

    const controller = new AbortController()
    process.on('SIGINT', () => {
      console.log('\n[open-nami] Aborting batch queue…')
      controller.abort()
    })

    try {
      const result = await runBatchQueue({
        filePath: batchFile,
        choice,
        defaultPlatform: cliPlatform || 'instagram',
        outputDir,
        since,
        until,
        limit,
        resume: isResume,
        writeMetadata,
        noTrack,
        signal: controller.signal,
        onAccountStart: (item, idx, total) => {
          console.log(`\x1b[36m[${idx + 1}/${total}]\x1b[0m \x1b[1m@${item.profile.username}\x1b[0m on \x1b[35m${item.profile.platform}\x1b[0m…`)
        },
        onAccountProgress: (_item, progress) => {
          if (progress.currentFile) {
            process.stdout.write(`\r  \x1b[90m→ [${progress.job}] ${progress.currentFile.slice(0, 60)}\x1b[0m\x1b[K`)
          }
        },
        onAccountComplete: (item) => {
          process.stdout.write('\r\x1b[K')
          console.log(`  \x1b[32m✓ @${item.profile.username}:\x1b[0m ${item.downloaded} downloaded, ${item.skipped} skipped\n`)
        },
        onAccountError: (item, err) => {
          process.stdout.write('\r\x1b[K')
          console.error(`  \x1b[31m✗ @${item.profile.username || item.raw}:\x1b[0m ${err.message}\n`)
        },
      })

      console.log(`\x1b[1mBatch completed:\x1b[0m ${result.succeeded} succeeded, ${result.failed} failed of ${result.total} total accounts.`)
      console.log(`\x1b[32mTotal media downloaded:\x1b[0m ${result.totalDownloaded} items (${result.totalSkipped} skipped).`)
      process.exit(result.failed > 0 ? 1 : 0)
    } catch (err: any) {
      console.error(`open-nami batch error: ${err.message || String(err)}`)
      process.exit(1)
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
        since,
        until,
        limit,
        resume: isResume,
        writeMetadata,
        noTrack,
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
        since={since}
        until={until}
        limit={limit}
        resume={isResume}
        writeMetadata={writeMetadata}
        version={VERSION}
      />,
      {stdout: captureFrames(process.stdout)},
    )

    await waitUntilExit()
  } finally {
    if (isTTY) leaveAltScreen()
  }
}

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('--test')) ||
  (process.argv[1] &&
    (process.argv[1].endsWith('.test.ts') ||
      process.argv[1].endsWith('.test.js') ||
      process.argv[1].endsWith('.test.mjs')))

if (!isTestEnv) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
