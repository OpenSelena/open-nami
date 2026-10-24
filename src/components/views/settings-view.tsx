import React, {useState, useMemo, useCallback, useEffect} from 'react'
import {Box, Text, useInput} from 'ink'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {FramedInput} from '../framed-input.js'
import {TextInput} from '../text-input.js'
import {loadConfig, saveConfig, type AppConfig} from '../../lib/config.js'
import {detectAvailableCookies} from '../../lib/cookies.js'
import {
  listDetectedBrowsers,
  detectSystemDefaultBrowser,
  type DetectedBrowser,
} from '../../lib/cookies/browser-bridge.js'
import {runDoctor, type DoctorReport, type DoctorOptions} from '../../lib/diagnostics/doctor.js'
import type {Theme} from '../../theme.js'

function expandDir(dir: string): string {
  if (dir.startsWith('~/') || dir.startsWith('~\\') || dir === '~') {
    return path.join(os.homedir(), dir.slice(1))
  }
  return dir
}

export type SettingsField = 'cookies' | 'browser' | 'download' | 'metadata' | 'limit'

export function resolveBrowserOptions(detected: DetectedBrowser[]): string[] {
  const available = detected.filter(b => b.available !== false)
  return ['auto', 'none', ...available.map(b => b.id)]
}

export function formatBrowserFeedback(
  cookiesFromBrowser: string | undefined,
  detectedBrowsers: DetectedBrowser[] = [],
  defaultBrowser?: DetectedBrowser | null,
): string {
  if (cookiesFromBrowser === 'auto') {
    if (defaultBrowser) {
      return `system default: ${defaultBrowser.name} (auto-extract session cookies)`
    }
    return 'system default: none detected (falls back to cookie files)'
  }
  if (!cookiesFromBrowser || cookiesFromBrowser === 'none') {
    return 'manual cookie files only'
  }
  const found = detectedBrowsers.find(b => b.id === cookiesFromBrowser)
  const browserName = found ? found.name : cookiesFromBrowser
  return `live session cookies from ${browserName}`
}

export function cycleBrowserOption(current: string, options: string[], forward = true): string {
  if (options.length === 0) return 'auto'
  const idx = options.indexOf(current)
  const currentIndex = idx === -1 ? 0 : idx
  const nextIdx = forward
    ? (currentIndex + 1) % options.length
    : (currentIndex - 1 + options.length) % options.length
  return options[nextIdx]!
}

export type SettingsViewProps = {
  boxWidth: number
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
  focusedField?: SettingsField
  onFocusChange?: (field: SettingsField) => void
  onSave: () => void
  onCancel: () => void
  doctorChecker?: ((options: DoctorOptions) => Promise<DoctorReport>) | ((bin: 'gallery-dl' | 'yt-dlp' | 'ffmpeg') => Promise<boolean>)
  initialReport?: DoctorReport | null
  browsers?: DetectedBrowser[]
  defaultBrowser?: DetectedBrowser | null
  initialConfig?: AppConfig
}

export type DoctorCardProps = {
  boxWidth: number
  theme: Theme
  report: DoctorReport | null
}

export function formatDoctorStorage(storageOk: boolean): {ok: boolean; text: string} {
  return {
    ok: storageOk,
    text: storageOk ? '✓ SQLite ready' : '✗ SQLite unavailable',
  }
}

export function formatDoctorCookies(cookies: Record<string, boolean>): {
  count: number
  platforms: string[]
  text: string
} {
  const platforms = Object.entries(cookies)
    .filter(([_, ok]) => ok)
    .map(([name]) => name)
  const count = platforms.length
  const text = count > 0 ? `✓ ${count} (${platforms.join(', ')})` : 'none detected'
  return {count, platforms, text}
}

export function formatDoctorEngines(
  binaries: Record<'gallery-dl' | 'yt-dlp' | 'ffmpeg', boolean>,
): Array<{name: 'gallery-dl' | 'yt-dlp' | 'ffmpeg'; ok: boolean; symbol: string; label: string}> {
  const engines: Array<'gallery-dl' | 'yt-dlp' | 'ffmpeg'> = ['gallery-dl', 'yt-dlp', 'ffmpeg']
  return engines.map(name => {
    const ok = Boolean(binaries[name])
    return {
      name,
      ok,
      symbol: ok ? '✓' : '✗',
      label: `${ok ? '✓' : '✗'} ${name}`,
    }
  })
}

