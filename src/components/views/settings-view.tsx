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

export type SettingsField = 'cookies' | 'download' | 'metadata' | 'limit'

export type SettingsViewProps = {
  boxWidth: number
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
  focusedField?: SettingsField
  onFocusChange?: (field: SettingsField) => void
  onSave: () => void
  onCancel: () => void
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
}: SettingsViewProps) {
  const initialConfig = useMemo(() => loadConfig(), [])
  const [internalFocus, setInternalFocus] = useState<SettingsField>('cookies')
  const focusedField = controlledFocus ?? internalFocus

  const setField = useCallback(
    (field: SettingsField) => {
      setInternalFocus(field)
      onFocusChange?.(field)
    },
    [onFocusChange],
  )

  const [cookiesDir, setCookiesDir] = useState(initialConfig.cookiesDir ?? '')
  const [downloadDir, setDownloadDir] = useState(initialConfig.downloadDir ?? '')
  const [writeMetadata, setWriteMetadata] = useState(Boolean(initialConfig.writeMetadata))
  const [defaultLimit, setDefaultLimit] = useState<number | undefined>(initialConfig.defaultLimit)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(() => {
    const existing = loadConfig()
    const nextConfig: AppConfig = {
      ...existing,
      cookiesDir: cookiesDir.trim() ? cookiesDir.trim() : undefined,
      downloadDir: downloadDir.trim() ? downloadDir.trim() : undefined,
      writeMetadata,
      defaultLimit,
    }
    saveConfig(nextConfig)
    setSaved(true)
    onSave()
  }, [cookiesDir, downloadDir, writeMetadata, defaultLimit, onSave])

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
    const fields: SettingsField[] = ['cookies', 'download', 'metadata', 'limit']
    const idx = fields.indexOf(focusedField)
    const nextIdx = forward ? (idx + 1) % fields.length : (idx - 1 + fields.length) % fields.length
    setField(fields[nextIdx])
  }, [focusedField, setField])

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
          onSubmit={() => setField('download')}
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
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {saved ? '✓ preferences saved to ~/.open-nami/config.json' : 'tab / ↑↓ switch field · space toggle/cycle · ^s / ↵ save · esc back'}
      </Text>
    </Box>
  )
}
