import React, {useState, useRef, useCallback} from 'react'
import {Box, Text, useInput} from 'ink'
import Spinner from 'ink-spinner'
import fs from 'node:fs'
import {Panel} from '../panel.js'
import {FramedInput} from '../framed-input.js'
import {TextInput} from '../text-input.js'
import {ProgressBar} from '../progress-bar.js'
import {runBatchQueue, type BatchItem, type BatchQueueResult} from '../../lib/batch.js'
import {resolveDefaultDownloadDir} from '../../lib/engines/dispatcher.js'
import {revealInFileManager} from '../../lib/reveal.js'
import type {MediaTarget} from '../../lib/engines/types.js'
import type {Theme} from '../../theme.js'

export interface BatchViewProps {
  onBack: () => void
  outputDir?: string
  boxWidth: number
  contentWidth: number
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
  defaultChoice?: MediaTarget
  defaultLimit?: number
  defaultWriteMetadata?: boolean
}

type BatchPhase = 'input' | 'running' | 'done'

export function BatchView({
  onBack,
  outputDir,
  boxWidth,
  theme,
  gapComponent: Gap,
  defaultChoice = 'all',
  defaultLimit,
  defaultWriteMetadata = false,
}: BatchViewProps) {
  const [phase, setPhase] = useState<BatchPhase>('input')
  const [inputField, setInputField] = useState<'text' | 'file'>('text')
  const [rawText, setRawText] = useState('')
  const [filePath, setFilePath] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Options
  const [choice, setChoice] = useState<MediaTarget>(defaultChoice)
  const [limit, setLimit] = useState<number | undefined>(defaultLimit)
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all')
  const [writeMetadata, setWriteMetadata] = useState(defaultWriteMetadata)
  const [resume, setResume] = useState(true)

  // Running state
  const [queueItems, setQueueItems] = useState<BatchItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentProgressText, setCurrentProgressText] = useState('')
  const [isCooldown, setIsCooldown] = useState(false)
  const [result, setResult] = useState<BatchQueueResult | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const cycleChoice = useCallback(() => {
    setChoice(prev => {
      if (prev === 'all') return 'photos'
      if (prev === 'photos') return 'videos'
      return 'all'
    })
  }, [])

  const cycleLimit = useCallback(() => {
    setLimit(prev => {
      if (!prev) return 10
      if (prev === 10) return 25
      if (prev === 25) return 50
      if (prev === 50) return 100
      return undefined
    })
  }, [])

  const cycleDate = useCallback(() => {
    setDateFilter(prev => {
      if (prev === 'all') return '24h'
      if (prev === '24h') return '7d'
      if (prev === '7d') return '30d'
      return 'all'
    })
  }, [])

  const toggleMetadata = useCallback(() => {
    setWriteMetadata(prev => !prev)
  }, [])

  const toggleResume = useCallback(() => {
    setResume(prev => !prev)
  }, [])

  const startQueue = useCallback(async () => {
    setErrorMessage(null)
    let lines: string[] = []

    if (inputField === 'file') {
      const trimmed = filePath.trim()
      if (!trimmed) {
        setErrorMessage('Please enter a valid batch file path')
        return
      }
      if (!fs.existsSync(trimmed)) {
        setErrorMessage(`File not found: ${trimmed}`)
        return
      }
    } else {
      lines = rawText
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(Boolean)
      if (lines.length === 0) {
        setErrorMessage('Please enter at least one profile URL or username')
        return
      }
    }

    const controller = new AbortController()
    abortControllerRef.current = controller
    setPhase('running')

    try {
      const queueRes = await runBatchQueue({
        filePath: inputField === 'file' ? filePath.trim() : undefined,
        lines: inputField === 'text' ? lines : undefined,
        choice,
        outputDir,
        since: dateFilter === 'all' ? undefined : dateFilter,
        limit,
        resume,
        writeMetadata,
        signal: controller.signal,
        onAccountStart: (item, idx) => {
          setIsCooldown(false)
          setCurrentIndex(idx)
          setCurrentProgressText(`Probing @${item.profile.username || item.raw}…`)
          setQueueItems(prev => {
            const next = [...prev]
            if (next[idx]) next[idx] = {...item}
            else next.push({...item})
            return next
          })
        },
        onAccountProgress: (item, progress) => {
          setCurrentProgressText(progress.statusText)
        },
        onAccountComplete: (item, idx) => {
          setIsCooldown(true)
          setQueueItems(prev => {
            const next = [...prev]
            next[idx] = {...item}
            return next
          })
        },
        onAccountError: (item) => {
          setQueueItems(prev => {
            const idx = prev.findIndex(i => i.raw === item.raw)
            if (idx !== -1) {
              const next = [...prev]
              next[idx] = {...item}
              return next
            }
            return prev
          })
        },
      })

      setResult(queueRes)
      setPhase('done')
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setPhase('input')
        return
      }
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
      setPhase('input')
    }
  }, [inputField, filePath, rawText, choice, outputDir, dateFilter, limit, resume, writeMetadata])

  useInput((input, key) => {
    if (key.escape) {
      if (phase === 'running') {
        abortControllerRef.current?.abort()
        setPhase('input')
        return
      }
      onBack()
      return
    }

    if (phase === 'done') {
      if (key.return) {
        setPhase('input')
        return
      }
      if (input === 'o' || input === 'O') {
        const target = outputDir || resolveDefaultDownloadDir('instagram', 'batch')
        revealInFileManager(target)
        return
      }
      return
    }

    if (phase === 'input') {
      if (input === 'c' || input === 'C') {
        cycleChoice()
        return
      }
      if (input === 'l' || input === 'L') {
        cycleLimit()
        return
      }
      if (input === 'd' || input === 'D') {
        cycleDate()
        return
      }
      if (input === 'm' || input === 'M') {
        toggleMetadata()
        return
      }
      if (input === 'r' || input === 'R') {
        toggleResume()
        return
      }
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  const currentItem = queueItems[currentIndex]
  const completedCount = queueItems.filter(i => i.status === 'success' || i.status === 'failed').length
  const totalCount = queueItems.length > 0 ? queueItems.length : 1
  const percent = Math.min(100, Math.floor((completedCount / totalCount) * 100))

  return (
    <Box flexDirection="column" alignItems="center">
      {phase === 'input' && (
        <Panel title="Batch Multi-Account Queue Manager" width={Math.max(64, boxWidth)}>
          <Box flexDirection="column" paddingY={1}>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              Queue multiple creator profiles with automatic anti-ban cooldown between downloads.
            </Text>
            <Gap />

            <Box marginBottom={1}>
              <Text bold color={inputField === 'text' ? theme.primary : theme.gray}>
                {inputField === 'text' ? '● Paste Links / Usernames' : '○ Paste Links / Usernames'}
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>{'   (Tab to switch)   '}</Text>
              <Text bold color={inputField === 'file' ? theme.primary : theme.gray}>
                {inputField === 'file' ? '● Load Batch File (.txt)' : '○ Load Batch File (.txt)'}
              </Text>
            </Box>

            {inputField === 'text' ? (
              <FramedInput title="Enter links or @handles separated by commas or spaces" width={Math.max(60, boxWidth - 4)}>
                <TextInput
                  value={rawText}
                  onChange={setRawText}
                  onSubmit={startQueue}
                  placeholder="e.g. instagram.com/user1, @user2, tiktok.com/@user3"
                  width={Math.max(54, boxWidth - 10)}
                  onTab={() => setInputField('file')}
                  onArrowDown={() => setInputField('file')}
                />
              </FramedInput>
            ) : (
              <FramedInput title="Enter path to .txt batch file" width={Math.max(60, boxWidth - 4)}>
                <TextInput
                  value={filePath}
                  onChange={setFilePath}
                  onSubmit={startQueue}
                  placeholder="e.g. targets.txt or C:\path\to\creators.txt"
                  width={Math.max(54, boxWidth - 10)}
                  onTab={() => setInputField('text')}
                  onArrowUp={() => setInputField('text')}
                />
              </FramedInput>
            )}

            {errorMessage ? (
              <Box marginTop={1}>
                <Text color="red">✗ {errorMessage}</Text>
              </Box>
            ) : null}

            <Gap />
            <Text bold color={theme.primary}>
              Batch Queue Options:
            </Text>
            <Box justifyContent="space-between" marginTop={1}>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                [c] Target: <Text color={theme.primary} bold>{choice.toUpperCase()}</Text>
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                [l] Limit: <Text color={theme.primary} bold>{limit ? `${limit} posts` : 'ALL'}</Text>
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                [d] Date: <Text color={theme.primary} bold>{dateFilter === 'all' ? 'ALL TIME' : dateFilter.toUpperCase()}</Text>
              </Text>
            </Box>
            <Box justifyContent="space-between" marginTop={1}>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                [m] Sidecars: <Text color={theme.primary} bold>{writeMetadata ? 'ON' : 'OFF'}</Text>
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                [r] Resume Checkpoint: <Text color={theme.primary} bold>{resume ? 'ON' : 'OFF'}</Text>
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                [↵] Start Queue
              </Text>
            </Box>
          </Box>
        </Panel>
      )}

      {phase === 'running' && (
        <Panel title="Batch Queue Running (Anti-Ban Hardened)" width={Math.max(64, boxWidth)}>
          <Box flexDirection="column" paddingY={1}>
            <Box justifyContent="space-between" marginBottom={1}>
              <Text color={theme.primary} bold>
                Account {currentIndex + 1} of {queueItems.length} ({percent}%)
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {isCooldown ? '⏳ Anti-ban cooldown active' : '▶ Downloading'}
              </Text>
            </Box>

            <ProgressBar percent={percent} width={58} />

            <Gap />
            {currentItem ? (
              <Box flexDirection="column" borderStyle="round" borderColor={theme.primary} paddingX={1} paddingY={1}>
                <Box>
                  <Text color={theme.primary}>
                    <Spinner type="dots" />
                  </Text>
                  <Text bold color={theme.primary}>
                    {` @${currentItem.profile.username || currentItem.raw} (${currentItem.profile.platform || 'resolving'})`}
                  </Text>
                </Box>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  {currentProgressText || 'processing media items…'}
                </Text>
              </Box>
            ) : null}

            <Gap />
            <Text bold color={theme.primary}>
              Queue Overview:
            </Text>
            {queueItems.slice(0, 5).map((item, idx) => (
              <Box key={`${item.raw}-${idx}`} justifyContent="space-between">
                <Text color={item.status === 'success' ? theme.primary : item.status === 'failed' ? 'red' : theme.gray}>
                  {item.status === 'success' ? '✓ ' : item.status === 'failed' ? '✗ ' : item.status === 'running' ? '▶ ' : '· '}
                  @{item.profile.username || item.raw}
                </Text>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  {item.status === 'success'
                    ? `${item.downloaded} downloaded, ${item.skipped} skipped`
                    : item.status === 'failed'
                      ? item.error || 'failed'
                      : item.status === 'running'
                        ? 'downloading…'
                        : 'queued'}
                </Text>
              </Box>
            ))}

            <Gap />
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              [esc] Stop queue and return
            </Text>
          </Box>
        </Panel>
      )}

      {phase === 'done' && result && (
        <Panel title="Batch Queue Completed" width={Math.max(64, boxWidth)}>
          <Box flexDirection="column" paddingY={1}>
            <Text bold color={theme.primary}>
              ✓ Successfully processed {result.total} profile(s)
            </Text>
            <Gap />
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              • Successful accounts: {result.succeeded}
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              • Failed accounts: {result.failed}
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              • Total media downloaded: {result.totalDownloaded}
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              • Total items skipped (already archived): {result.totalSkipped}
            </Text>

            <Gap />
            <Box justifyContent="space-between">
              <Text color={theme.primary} bold>
                [o] Open Downloads Folder
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                [↵] Return to Start
              </Text>
            </Box>
          </Box>
        </Panel>
      )}
    </Box>
  )
}
