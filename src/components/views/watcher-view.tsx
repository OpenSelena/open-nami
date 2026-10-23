import React, {useState, useEffect, useRef, useCallback} from 'react'
import {Box, Text, useInput} from 'ink'
import Spinner from 'ink-spinner'
import {Panel} from '../panel.js'
import {ProgressBar} from '../progress-bar.js'
import {startClipboardWatcher} from '../../lib/watcher.js'
import {resolveDefaultDownloadDir} from '../../lib/engines/dispatcher.js'
import {revealInFileManager} from '../../lib/reveal.js'
import type {ParsedProfile} from '../../lib/parser.js'
import type {MediaTarget, EngineResult} from '../../lib/engines/types.js'
import type {Theme} from '../../theme.js'

export interface DetectedItem {
  profile: ParsedProfile
  status: 'downloading' | 'completed' | 'failed'
  statusText?: string
  downloaded?: number
  skipped?: number
  error?: string
}

export interface WatcherViewProps {
  onBack: () => void
  outputDir?: string
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
  defaultChoice?: MediaTarget
  defaultWriteMetadata?: boolean
}

export function WatcherView({
  onBack,
  outputDir,
  theme,
  gapComponent: Gap,
  defaultChoice = 'all',
  defaultWriteMetadata = false,
}: WatcherViewProps) {
  const [mediaChoice, setMediaChoice] = useState<MediaTarget>(defaultChoice)
  const [writeMetadata, setWriteMetadata] = useState(defaultWriteMetadata)
  const [history, setHistory] = useState<DetectedItem[]>([])
  const [activeJob, setActiveJob] = useState<DetectedItem | null>(null)
  const [stats, setStats] = useState({detected: 0, downloaded: 0, skipped: 0})
  const [pulseTick, setPulseTick] = useState(0)

  const mediaChoiceRef = useRef(mediaChoice)
  mediaChoiceRef.current = mediaChoice
  const writeMetadataRef = useRef(writeMetadata)
  writeMetadataRef.current = writeMetadata

  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setPulseTick(t => t + 1)
    }, 120)
    return () => clearInterval(pulseTimer)
  }, [])

  useEffect(() => {
    const watcher = startClipboardWatcher({
      choice: mediaChoiceRef.current,
      outputDir,
      writeMetadata: writeMetadataRef.current,
      onDetected: (profile) => {
        setStats(prev => ({...prev, detected: prev.detected + 1}))
        const newItem: DetectedItem = {
          profile,
          status: 'downloading',
          statusText: 'starting download…',
        }
        setActiveJob(newItem)
        setHistory(prev => [newItem, ...prev.slice(0, 4)])
      },
      onProgress: (profile, statusText) => {
        setActiveJob(prev => {
          if (!prev || prev.profile.cleanUrl !== profile.cleanUrl) return prev
          return {...prev, statusText}
        })
      },
      onComplete: (profile, result: EngineResult) => {
        setStats(prev => ({
          ...prev,
          downloaded: prev.downloaded + result.downloadedCount,
          skipped: prev.skipped + result.skippedCount,
        }))
        const completedItem: DetectedItem = {
          profile,
          status: result.success ? 'completed' : 'failed',
          statusText: result.success
            ? `${result.downloadedCount} downloaded, ${result.skippedCount} skipped`
            : result.errors[0] || 'failed',
          downloaded: result.downloadedCount,
          skipped: result.skippedCount,
        }
        setActiveJob(null)
        setHistory(prev => [
          completedItem,
          ...prev.filter(item => item.profile.cleanUrl !== profile.cleanUrl).slice(0, 4),
        ])
      },
      onError: (profile, err) => {
        const failedItem: DetectedItem = {
          profile,
          status: 'failed',
          statusText: err.message,
          error: err.message,
        }
        setActiveJob(null)
        setHistory(prev => [
          failedItem,
          ...prev.filter(item => item.profile.cleanUrl !== profile.cleanUrl).slice(0, 4),
        ])
      },
    })

    return () => {
      watcher.stop()
    }
  }, [outputDir])

  const cycleChoice = useCallback(() => {
    setMediaChoice(prev => {
      if (prev === 'all') return 'photos'
      if (prev === 'photos') return 'videos'
      return 'all'
    })
  }, [])

  const toggleMetadata = useCallback(() => {
    setWriteMetadata(prev => !prev)
  }, [])

  const openFolder = useCallback(() => {
    const target = outputDir || resolveDefaultDownloadDir('instagram', 'watcher')
    revealInFileManager(target)
  }, [outputDir])

  useInput((input, key) => {
    if (key.escape) {
      onBack()
      return
    }
    if (input === 'c' || input === 'C') {
      cycleChoice()
      return
    }
    if (input === 'm' || input === 'M') {
      toggleMetadata()
      return
    }
    if (input === 'o' || input === 'O') {
      openFolder()
      return
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  const radarIcon = ['◎', '◉', '○', '●'][pulseTick % 4]

  return (
    <Box flexDirection="column" alignItems="center">
      <Panel title="Clipboard Watcher Radar" width={64}>
        <Box flexDirection="column" paddingY={1}>
          <Box justifyContent="space-between" marginBottom={1}>
            <Text color={theme.primary} bold>
              {radarIcon} RADAR ACTIVE
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              interval: 1.0s · auto-download
            </Text>
          </Box>

          <ProgressBar indeterminate width={58} tick={pulseTick} />

          <Gap />
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            Listening for Instagram, TikTok, Facebook, or X profile links in clipboard.
          </Text>
          <Text color={theme.gray} dimColor={theme.dimSecondary}>
            Simply copy any profile link in your browser and Open Nami will download it!
          </Text>

          <Gap />
          <Box
            borderStyle="round"
            borderColor={activeJob ? theme.primary : theme.gray}
            borderDimColor={!activeJob}
            flexDirection="column"
            paddingX={1}
            paddingY={1}
          >
            {activeJob ? (
              <Box flexDirection="column">
                <Box>
                  <Text color={theme.primary}>
                    <Spinner type="dots" />
                  </Text>
                  <Text bold color={theme.primary}>
                    {` Downloading @${activeJob.profile.username} (${activeJob.profile.platform})`}
                  </Text>
                </Box>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  {`Status: ${activeJob.statusText || 'downloading…'}`}
                </Text>
              </Box>
            ) : (
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                Waiting for copied profile links… (radar scanning)
              </Text>
            )}
          </Box>

          {history.length > 0 ? (
            <Box flexDirection="column" marginTop={1}>
              <Text bold color={theme.primary}>
                Recent Activity:
              </Text>
              {history.map((item, idx) => (
                <Box key={`${item.profile.cleanUrl}-${idx}`} justifyContent="space-between">
                  <Text color={item.status === 'completed' ? theme.primary : item.status === 'failed' ? 'red' : theme.gray}>
                    {item.status === 'completed' ? '✓ ' : item.status === 'failed' ? '✗ ' : '▶ '}
                    @{item.profile.username} ({item.profile.platform})
                  </Text>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}>
                    {item.statusText}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : null}

          <Gap />
          <Box justifyContent="space-between">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [c] Target: <Text color={theme.primary} bold>{mediaChoice.toUpperCase()}</Text>
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [m] Sidecars: <Text color={theme.primary} bold>{writeMetadata ? 'ON' : 'OFF'}</Text>
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [o] Open Folder
            </Text>
          </Box>

          <Box marginTop={1} justifyContent="center">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              Session Stats: {stats.detected} detected · {stats.downloaded} downloaded · {stats.skipped} skipped
            </Text>
          </Box>
        </Box>
      </Panel>
    </Box>
  )
}