export function DoctorCard({boxWidth, theme, report}: DoctorCardProps) {
  const cookieSummary = report ? formatDoctorCookies(report.cookies) : {count: 0, platforms: [], text: ''}
  const storageSummary = report ? formatDoctorStorage(report.storageOk) : {ok: false, text: ''}

  return (
    <Box
      width={boxWidth}
      borderStyle="round"
      borderColor={theme.gray}
      borderDimColor={theme.dimSecondary}
      paddingX={2}
      flexDirection="column"
    >
      <Box justifyContent="space-between">
        <Text color={theme.primary} bold>
          System Diagnostics
        </Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          {report ? report.nodeVersion : 'checking…'}
        </Text>
      </Box>

      {report ? (
        <>
          <Box marginTop={0}>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              Engines:{' '}
            </Text>
            <Text
              color={report.binaries['gallery-dl'] ? 'green' : 'red'}
              dimColor={!report.binaries['gallery-dl'] && theme.dimSecondary}
            >
              {report.binaries['gallery-dl'] ? '✓' : '✗'} gallery-dl
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              {' '}·{' '}
            </Text>
            <Text
              color={report.binaries['yt-dlp'] ? 'green' : 'red'}
              dimColor={!report.binaries['yt-dlp'] && theme.dimSecondary}
            >
              {report.binaries['yt-dlp'] ? '✓' : '✗'} yt-dlp
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              {' '}·{' '}
            </Text>
            <Text
              color={report.binaries.ffmpeg ? 'green' : 'red'}
              dimColor={!report.binaries.ffmpeg && theme.dimSecondary}
            >
              {report.binaries.ffmpeg ? '✓' : '✗'} ffmpeg
            </Text>
          </Box>

          <Box justifyContent="space-between" marginTop={0}>
            <Box>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                Storage:{' '}
              </Text>
              <Text
                color={storageSummary.ok ? 'green' : 'red'}
                dimColor={!storageSummary.ok && theme.dimSecondary}
              >
                {storageSummary.text}
              </Text>
            </Box>
            <Box>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                Cookies:{' '}
              </Text>
              <Text
                color={cookieSummary.count > 0 ? theme.primary : theme.gray}
                dimColor={cookieSummary.count === 0 && theme.dimSecondary}
              >
                {cookieSummary.text}
              </Text>
            </Box>
          </Box>
        </>
      ) : (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          checking system engines and storage…
        </Text>
      )}
    </Box>
  )
}

const LIMIT_OPTIONS = [undefined, 10, 25, 50, 100]

