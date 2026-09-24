import React, {useState, useCallback, useRef, useEffect, useMemo} from 'react'
import {Box, Text, useApp, useInput, useStdout} from 'ink'
import Spinner from 'ink-spinner'
import {FullScreen} from './components/fullscreen.js'
import {Logo} from './components/logo.js'
import {Shortcuts} from './components/shortcuts.js'
import {InputView} from './components/views/input-view.js'
import {PlatformView, PLATFORM_OPTIONS} from './components/views/platform-view.js'
import {ProbingView} from './components/views/probing-view.js'
import {PickingView, getPickingOptions} from './components/views/picking-view.js'
import {DownloadingView} from './components/views/downloading-view.js'
import {CompletionView} from './components/views/completion-view.js'
import {ErrorView} from './components/views/error-view.js'
import {SettingsView} from './components/views/settings-view.js'
import {ThemeProvider, useTheme, nextThemeMode, type ThemeMode} from './theme.js'
import {
  parseProfileInput,
  buildCanonicalProfile,
  type ParsedProfile,
  type SupportedPlatform,
} from './lib/parser.js'
import {dispatchDownload, resolveDefaultDownloadDir} from './lib/engines/dispatcher.js'
import {readClipboard} from './lib/clipboard.js'
import {revealInFileManager, openBrowser} from './lib/reveal.js'
import {clickTargetAt, findFrameRow, frameRowSpan, type ClickTarget} from './lib/click-map.js'
import {useMouseClick} from './lib/use-mouse-click.js'
import {formatEngineError} from './lib/format.js'
import type {MediaTarget, EngineProgress, EngineResult} from './lib/engines/types.js'

export const TAGLINE = 'grab any profile. paste. download. done.'
const DOWNLOAD_BUTTON = 'download'

const Gap = ({lines = 1}: {lines?: number}) => (
  <Box flexDirection="column" flexShrink={0}>
    {Array.from({length: lines}, (_, i) => (
      <Text key={i}> </Text>
    ))}
  </Box>
)

type AppPhase =
  | {name: 'input'; warning?: string}
  | {name: 'platform'; username: string; rawInput?: string}
  | {name: 'probing'; target: string; status: string}
  | {name: 'picking'; profile: ParsedProfile}
  | {
      name: 'downloading'
      profile: ParsedProfile
      choice?: MediaTarget
      progress?: EngineProgress
    }
  | {name: 'done'; profile: ParsedProfile; result: EngineResult}
  | {name: 'error'; message: string; hint?: string}
  | {name: 'settings'}

