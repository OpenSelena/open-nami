import React, {useState, useEffect} from 'react'
import os from 'node:os'
import {Box, Text} from 'ink'
import Spinner from 'ink-spinner'
import {ProgressBar} from '../progress-bar.js'
import {formatDuration, shortenPath, truncate} from '../../lib/format.js'
import type {ParsedProfile} from '../../lib/parser.js'
import type {EngineProgress, MediaTarget} from '../../lib/engines/types.js'
import type {Theme} from '../../theme.js'

export type DownloadingViewProps = {
  profile: ParsedProfile
  choice?: MediaTarget
  progress?: EngineProgress
  outputDir?: string
  writeMetadata?: boolean
  limit?: number
  since?: string | number | Date
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function renderCarouselTrack(current: number, total: number): string {
  const safeTotal = Math.max(1, Math.min(15, total))
  const safeCurrent = Math.max(1, Math.min(safeTotal, current))
  return Array.from({length: safeTotal}, (_, i) => (i < safeCurrent ? '●' : '○')).join(' ')
}

export function DownloadingView({
  profile,
  choice,
  progress,
  outputDir,
  writeMetadata,
  limit,
  since,
  theme,
  gapComponent: Gap,
}: DownloadingViewProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const job = progress?.job || (choice ? `${choice.charAt(0).toUpperCase() + choice.slice(1)}` : 'Initializing')
  const downloaded = progress?.downloadedCount ?? 0
  const skipped = progress?.skippedCount ?? 0
  const currentFile = progress?.currentFile ? truncate(progress.currentFile, 42) : ''
  const statusLine = progress?.statusText || (currentFile ? currentFile : 'downloading…')

  let slideInfo: {current: number; total: number} | null = null
  const slideRegex = /(?:Slide|Album\s+slide|Part)\s+(\d+)\/(\d+)/i
  const match = statusLine.match(slideRegex) || currentFile.match(slideRegex)
  if (match) {
    const cur = parseInt(match[1], 10)
    const tot = parseInt(match[2], 10)
    if (!isNaN(cur) && !isNaN(tot) && tot > 1) {
      slideInfo = {current: cur, total: tot}
    }
  }

  const activeBadges: string[] = []
  if (writeMetadata) activeBadges.push('Sidecars: ON')
  if (limit) activeBadges.push(`Limit: ${limit}`)
  if (since) activeBadges.push(`Date: ${since}`)

  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        @{profile.username} · {job}
      </Text>
      <Gap />
      <ProgressBar indeterminate width={30} />
      <Gap />
      <Text>
        <Text color={theme.primary}>
          <Spinner type="dots" />
        </Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          {` ${statusLine}`}
        </Text>
      </Text>

      {slideInfo ? (
        <Box marginTop={1} flexDirection="column" alignItems="center">
          <Text color={theme.primary} bold>
            Album Slide [{renderCarouselTrack(slideInfo.current, slideInfo.total)}] {slideInfo.current}/{slideInfo.total}
          </Text>
        </Box>
      ) : null}

      <Gap />
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {`${downloaded} downloaded  ·  ${skipped} archived  ·  ${formatDuration(elapsed)} elapsed`}
      </Text>
      {activeBadges.length > 0 ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          {activeBadges.join(' · ')}
        </Text>
      ) : null}
      {outputDir ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          saving to {shortenPath(outputDir, os.homedir(), 54)}
        </Text>
      ) : null}
    </Box>
  )
}
