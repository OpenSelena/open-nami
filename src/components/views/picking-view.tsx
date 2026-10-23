import React, {useState, useEffect, useCallback} from 'react'
import {Box, Text, useInput} from 'ink'
import SelectInput, {type ItemProps, type IndicatorProps} from 'ink-select-input'
import {Panel} from '../panel.js'
import {useTheme, type Theme} from '../../theme.js'
import {loadCheckpoint} from '../../lib/engines/checkpoint.js'
import {resolveDefaultDownloadDir} from '../../lib/engines/dispatcher.js'
import type {ParsedProfile} from '../../lib/parser.js'
import type {MediaTarget} from '../../lib/engines/types.js'

export function ChoiceIndicator({isSelected}: IndicatorProps) {
  const theme = useTheme()
  return (
    <Box marginRight={1}>
      <Text color={theme.primary}>{isSelected ? '❯' : ' '}</Text>
    </Box>
  )
}

export function ChoiceItem({isSelected, label}: ItemProps) {
  const theme = useTheme()
  return (
    <Text color={theme.primary} bold={isSelected}>
      {label}
    </Text>
  )
}

export interface PickingOptions {
  choice: MediaTarget
  limit?: number
  since?: string
  writeMetadata?: boolean
  resume?: boolean
}

export type PickingViewProps = {
  contentWidth: number
  profile: ParsedProfile
  outputDir?: string
  initialLimit?: number
  initialSince?: string | number | Date
  initialWriteMetadata?: boolean
  initialResume?: boolean
  onSelect: (options: PickingOptions) => void
  onHighlight?: (choice: MediaTarget) => void
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function getPickingOptions(platform: ParsedProfile['platform']): Array<{label: string; value: MediaTarget}> {
  const items: Array<{label: string; value: MediaTarget}> = [
    {label: 'Photos', value: 'photos'},
    {label: 'Videos', value: 'videos'},
  ]

  if (platform === 'instagram') {
    items.push({label: 'Stories', value: 'stories'})
    items.push({label: 'Highlights', value: 'highlights'})
  }

  items.push({
    label: 'Everything',
    value: 'all',
  })

  return items
}

export function PickingView({
  contentWidth,
  profile,
  outputDir,
  initialLimit,
  initialSince,
  initialWriteMetadata = false,
  initialResume = true,
  onSelect,
  onHighlight,
  theme,
  gapComponent: Gap,
}: PickingViewProps) {
  const platformName = profile.platform.charAt(0).toUpperCase() + profile.platform.slice(1)
  const items = getPickingOptions(profile.platform)

  const [limit, setLimit] = useState<number | undefined>(initialLimit)
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>(() => {
    if (typeof initialSince === 'string' && (initialSince === '24h' || initialSince === '7d' || initialSince === '30d')) {
      return initialSince
    }
    return 'all'
  })
  const [writeMetadata, setWriteMetadata] = useState(initialWriteMetadata)
  const [resume, setResume] = useState(initialResume)
  const [hasCheckpoint, setHasCheckpoint] = useState(false)

  const targetDir = resolveDefaultDownloadDir(profile.platform, profile.username, outputDir)

  useEffect(() => {
    let isMounted = true
    loadCheckpoint(targetDir).then((cp) => {
      if (isMounted && cp && !cp.completed && Object.keys(cp.cursors || {}).length > 0) {
        setHasCheckpoint(true)
        setResume(true)
      }
    }).catch(() => {})
    return () => {
      isMounted = false
    }
  }, [targetDir])

  const cycleLimit = useCallback(() => {
    setLimit(prev => {
      if (!prev) return 10
      if (prev === 10) return 25
      if (prev === 25) return 50
      if (prev === 50) return 100
      return undefined
    })
  }, [])

  const cycleDate = useCallback(() => {
    setDateFilter(prev => {
      if (prev === 'all') return '24h'
      if (prev === '24h') return '7d'
      if (prev === '7d') return '30d'
      return 'all'
    })
  }, [])

  const toggleMetadata = useCallback(() => {
    setWriteMetadata(prev => !prev)
  }, [])

  const toggleResume = useCallback(() => {
    setResume(prev => !prev)
  }, [])

  useInput((input) => {
    if (input === 'l' || input === 'L') {
      cycleLimit()
      return
    }
    if (input === 'd' || input === 'D') {
      cycleDate()
      return
    }
    if (input === 'm' || input === 'M') {
      toggleMetadata()
      return
    }
    if (input === 'r' || input === 'R') {
      toggleResume()
      return
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  const handleItemSelect = (selectedChoice: MediaTarget) => {
    onSelect({
      choice: selectedChoice,
      limit,
      since: dateFilter === 'all' ? undefined : dateFilter,
      writeMetadata,
      resume,
    })
  }

  return (
    <Box width={contentWidth}>
      <Box flexDirection="column" flexGrow={1} flexBasis={0} paddingTop={1} paddingRight={3}>
        <Text bold color={theme.primary}>
          @{profile.username}
        </Text>
        <Gap />
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          ▸ {platformName}
          {profile.cleanUrl ? ` · ${profile.cleanUrl}` : ''}
        </Text>
        <Gap />
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          Choose media category to download.
        </Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          Use hotkeys [l], [d], [m], [r] to adjust options.
        </Text>

        {hasCheckpoint ? (
          <Box marginTop={1}>
            <Text color={theme.primary} bold>
              ⚡ Checkpoint found (cursor saved)
            </Text>
          </Box>
        ) : null}
      </Box>

      <Panel title="Download" width={38}>
        <SelectInput
          indicatorComponent={ChoiceIndicator}
          itemComponent={ChoiceItem}
          items={items.map((item, index) => ({
            key: String(index),
            label: item.label,
            value: item.value,
          }))}
          onSelect={(item) => handleItemSelect(item.value)}
          onHighlight={(item) => onHighlight?.(item.value)}
        />

        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={theme.gray}
          borderDimColor
          paddingX={1}
        >
          <Box justifyContent="space-between">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [l] Limit: <Text color={theme.primary} bold>{limit ? `${limit}` : 'ALL'}</Text>
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [d] Date: <Text color={theme.primary} bold>{dateFilter === 'all' ? 'ALL' : dateFilter.toUpperCase()}</Text>
            </Text>
          </Box>
          <Box justifyContent="space-between">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [m] Sidecars: <Text color={theme.primary} bold>{writeMetadata ? 'ON' : 'OFF'}</Text>
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [r] Resume: <Text color={theme.primary} bold>{resume ? 'ON' : 'OFF'}</Text>
            </Text>
          </Box>
        </Box>
      </Panel>
    </Box>
  )
}
