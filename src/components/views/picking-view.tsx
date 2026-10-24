import React, {useState, useEffect} from 'react'
import {Box, Text} from 'ink'
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
          Select what to download from this profile.
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
      </Panel>
    </Box>
  )
}
