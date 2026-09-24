import React from 'react'
import {Box, Text} from 'ink'
import SelectInput from 'ink-select-input'
import {Panel} from '../panel.js'
import {ChoiceIndicator, ChoiceItem} from './picking-view.js'
import type {Theme} from '../../theme.js'
import type {SupportedPlatform} from '../../lib/parser.js'

export interface PlatformOption {
  label: string
  value: SupportedPlatform
}

export const PLATFORM_OPTIONS: PlatformOption[] = [
  {label: 'Instagram', value: 'instagram'},
  {label: 'TikTok', value: 'tiktok'},
  {label: 'Facebook', value: 'facebook'},
  {label: 'X (Twitter)', value: 'x'},
]

export function getPlatformOptions(): PlatformOption[] {
  return PLATFORM_OPTIONS
}

export type PlatformViewProps = {
  contentWidth: number
  username: string
  onSelect: (platform: SupportedPlatform) => void
  onHighlight?: (platform: SupportedPlatform) => void
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function PlatformView({
  contentWidth,
  username,
  onSelect,
  onHighlight,
  theme,
  gapComponent: Gap,
}: PlatformViewProps) {
  const items = getPlatformOptions()

  return (
    <Box width={contentWidth}>
      <Box flexDirection="column" flexGrow={1} flexBasis={0} paddingTop={1} paddingRight={3}>
        <Text bold color={theme.primary}>
          @{username.replace(/^@/, '')}
        </Text>
        <Gap />
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          ▸ Choose platform
        </Text>
        <Gap />
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          Select target platform for this profile
        </Text>
      </Box>

      <Panel title="Platform" width={38}>
        <SelectInput
          indicatorComponent={ChoiceIndicator}
          itemComponent={ChoiceItem}
          items={items.map((item, index) => ({
            key: String(index),
            label: item.label,
            value: item.value,
          }))}
          onSelect={(item) => onSelect(item.value)}
          onHighlight={(item) => onHighlight?.(item.value)}
        />
      </Panel>
    </Box>
  )
}
