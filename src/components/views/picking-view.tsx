import React, {useState, useEffect, useCallback} from 'react'
import {Box, Text, useInput} from 'ink'
import SelectInput, {type ItemProps, type IndicatorProps} from 'ink-select-input'
import {Panel} from '../panel.js'
import {TextInput} from '../text-input.js'
import {useTheme, type Theme} from '../../theme.js'
import {loadCheckpoint} from '../../lib/engines/checkpoint.js'
import {resolveDefaultDownloadDir} from '../../lib/engines/dispatcher.js'
import {resolveDateFilter, parseLimit} from '../../lib/engines/filters.js'
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
  until?: string
  writeMetadata?: boolean
  resume?: boolean
}

export type PickingViewProps = {
  contentWidth: number
  profile: ParsedProfile
  outputDir?: string
  initialLimit?: number
  initialSince?: string | number | Date
  initialUntil?: string | number | Date
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

const DATE_PRESETS = ['all', '24h', '7d', '30d', '2024', '2023', '2022', '2021', 'custom']
const LIMIT_PRESETS: Array<number | 'custom' | undefined> = [undefined, 10, 24, 50, 100, 'custom']

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
  const [dateFilter, setDateFilter] = useState<string>(() => {
    if (typeof initialSince === 'string' && initialSince.trim()) {
      return initialSince.trim()
    }
    return 'all'
  })
  const [writeMetadata, setWriteMetadata] = useState(initialWriteMetadata)
  const [resume, setResume] = useState(initialResume)
  const [hasCheckpoint, setHasCheckpoint] = useState(false)

  // Custom input editing state
  const [editingModal, setEditingModal] = useState<'limit' | 'date' | null>(null)
  const [customLimitText, setCustomLimitText] = useState('')
  const [customDateText, setCustomDateText] = useState('')

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
    const curIdx = LIMIT_PRESETS.findIndex(p => p === limit)
    const nextIdx = (curIdx + 1) % LIMIT_PRESETS.length
    const nextVal = LIMIT_PRESETS[nextIdx]
    if (nextVal === 'custom') {
      setCustomLimitText(limit ? String(limit) : '24')
      setEditingModal('limit')
    } else {
      setLimit(nextVal)
    }
  }, [limit])

  const cycleDate = useCallback(() => {
    const curIdx = DATE_PRESETS.indexOf(dateFilter)
    const nextIdx = (curIdx + 1) % DATE_PRESETS.length
    const nextVal = DATE_PRESETS[nextIdx]
    if (nextVal === 'custom') {
      setCustomDateText(dateFilter !== 'all' ? dateFilter : '2021')
      setEditingModal('date')
    } else {
      setDateFilter(nextVal)
    }
  }, [dateFilter])

  const toggleMetadata = useCallback(() => {
    setWriteMetadata(prev => !prev)
  }, [])

  const toggleResume = useCallback(() => {
    setResume(prev => !prev)
  }, [])

  useInput((input, key) => {
    if (editingModal) {
      if (key.escape) {
        setEditingModal(null)
      }
      return
    }

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
    if (editingModal) return
    const dateRange = resolveDateFilter(dateFilter)
    onSelect({
      choice: selectedChoice,
      limit,
      since: dateRange.since,
      until: dateRange.until,
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
          Select media type. Hotkeys [l], [d], [m], [r] adjust options.
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
        {!editingModal && (
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
        )}

        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor={editingModal ? theme.primary : theme.gray}
          borderDimColor={!editingModal}
          paddingX={1}
        >
          {editingModal === 'limit' ? (
            <Box flexDirection="column">
              <Text bold color={theme.primary}>Set post limit (e.g. 24, all):</Text>
              <Box marginTop={1}>
                <TextInput
                  value={customLimitText}
                  onChange={setCustomLimitText}
                  onSubmit={(val) => {
                    const parsed = parseLimit(val)
                    setLimit(parsed)
                    setEditingModal(null)
                  }}
                  width={24}
                />
              </Box>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>↵ confirm · esc cancel</Text>
            </Box>
          ) : editingModal === 'date' ? (
            <Box flexDirection="column">
              <Text bold color={theme.primary}>Set date or year (e.g. 2021, 7d):</Text>
              <Box marginTop={1}>
                <TextInput
                  value={customDateText}
                  onChange={setCustomDateText}
                  onSubmit={(val) => {
                    const trimmed = val.trim()
                    setDateFilter(trimmed ? trimmed : 'all')
                    setEditingModal(null)
                  }}
                  width={24}
                />
              </Box>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>↵ confirm · esc cancel</Text>
            </Box>
          ) : (
            <>
              <Box justifyContent="space-between">
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  [l] Posts: <Text color={theme.primary} bold>{limit ? `${limit}` : 'ALL'}</Text>
                </Text>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  [d] Date: <Text color={theme.primary} bold>{dateFilter.toUpperCase()}</Text>
                </Text>
              </Box>
              <Box justifyContent="space-between">
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  [m] Meta: <Text color={theme.primary} bold>{writeMetadata ? 'ON' : 'OFF'}</Text>
                </Text>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  [r] Resume: <Text color={theme.primary} bold>{resume ? 'ON' : 'OFF'}</Text>
                </Text>
              </Box>
            </>
          )}
        </Box>
      </Panel>
    </Box>
  )
}