export function SettingsView({
  boxWidth,
  theme,
  gapComponent: Gap,
  focusedField: controlledFocus,
  onFocusChange,
  onSave,
  onCancel,
  doctorChecker,
  initialReport,
  browsers: browsersProp,
  defaultBrowser: defaultBrowserProp,
  initialConfig: initialConfigProp,
}: SettingsViewProps) {
  const initialConfig = useMemo(() => initialConfigProp ?? loadConfig(), [initialConfigProp])
  const [internalFocus, setInternalFocus] = useState<SettingsField>('cookies')
  const focusedField = controlledFocus ?? internalFocus

  const setField = useCallback(
    (field: SettingsField) => {
      setInternalFocus(field)
      onFocusChange?.(field)
    },
    [onFocusChange],
  )

  const defaultBrowser = useMemo(() => {
    return defaultBrowserProp !== undefined ? defaultBrowserProp : detectSystemDefaultBrowser()
  }, [defaultBrowserProp])

  const detectedBrowsers = useMemo(() => {
    return browsersProp ?? listDetectedBrowsers()
  }, [browsersProp])

  const browserOptions = useMemo(() => {
    return resolveBrowserOptions(detectedBrowsers)
  }, [detectedBrowsers])

  const [cookiesDir, setCookiesDir] = useState(initialConfig.cookiesDir ?? '')
  const [cookiesFromBrowser, setCookiesFromBrowser] = useState<AppConfig['cookiesFromBrowser']>(
    initialConfig.cookiesFromBrowser ?? 'auto',
  )
  const [downloadDir, setDownloadDir] = useState(initialConfig.downloadDir ?? '')
  const [writeMetadata, setWriteMetadata] = useState(Boolean(initialConfig.writeMetadata))
  const [defaultLimit, setDefaultLimit] = useState<number | undefined>(initialConfig.defaultLimit)
  const [saved, setSaved] = useState(false)
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(initialReport ?? null)

  useEffect(() => {
    let cancelled = false

    const fetchReport = async () => {
      try {
        const options: DoctorOptions = {
          cookiesDir: cookiesDir.trim() ? expandDir(cookiesDir.trim()) : undefined,
        }
        let report: DoctorReport
        if (doctorChecker) {
          const res = await (doctorChecker as any)(options)
          if (res && typeof res === 'object' && 'binaries' in res) {
            report = res
          } else {
            report = await runDoctor({
              ...options,
              binaryChecker: doctorChecker as any,
            })
          }
        } else {
          report = await runDoctor(options)
        }
        if (!cancelled) {
          setDoctorReport(report)
        }
      } catch {
        // preserve existing report on failure
      }
    }

    if (initialReport === undefined || doctorChecker !== undefined) {
      fetchReport()
    }

    return () => {
      cancelled = true
    }
  }, [cookiesDir, doctorChecker, initialReport])

  const handleSave = useCallback(() => {
    const existing = loadConfig()
    const nextConfig: AppConfig = {
      ...existing,
      cookiesDir: cookiesDir.trim() ? cookiesDir.trim() : undefined,
      cookiesFromBrowser,
      downloadDir: downloadDir.trim() ? downloadDir.trim() : undefined,
      writeMetadata,
      defaultLimit,
    }
    saveConfig(nextConfig)
    setSaved(true)
    onSave()
  }, [cookiesDir, cookiesFromBrowser, downloadDir, writeMetadata, defaultLimit, onSave])

  const browserFeedback = useMemo(() => {
    return formatBrowserFeedback(cookiesFromBrowser, detectedBrowsers, defaultBrowser)
  }, [cookiesFromBrowser, detectedBrowsers, defaultBrowser])

  const cookieFeedback = useMemo(() => {
    const dir = cookiesDir.trim()
    if (!dir) {
      const defaultCookies = detectAvailableCookies()
      return {
        ok: defaultCookies.length > 0,
        text: defaultCookies.length > 0
          ? `default paths · ${defaultCookies.length} cookie(s) found (${defaultCookies.join(', ')})`
          : 'default paths · no recognized cookies found',
      }
    }
    const expanded = expandDir(dir)
    if (!fs.existsSync(expanded)) {
      return {
        ok: false,
        text: 'directory does not exist yet',
      }
    }
    const detected = detectAvailableCookies(expanded)
    if (detected.length === 0) {
      return {
        ok: false,
        text: 'no recognized cookie files found in this directory',
      }
    }
    return {
      ok: true,
      text: `✓ ${detected.length} cookie(s) found (${detected.join(', ')})`,
    }
  }, [cookiesDir])

  const downloadFeedback = useMemo(() => {
    const dir = downloadDir.trim()
    if (!dir) {
      return 'default: platform Downloads / Open Nami'
    }
    return `target: ${path.resolve(expandDir(dir))}`
  }, [downloadDir])

  const cycleFocus = useCallback((forward = true) => {
    const fields: SettingsField[] = ['cookies', 'browser', 'download', 'metadata', 'limit']
    const idx = fields.indexOf(focusedField)
    const nextIdx = forward ? (idx + 1) % fields.length : (idx - 1 + fields.length) % fields.length
    setField(fields[nextIdx])
  }, [focusedField, setField])

  const cycleBrowser = useCallback((forward = true) => {
    setCookiesFromBrowser(prev => {
      const next = cycleBrowserOption(prev ?? 'auto', browserOptions, forward)
      return next as AppConfig['cookiesFromBrowser']
    })
  }, [browserOptions])

  const cycleLimit = useCallback(() => {
    setDefaultLimit(prev => {
      const idx = LIMIT_OPTIONS.indexOf(prev)
      const nextIdx = (idx + 1) % LIMIT_OPTIONS.length
      return LIMIT_OPTIONS[nextIdx]
    })
  }, [])

  useInput((input, key) => {
    if (key.escape) {
      onCancel()
      return
    }
    if (key.ctrl && (input === 's' || input === 'S')) {
      handleSave()
      return
    }

    if (focusedField === 'browser') {
      if (input === ' ' || key.return) {
        cycleBrowser(true)
        return
      }
      if (key.tab || key.downArrow) {
        cycleFocus(true)
        return
      }
      if (key.upArrow) {
        cycleFocus(false)
        return
      }
    }

    if (focusedField === 'metadata') {
      if (input === ' ' || key.return) {
        setWriteMetadata(prev => !prev)
        return
      }
      if (key.tab || key.downArrow) {
        cycleFocus(true)
        return
      }
      if (key.upArrow) {
        cycleFocus(false)
        return
      }
    }

    if (focusedField === 'limit') {
      if (input === ' ' || key.return) {
        cycleLimit()
        return
      }
      if (key.tab || key.downArrow) {
        cycleFocus(true)
        return
      }
      if (key.upArrow) {
        cycleFocus(false)
        return
      }
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  return (
    <Box flexDirection="column" alignItems="center">
      <FramedInput
        title={focusedField === 'cookies' ? '● Cookies Folder' : '○ Cookies Folder'}
        width={boxWidth}
      >
        <TextInput
          value={cookiesDir}
          onChange={setCookiesDir}
          onSubmit={() => setField('browser')}
          focus={focusedField === 'cookies'}
          onTab={() => cycleFocus(true)}
          onArrowDown={() => cycleFocus(true)}
          onArrowUp={() => cycleFocus(false)}
          placeholder="e.g. F:\Nami\cookies or ./cookies"
          width={boxWidth - 6}
        />
      </FramedInput>
      <Text color={cookieFeedback.ok ? theme.primary : theme.gray} dimColor={!cookieFeedback.ok && theme.dimSecondary}>
        {cookieFeedback.text}
      </Text>

      <Gap />

      <Box
        width={boxWidth}
        borderStyle="round"
        borderColor={focusedField === 'browser' ? theme.primary : theme.gray}
        borderDimColor={focusedField !== 'browser'}
        paddingX={2}
        justifyContent="space-between"
      >
        <Text color={focusedField === 'browser' ? theme.primary : theme.gray} bold={focusedField === 'browser'}>
          {focusedField === 'browser' ? '● ' : '○ '}Browser Cookie Bridge
        </Text>
        <Text color={cookiesFromBrowser && cookiesFromBrowser !== 'none' ? theme.primary : theme.gray} bold>
          {`[${(cookiesFromBrowser ?? 'auto').toUpperCase()}]`}
        </Text>
      </Box>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {browserFeedback}
      </Text>

      <Gap />

      <FramedInput
        title={focusedField === 'download' ? '● Download Directory' : '○ Download Directory'}
        width={boxWidth}
      >
        <TextInput
          value={downloadDir}
          onChange={setDownloadDir}
          onSubmit={() => setField('metadata')}
          focus={focusedField === 'download'}
          onTab={() => cycleFocus(true)}
          onArrowDown={() => cycleFocus(true)}
          onArrowUp={() => cycleFocus(false)}
          placeholder="e.g. D:\Downloads\Open Nami"
          width={boxWidth - 6}
        />
      </FramedInput>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {downloadFeedback}
      </Text>

      <Gap />

      <Box
        width={boxWidth}
        borderStyle="round"
        borderColor={focusedField === 'metadata' ? theme.primary : theme.gray}
        borderDimColor={focusedField !== 'metadata'}
        paddingX={2}
        justifyContent="space-between"
      >
        <Text color={focusedField === 'metadata' ? theme.primary : theme.gray} bold={focusedField === 'metadata'}>
          {focusedField === 'metadata' ? '● ' : '○ '}Write Captions & Metadata Sidecars (.json)
        </Text>
        <Text color={writeMetadata ? theme.primary : theme.gray} bold>
          {writeMetadata ? '[ENABLED]' : '[DISABLED]'}
        </Text>
      </Box>

      <Gap />

      <Box
        width={boxWidth}
        borderStyle="round"
        borderColor={focusedField === 'limit' ? theme.primary : theme.gray}
        borderDimColor={focusedField !== 'limit'}
        paddingX={2}
        justifyContent="space-between"
      >
        <Text color={focusedField === 'limit' ? theme.primary : theme.gray} bold={focusedField === 'limit'}>
          {focusedField === 'limit' ? '● ' : '○ '}Default Post Limit
        </Text>
        <Text color={theme.primary} bold>
          {defaultLimit ? `[${defaultLimit} posts]` : '[ALL]'}
        </Text>
      </Box>

      <Gap />

      <DoctorCard boxWidth={boxWidth} theme={theme} report={doctorReport} />

      <Gap />
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {saved ? '✓ preferences saved to ~/.open-nami/config.json' : 'tab / ↑↓ switch field · space toggle/cycle · ^s / ↵ save · esc back'}
      </Text>
    </Box>
  )
}
