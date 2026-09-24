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
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
}

export function DownloadingView({
  profile,
  choice,
  progress,
  outputDir,
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
      <Gap />
      <Text color={theme.gray} dimColor={theme.dimSecondary}>
        {`${downloaded} downloaded  ·  ${skipped} archived  ·  ${formatDuration(elapsed)} elapsed`}
      </Text>
      {outputDir ? (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          saving to {shortenPath(outputDir, os.homedir(), 54)}
        </Text>
      ) : null}
    </Box>
  )
}
