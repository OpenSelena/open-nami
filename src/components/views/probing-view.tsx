import React from 'react'
import {Box, Text} from 'ink'
import {FramedInput} from '../framed-input.js'
import type {Theme} from '../../theme.js'

export type ProbingViewProps = {
  platformName?: string
  target: string
  boxWidth: number
  theme: Theme
  buttonText: string
}

export function ProbingView({
  platformName,
  target,
  boxWidth,
  theme,
  buttonText,
}: ProbingViewProps) {
  const displayTarget = target.length > boxWidth - 8 ? `${target.slice(0, boxWidth - 9)}…` : target

  return (
    <Box flexDirection="column" alignItems="center">
      <FramedInput title={platformName || 'Paste a profile link'} width={boxWidth} button={buttonText} buttonDim>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          {displayTarget}
        </Text>
      </FramedInput>
    </Box>
  )
}
