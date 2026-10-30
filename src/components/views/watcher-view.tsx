import React, {useState, useEffect, useRef, useCallback} from 'react'
import {Box, Text, useInput} from 'ink'
import Spinner from 'ink-spinner'
import {Panel} from '../panel.js'
import {ProgressBar} from '../progress-bar.js'
import {startClipboardWatcher} from '../../lib/watcher.js'
import {resolveDefaultDownloadDir} from '../../lib/engines/dispatcher.js'
import {revealInFileManager} from '../../lib/reveal.js'
import type {ClickTarget} from '../../lib/click-map.js'
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
  onRegisterClickTargets?: (targets: ClickTarget[]) => void
}

const CHOICES: MediaTarget[] = ['all', 'photos', 'videos', 'stories', 'highlights']

export function WatcherView({
  onBack,
  outputDir,
  theme,
  gapComponent: Gap,
  defaultChoice = 'all',
  defaultWriteMetadata = false,
  onRegisterClickTargets,
}: WatcherViewProps) {
  const [mediaChoice, setMediaChoice] = useState<MediaTarget>(defaultChoice)
  const [writeMetadata, setWriteMetadata] = useState(defaultWriteMetadata)
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
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
      getChoice: () => mediaChoiceRef.current,
      outputDir,
      writeMetadata: writeMetadataRef.current,
      getWriteMetadata: () => writeMetadataRef.current,
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
      const idx = CHOICES.indexOf(prev)
      const nextChoice = CHOICES[(idx + 1) % CHOICES.length] || 'all'
      return nextChoice
    })
  }, [])

  const toggleMetadata = useCallback(() => {
    setWriteMetadata(prev => !prev)
  }, [])

  const openFolder = useCallback(() => {
    const target = outputDir || resolveDefaultDownloadDir('instagram', 'watcher')
    revealInFileManager(target)
  }, [outputDir])

  useEffect(() => {
    if (!onRegisterClickTargets) return

    const targets: ClickTarget[] = [
      {match: 'Target:', padX: 1, action: () => { setFocusedIndex(0); cycleChoice(); }},
      {match: 'Sidecars:', padX: 1, action: () => { setFocusedIndex(1); toggleMetadata(); }},
      {match: 'Open Folder', padX: 1, action: () => { setFocusedIndex(2); openFolder(); }},
      {match: 'c target', padX: 1, action: () => { setFocusedIndex(0); cycleChoice(); }},
      {match: 'm sidecar', padX: 1, action: () => { setFocusedIndex(1); toggleMetadata(); }},
      {match: 'o open dir', padX: 1, action: () => { setFocusedIndex(2); openFolder(); }},
      {match: 'esc back', padX: 1, action: onBack},
    ]

    onRegisterClickTargets(targets)
  }, [onRegisterClickTargets, cycleChoice, toggleMetadata, openFolder, onBack, mediaChoice, writeMetadata])

  useInput((input, key) => {
    if (key.escape) {
      onBack()
      return
    }

    if (key.leftArrow) {
      setFocusedIndex(prev => (prev === 0 ? 2 : prev - 1))
      return
    }
    if (key.rightArrow || key.tab) {
      setFocusedIndex(prev => (prev === 2 ? 0 : prev + 1))
      return
    }

    if (key.return || input === ' ') {
      if (focusedIndex === 0) cycleChoice()
      else if (focusedIndex === 1) toggleMetadata()
      else if (focusedIndex === 2) openFolder()
      return
    }

    if (input === 'c' || input === 'C') {
      setFocusedIndex(0)
      cycleChoice()
      return
    }
    if (input === 'm' || input === 'M') {
      setFocusedIndex(1)
      toggleMetadata()
      return
    }
    if (input === 'o' || input === 'O') {
      setFocusedIndex(2)
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
          <Box flexDirection="column">
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              Auto-monitoring clipboard for profile links (Instagram, TikTok, FB, X).
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              Copy any profile link in your browser: Open Nami downloads it in background.
            </Text>
          </Box>

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
            <Box
              borderStyle="round"
              borderColor={focusedIndex === 0 ? theme.primary : theme.gray}
              borderDimColor={focusedIndex !== 0}
              paddingX={1}
            >
              <Text color={focusedIndex === 0 ? theme.primary : theme.gray} bold={focusedIndex === 0}>
                [c] Target: <Text color={theme.primary} bold>{mediaChoice === 'all' ? 'EVERYTHING' : mediaChoice.toUpperCase()}</Text>
              </Text>
            </Box>
            <Box
              borderStyle="round"
              borderColor={focusedIndex === 1 ? theme.primary : theme.gray}
              borderDimColor={focusedIndex !== 1}
              paddingX={1}
            >
              <Text color={focusedIndex === 1 ? theme.primary : theme.gray} bold={focusedIndex === 1}>
                [m] Sidecars: <Text color={theme.primary} bold>{writeMetadata ? 'ON' : 'OFF'}</Text>
              </Text>
            </Box>
            <Box
              borderStyle="round"
              borderColor={focusedIndex === 2 ? theme.primary : theme.gray}
              borderDimColor={focusedIndex !== 2}
              paddingX={1}
            >
              <Text color={focusedIndex === 2 ? theme.primary : theme.gray} bold={focusedIndex === 2}>
                [o] Open Folder
              </Text>
            </Box>
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
