import React from 'react'
import os from 'node:os'
import {Box, Text} from 'ink'
import {shortenPath, cleanInlineError} from '../../lib/format.js'
import type {ParsedProfile} from '../../lib/parser.js'
import type {EngineResult} from '../../lib/engines/types.js'
import type {Theme} from '../../theme.js'

export const DONE_LABEL = '↵ download another'
export const REVEAL_LABEL = '[o] reveal in folder'
export const LEDGER_INDEXED_LABEL = '✓ indexed in media ledger'

export function shouldShowLedgerBadge(
  result: Pick<EngineResult, 'downloadedCount'>,
  showLedgerBadge?: boolean,
): boolean {
  return showLedgerBadge ?? (result.downloadedCount > 0)
}

export function formatCompletionSummary(result: Pick<EngineResult, 'downloadedCount' | 'skippedCount'>) {
  const isZero = result.downloadedCount === 0 && result.skippedCount === 0
  const plural = result.downloadedCount === 1 ? '' : 's'
  const skipText = result.skippedCount > 0 ? ` (${result.skippedCount} archived)` : ''

  return {
    isZero,
    headerPrefix: isZero ? '✓ profile scanned ' : '✓ profile downloaded! ',
    headerSuffix: isZero ? ': 0 media items found' : 'saved to:',
    itemsText: isZero
      ? 'no photos or videos available'
      : `${result.downloadedCount} media item${plural} downloaded${skipText}`,
  }
}

export type LedgerBadgeProps = {
  theme: Theme
}

export function LedgerBadge({theme}: LedgerBadgeProps) {
  return (
    <Text color={theme.gray} dimColor={theme.dimSecondary}>
      {LEDGER_INDEXED_LABEL}
    </Text>
  )
}

export type CompletionViewProps = {
  profile: ParsedProfile
  result: EngineResult
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
  showLedgerBadge?: boolean
}

export function CompletionView({
  profile,
  result,
  theme,
  gapComponent: Gap,
  showLedgerBadge,
}: CompletionViewProps) {
  const {headerPrefix, headerSuffix, itemsText} = formatCompletionSummary(result)
  const displayLedger = shouldShowLedgerBadge(result, showLedgerBadge)

  return (
    <Box flexDirection="column" alignItems="center">
      <Text>
        <Text bold color={theme.primary}>{headerPrefix}</Text>
        <Text color={theme.primary}>{headerSuffix}</Text>
      </Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {shortenPath(result.outputDir, os.homedir(), 60)}
      </Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {itemsText}
      </Text>
      {displayLedger && (
        <LedgerBadge theme={theme} />
      )}
      <Box marginTop={1}>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          <Text bold color={theme.primary}>[o]</Text> reveal in folder
        </Text>
      </Box>
      <Gap />
      <Box
        borderStyle="round"
        borderColor={theme.gray}
        borderDimColor={theme.dimSecondary}
        borderBackgroundColor={theme.background}
        paddingX={3}
      >
        <Text bold color={theme.primary}>{DONE_LABEL}</Text>
      </Box>
      {result.errors.length > 0 ? (
        <Box flexDirection="column" marginTop={1} alignItems="center">
          {result.errors.slice(0, 3).map((err, i) => (
            <Text key={i} color="red" dimColor wrap="wrap">
              • {cleanInlineError(err)}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  )
}
