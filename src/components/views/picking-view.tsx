import React, {useState, useEffect} from 'react'
import {Box, Text} from 'ink'
import SelectInput, {type ItemProps, type IndicatorProps} from 'ink-select-input'
import {useTheme, type Theme} from '../../theme.js'
import {loadCheckpoint} from '../../lib/engines/checkpoint.js'
import {resolveDefaultDownloadDir} from '../../lib/engines/dispatcher.js'
import type {ParsedProfile} from '../../lib/parser.js'
import type {MediaTarget} from '../../lib/engines/types.js'

export function ChoiceIndicator({isSelected}: IndicatorProps) {
  const theme = useTheme()
  return (
    <Box>
      <Text color={theme.primary} bold>
        {isSelected ? '❯ ' : '  '}
      </Text>
    </Box>
  )
}

export function ChoiceItem({
  isSelected,
  label,
  value,
  description,
}: ItemProps & {value?: MediaTarget; description?: string}) {
  const theme = useTheme()
  const rawTag = `[${value === 'all' ? 'EVERYTHING' : String(value || label).toUpperCase()}]`
  const paddedTag = rawTag.padEnd(12, ' ')

  return (
    <Box>
      <Text
        color={isSelected ? theme.background : theme.primary}
        backgroundColor={isSelected ? theme.primary : undefined}
        bold={isSelected}
      >
        {paddedTag}
      </Text>
      <Text color={theme.gray}>  </Text>
      <Text color={isSelected ? theme.primary : theme.gray} dimColor={!isSelected} bold={isSelected}>
        {description || label}
      </Text>
    </Box>
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

export interface PickingOption {
  label: string
  value: MediaTarget
  description: string
}

export function getPickingOptions(platform: ParsedProfile['platform']): PickingOption[] {
  const items: PickingOption[] = [
    {label: 'Photos', value: 'photos', description: 'Feed images and carousels'},
    {label: 'Videos', value: 'videos', description: 'Reels and timeline clips'},
  ]

  if (platform === 'instagram') {
    items.push({label: 'Stories', value: 'stories', description: 'Active 24h stories'})
    items.push({label: 'Highlights', value: 'highlights', description: 'Saved story archive reels'})
  }

  items.push({
    label: 'Everything',
    value: 'all',
    description: 'Complete profile download',
  })

  return items
}

export function PickingView({
  contentWidth,
  profile,
  outputDir,
  initialLimit,
  initialSince,
  initialUntil,
  initialWriteMetadata = false,
  initialResume = true,
  onSelect,
  onHighlight,
  theme,
  gapComponent: Gap,
}: PickingViewProps) {
  const platformName = profile.platform.charAt(0).toUpperCase() + profile.platform.slice(1)
  const items = getPickingOptions(profile.platform)
  const [hasCheckpoint, setHasCheckpoint] = useState(false)

  const targetDir = resolveDefaultDownloadDir(profile.platform, profile.username, outputDir)

  useEffect(() => {
    let isMounted = true
    loadCheckpoint(targetDir).then((cp) => {
      if (isMounted && cp && !cp.completed && Object.keys(cp.cursors || {}).length > 0) {
        setHasCheckpoint(true)
      }
    }).catch(() => {})
    return () => {
      isMounted = false
    }
  }, [targetDir])

  const handleItemSelect = (selectedChoice: MediaTarget) => {
    onSelect({
      choice: selectedChoice,
      limit: initialLimit,
      since: typeof initialSince === 'string' ? initialSince : undefined,
      until: typeof initialUntil === 'string' ? initialUntil : undefined,
      writeMetadata: initialWriteMetadata,
      resume: initialResume,
    })
  }

  const boxWidth = Math.min(48, Math.max(44, (contentWidth || 80) - 8))

  return (
    <Box flexDirection="column" alignItems="center" width="100%">
      {/* Centered Profile Header & Prompt */}
      <Box flexDirection="column" alignItems="center" marginBottom={1}>
        <Text bold color={theme.primary}>
          @{profile.username}
        </Text>
        <Gap />
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          ▸ {platformName}{profile.cleanUrl ? ` · ${profile.cleanUrl}` : ''}
        </Text>
        <Gap />
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          Select target media:
        </Text>
      </Box>

      {/* Centered Modern Accent Options Block */}
      <Box flexDirection="column" width={boxWidth}>
        <SelectInput
          indicatorComponent={ChoiceIndicator}
          itemComponent={ChoiceItem as any}
          items={items.map((item, index) => ({
            key: String(index),
            label: item.label,
            value: item.value,
            description: item.description,
          }))}
          onSelect={(item) => handleItemSelect(item.value)}
          onHighlight={(item) => onHighlight?.(item.value)}
        />

        {hasCheckpoint ? (
          <Box marginTop={1}>
            <Text color={theme.primary} bold>
              ⚡ Checkpoint found (cursor saved)
            </Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