export const HINTS: Record<AppPhase['name'], Array<[string, string]>> = {
  input: [
    ['↵', 'download'],
    ['^s', 'settings'],
    ['^c', 'quit'],
  ],
  platform: [
    ['↑↓', 'choose'],
    ['↵', 'select'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  probing: [
    ['esc', 'cancel'],
    ['^c', 'quit'],
  ],
  picking: [
    ['↑↓', 'choose'],
    ['↵', 'download'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
  downloading: [
    ['esc', 'cancel'],
    ['^c', 'quit'],
  ],
  done: [
    ['o', 'reveal'],
    ['↵', 'download another'],
    ['^c', 'quit'],
  ],
  error: [
    ['↵', 'try again'],
    ['^c', 'quit'],
  ],
  settings: [
    ['tab', 'switch field'],
    ['↵', 'save'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ],
}

export function App({
  initialInput,
  initialChoice,
  initialThemeMode = 'auto',
  outputDir,
  version = '1.0.0',
}: {
  initialInput?: string
  initialChoice?: MediaTarget
  initialThemeMode?: ThemeMode
  outputDir?: string
  version?: string
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode)
  const cycleTheme = useCallback(() => {
    setThemeMode(nextThemeMode)
  }, [])

  return (
    <ThemeProvider mode={themeMode}>
      <InnerApp
        initialInput={initialInput}
        initialChoice={initialChoice}
        outputDir={outputDir}
        version={version}
        cycleTheme={cycleTheme}
      />
    </ThemeProvider>
  )
}

function InnerApp({
  initialInput,
  initialChoice,
  outputDir,
  version = '1.0.0',
  cycleTheme,
}: {
  initialInput?: string
  initialChoice?: MediaTarget
  outputDir?: string
  version?: string
  cycleTheme: () => void
}) {
  const theme = useTheme()
  const {exit} = useApp()
  const {stdout} = useStdout()

  const [urlInput, setUrlInput] = useState(initialInput ?? '')
  const [clipboardUrl, setClipboardUrl] = useState<string | undefined>(undefined)
  const [settingsFocus, setSettingsFocus] = useState<'cookies' | 'download'>('cookies')

  const columns = stdout?.columns && stdout.columns > 0 ? stdout.columns : 80
  const boxWidth = Math.max(14, Math.min(64, columns - 6))
  const contentWidth = Math.max(10, Math.min(columns - 4, 78))

  const [phase, setPhase] = useState<AppPhase>(() => {
    if (initialInput) {
      const parsed = parseProfileInput(initialInput)
      if (parsed.platform !== 'unknown' && parsed.cleanUrl) {
        return {name: 'picking', profile: parsed}
      }
      if (parsed.platform === 'unknown' && parsed.username) {
        return {name: 'platform', username: parsed.username, rawInput: initialInput}
      }
    }
    return {name: 'input'}
  })

  // Read clipboard on startup
  useEffect(() => {
    try {
      const clip = readClipboard()
      if (clip && (clip.startsWith('http://') || clip.startsWith('https://') || clip.startsWith('@'))) {
        setClipboardUrl(clip.trim())
      }
    } catch {}
  }, [])

  const clipboardOffered = Boolean(clipboardUrl) && urlInput === ''
  const clipboardAccepted = Boolean(clipboardUrl) && urlInput === clipboardUrl

  const abortControllerRef = useRef<AbortController | null>(null)
  const probingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (probingTimeoutRef.current) {
        clearTimeout(probingTimeoutRef.current)
      }
    }
  }, [])

  const resetToInput = useCallback(() => {
    if (probingTimeoutRef.current) {
      clearTimeout(probingTimeoutRef.current)
      probingTimeoutRef.current = null
    }
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setUrlInput('')
    setPhase({name: 'input'})
  }, [])

  const handleModeSelect = useCallback(async (choice: MediaTarget, profile: ParsedProfile) => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setPhase({name: 'downloading', profile, choice})

    try {
      const targetDir = resolveDefaultDownloadDir(profile.platform, profile.username, outputDir)
      const result = await dispatchDownload({
        profile,
        choice,
        outputDir: targetDir,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setPhase({name: 'downloading', profile, choice, progress})
          }
        },
      })

      if (controller.signal.aborted) return

      if (!result.success && result.downloadedCount === 0 && result.skippedCount === 0) {
        const rawErr = result.errors[0] || 'no media items could be found or downloaded.'
        const formatted = formatEngineError(rawErr)
        setPhase({
          name: 'error',
          message: formatted.message,
          hint: formatted.hint,
        })
      } else {
        setPhase({name: 'done', profile, result})
      }
    } catch (err: any) {
      if (controller.signal.aborted) return
      setPhase({
        name: 'error',
        message: err.message || 'An error occurred during download.',
        hint: 'Check your internet connection or verify the profile exists.',
      })
    }
  }, [outputDir])

  const handlePlatformSelect = useCallback((platform: SupportedPlatform, username: string, rawInput?: string) => {
    const canonical = buildCanonicalProfile(platform, username, rawInput)
    setPhase({name: 'probing', target: canonical.cleanUrl, status: 'probing profile…'})

    if (probingTimeoutRef.current) clearTimeout(probingTimeoutRef.current)
    probingTimeoutRef.current = setTimeout(() => {
      probingTimeoutRef.current = null
      if (initialChoice) {
        handleModeSelect(initialChoice, canonical)
      } else {
        setPhase({name: 'picking', profile: canonical})
      }
    }, 450)
  }, [initialChoice, handleModeSelect])

  const handleInputSubmit = useCallback((input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return
    const parsed = parseProfileInput(trimmed)

    if (parsed.platform !== 'unknown' && parsed.cleanUrl) {
      setPhase({name: 'probing', target: trimmed, status: 'probing profile…'})

      if (probingTimeoutRef.current) clearTimeout(probingTimeoutRef.current)
      probingTimeoutRef.current = setTimeout(() => {
        probingTimeoutRef.current = null
        if (initialChoice) {
          handleModeSelect(initialChoice, parsed)
        } else {
          setPhase({name: 'picking', profile: parsed})
        }
      }, 450)
      return
    }

    if (parsed.platform === 'unknown' && parsed.username) {
      setPhase({name: 'platform', username: parsed.username, rawInput: trimmed})
      return
    }

    setPhase({
      name: 'input',
      warning: 'paste a full profile url (e.g. instagram.com/profile) or @profile',
    })
  }, [initialChoice, handleModeSelect])

  useInput((input, key) => {
    if (key.ctrl && input === 't') {
      cycleTheme()
      return
    }

    if (key.ctrl && (input === 's' || input === 'S')) {
      if (phase.name === 'settings') {
        setPhase({name: 'input'})
      } else if (phase.name === 'input') {
        setPhase({name: 'settings'})
      }
      return
    }

    if (key.ctrl && input === 'c') {
      exit()
      return
    }

    if (key.escape) {
      if (phase.name === 'settings') {
        setPhase({name: 'input'})
        return
      }
      if (phase.name === 'platform') {
        setPhase({name: 'input'})
        return
      }
      if (phase.name === 'probing' || phase.name === 'downloading') {
        resetToInput()
        return
      }
      if (phase.name === 'picking' || phase.name === 'done' || phase.name === 'error') {
        resetToInput()
        return
      }
      exit()
      return
    }

    if (key.return) {
      if (phase.name === 'done' || phase.name === 'error') {
        resetToInput()
        return
      }
    }

    if ((input === 'o' || input === 'O') && !key.ctrl) {
      if (phase.name === 'done') {
        revealInFileManager(phase.result.outputDir)
        return
      }
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  const hints: Array<[string, string]> = [...HINTS[phase.name], ['^t', `theme:${theme.mode}`]]
  const releaseUrl = `https://github.com/OpenSelena/open-nami/releases/tag/v${version}`

  const clickTargets = useMemo<ClickTarget[]>(() => {
    const hintAction = (key: string): (() => void) | undefined => {
      if (key === '^c') return () => exit()
      if (key === '^t') return cycleTheme
      if (key === '^s') return () => setPhase(prev => (prev.name === 'settings' ? {name: 'input'} : {name: 'settings'}))
      if (key === 'esc') {
        if (phase.name === 'settings' || phase.name === 'platform') return () => setPhase({name: 'input'})
        return resetToInput
      }
      if (key === '↵') {
        if (phase.name === 'input') return () => handleInputSubmit(urlInput)
        if (phase.name === 'done' || phase.name === 'error') return resetToInput
      }
      if (key === 'o') {
        if (phase.name === 'done') return () => revealInFileManager(phase.result.outputDir)
      }
      return undefined
    }

    const targets: ClickTarget[] = []

    if (phase.name === 'input') {
      targets.push({match: `v${version}`, padX: 1, action: () => openBrowser(releaseUrl)})
      targets.push({match: `  ${DOWNLOAD_BUTTON}  `, padY: 1, action: () => handleInputSubmit(urlInput)})
      if (clipboardOffered && clipboardUrl) {
        targets.push({match: 'Tab to paste it', action: () => setUrlInput(clipboardUrl)})
        targets.push({match: 'link in your clipboard', action: () => setUrlInput(clipboardUrl)})
      }
      if (clipboardAccepted) {
        targets.push({match: 'to download it', action: () => handleInputSubmit(urlInput)})
      }
      targets.push({match: 'OpenSelena', padX: 1, action: () => openBrowser('https://github.com/OpenSelena/open-nami')})
    }

    if (phase.name === 'platform') {
      for (const item of PLATFORM_OPTIONS) {
        targets.push({
          match: item.label,
          padX: 2,
          action: () => handlePlatformSelect(item.value, phase.username, phase.rawInput),
        })
      }
    }

    if (phase.name === 'picking') {
      const items = getPickingOptions(phase.profile.platform)
      for (const item of items) {
        targets.push({
          match: item.label,
          action: () => handleModeSelect(item.value, phase.profile),
        })
      }
    }

    if (phase.name === 'done') {
      targets.push({match: '↵ download another', padX: 4, padY: 1, action: resetToInput})
      targets.push({match: '[o] reveal in folder', padX: 1, action: () => revealInFileManager(phase.result.outputDir)})
    }

    if (phase.name === 'settings') {
      targets.push({match: 'Cookies Folder', padX: 2, padY: 1, action: () => setSettingsFocus('cookies')})
      targets.push({match: 'Download Directory', padX: 2, padY: 1, action: () => setSettingsFocus('download')})
    }

    for (const [key, label] of hints) {
      const action = hintAction(key)
      if (action) targets.push({match: `${key} ${label}`, action})
    }

    return targets
  }, [
    phase,
    version,
    releaseUrl,
    urlInput,
    clipboardOffered,
    clipboardUrl,
    clipboardAccepted,
    hints,
    cycleTheme,
    exit,
    handleInputSubmit,
    handlePlatformSelect,
    handleModeSelect,
    resetToInput,
  ])

  useMouseClick(
    (x, y) => {
      const taglineRow = findFrameRow(TAGLINE)
      if (taglineRow > 3 && y - 1 >= taglineRow - 4 && y - 1 <= taglineRow - 2) {
        const span = frameRowSpan(y - 1)
        if (span && x >= span[0] - 1 && x <= span[1] + 1) {
          if (phase.name !== 'input') resetToInput()
          return
        }
      }
      clickTargetAt(x, y, clickTargets)?.action()
    },
    Boolean(process.stdin.isTTY),
  )

  return (
    <FullScreen>
      <Logo />
      <Gap />
      <Text color={theme.primary}>{TAGLINE}</Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        instagram · tiktok · facebook · x · +more
      </Text>
      <Gap />

      {phase.name === 'input' && (
        <InputView
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          onSubmit={handleInputSubmit}
          boxWidth={boxWidth}
          clipboardOffered={clipboardOffered}
          clipboardAccepted={clipboardAccepted}
          clipboardUrl={clipboardUrl}
          warning={phase.warning}
          version={version}
          releaseUrl={releaseUrl}
          theme={theme}
          buttonText={DOWNLOAD_BUTTON}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'platform' && (
        <PlatformView
          contentWidth={contentWidth}
          username={phase.username}
          onSelect={(platform) => handlePlatformSelect(platform, phase.username, phase.rawInput)}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'probing' && (
        <ProbingView
          target={phase.target}
          boxWidth={boxWidth}
          theme={theme}
          buttonText={DOWNLOAD_BUTTON}
        />
      )}

      {phase.name === 'picking' && (
        <PickingView
          contentWidth={contentWidth}
          profile={phase.profile}
          onSelect={(choice) => handleModeSelect(choice, phase.profile)}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'downloading' && (
        <DownloadingView
          profile={phase.profile}
          choice={phase.choice}
          progress={phase.progress}
          outputDir={resolveDefaultDownloadDir(phase.profile.platform, phase.profile.username, outputDir)}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'done' && (
        <CompletionView
          profile={phase.profile}
          result={phase.result}
          theme={theme}
          gapComponent={Gap}
        />
      )}

      {phase.name === 'error' && (
        <ErrorView
          message={phase.message}
          hint={phase.hint}
          columns={columns}
          theme={theme}
        />
      )}

      {phase.name === 'settings' && (
        <SettingsView
          boxWidth={boxWidth}
          theme={theme}
          gapComponent={Gap}
          focusedField={settingsFocus}
          onFocusChange={setSettingsFocus}
          onSave={() => setPhase({name: 'input'})}
          onCancel={() => setPhase({name: 'input'})}
        />
      )}

      {hints.length > 0 ? (
        <>
          <Gap lines={2} />
          <Shortcuts
            items={hints}
            leading={
              phase.name === 'probing' ? (
                <Text>
                  <Text color={theme.primary}>
                    <Spinner type="dots" />
                  </Text>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}> {phase.status}</Text>
                </Text>
              ) : undefined
            }
          />
        </>
      ) : null}
    </FullScreen>
  )
}
