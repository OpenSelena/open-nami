import React from 'react'
import {Box, Text} from 'ink'
import type {Theme} from '../../theme.js'

export type ErrorViewProps = {
  message: string
  hint?: string
  columns: number
  theme: Theme
}

export function ErrorView({message, hint, columns, theme}: ErrorViewProps) {
  const width = Math.max(10, Math.min(columns - 6, 72))

  return (
    <Box flexDirection="column" alignItems="center" width={width}>
      <Text bold color={theme.primary}>✗ {message}</Text>
      {hint ? (
        <Box marginTop={1}>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            Hint: {hint}
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}
