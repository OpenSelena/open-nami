import React, {type ReactNode} from 'react'
import {Box, Text} from 'ink'
import {useTheme} from '../theme.js'

/**
 * A bordered panel with the title on the top border, sized to its content:
 * the top line is drawn by hand (ink borders can't embed titles), the
 * sides and bottom come from ink with borderTop disabled.
 */
export function Panel({title, width, children}: {title: string; width: number; children: ReactNode}) {
  const theme = useTheme()
  const inner = Math.max(0, width - 2)
  const maxTitleLen = Math.max(0, inner - 4)
  const displayTitle = title.length > maxTitleLen ? title.slice(0, Math.max(0, maxTitleLen - 1)) + '…' : title
  const tail = Math.max(0, inner - displayTitle.length - 3)

  return (
    <Box flexDirection="column" width={width}>
      <Text wrap="truncate-end">
        <Text color={theme.gray} dimColor={theme.dimSecondary}>{'╭─ '}</Text>
        <Text color={theme.primary}>{displayTitle}</Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>{` ${'─'.repeat(tail)}╮`}</Text>
      </Text>
      <Box
        width={width}
        borderStyle="round"
        borderColor={theme.gray}
        borderDimColor={theme.dimSecondary}
        borderBackgroundColor={theme.background}
        borderTop={false}
        flexDirection="column"
        paddingX={2}
      >
        {children}
      </Box>
    </Box>
  )
}
