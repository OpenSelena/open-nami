import React, {useState, useMemo, useCallback} from 'react'
import {Box, Text, useInput} from 'ink'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {FramedInput} from '../framed-input.js'
import {TextInput} from '../text-input.js'
import {loadConfig, saveConfig, type AppConfig} from '../../lib/config.js'
import {detectAvailableCookies} from '../../lib/cookies.js'
import type {Theme} from '../../theme.js'

function expandDir(dir: string): string {
  if (dir.startsWith('~/') || dir.startsWith('~\\') || dir === '~') {
    return path.join(os.homedir(), dir.slice(1))
  }
  return dir
}

export type SettingsViewProps = {
  boxWidth: number
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
  focusedField?: 'cookies' | 'download'
  onFocusChange?: (field: 'cookies' | 'download') => void
  onSave: () => void
  onCancel: () => void
}

export function SettingsView({
  boxWidth,
  theme,
  gapComponent: Gap,
  focusedField: controlledFocus,
  onFocusChange,
  onSave,
  onCancel,
}: SettingsViewProps) {
  const initialConfig = useMemo(() => loadConfig(), [])
  const [internalFocus, setInternalFocus] = useState<'cookies' | 'download'>('cookies')
  const focusedField = controlledFocus ?? internalFocus

  const setField = useCallback(
    (field: 'cookies' | 'download') => {
      setInternalFocus(field)
      onFocusChange?.(field)
    },
    [onFocusChange],
  )

  const [cookiesDir, setCookiesDir] = useState(initialConfig.cookiesDir ?? '')
  const [downloadDir, setDownloadDir] = useState(initialConfig.downloadDir ?? '')
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(() => {
    const existing = loadConfig()
    const nextConfig: AppConfig = {
      ...existing,
      cookiesDir: cookiesDir.trim() ? cookiesDir.trim() : undefined,
      downloadDir: downloadDir.trim() ? downloadDir.trim() : undefined,
    }
    saveConfig(nextConfig)
    setSaved(true)
    onSave()
  }, [cookiesDir, downloadDir, onSave])

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

  useInput((input, key) => {
    if (key.escape) {
      onCancel()
      return
    }
    if (key.ctrl && (input === 's' || input === 'S')) {
      handleSave()
      return
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
          onSubmit={() => setField('download')}
          focus={focusedField === 'cookies'}
          onTab={() => setField('download')}
          onArrowDown={() => setField('download')}
          onArrowUp={() => setField('download')}
          placeholder="e.g. F:\Nami\cookies or ./cookies"
          width={boxWidth - 6}
        />
      </FramedInput>
      <Text color={cookieFeedback.ok ? theme.primary : theme.gray} dimColor={!cookieFeedback.ok && theme.dimSecondary}>
        {cookieFeedback.text}
      </Text>

      <Gap />

      <FramedInput
        title={focusedField === 'download' ? '● Download Directory' : '○ Download Directory'}
        width={boxWidth}
      >
        <TextInput
          value={downloadDir}
          onChange={setDownloadDir}
          onSubmit={handleSave}
          focus={focusedField === 'download'}
          onTab={() => setField('cookies')}
          onArrowDown={() => setField('cookies')}
          onArrowUp={() => setField('cookies')}
          placeholder="e.g. D:\Downloads\Open Nami"
          width={boxWidth - 6}
        />
      </FramedInput>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {downloadFeedback}
      </Text>

      <Gap />
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {saved ? '✓ preferences saved to ~/.open-nami/config.json' : 'tab / ↑↓ switch field · ↵ advance/save · esc back'}
      </Text>
    </Box>
  )
}
