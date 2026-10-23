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
import {resolveDateFilter, parseLimit} from '../../lib/engines/filters.js'
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

const DATE_PRESETS = ['all', '24h', '7d', '30d', '2024', '2023', '2022', '2021', 'custom']
const LIMIT_PRESETS: Array<number | 'custom' | undefined> = [undefined, 10, 24, 50, 100, 'custom']

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

  // Focus section: 'input' (main text field), 'options' (hotkey bar), or custom mini inputs
  const [focusSection, setFocusSection] = useState<'input' | 'options' | 'custom-limit' | 'custom-date'>('input')
  const [customLimitText, setCustomLimitText] = useState('')
  const [customDateText, setCustomDateText] = useState('')

  // Options
  const [choice, setChoice] = useState<MediaTarget>(defaultChoice)
  const [limit, setLimit] = useState<number | undefined>(defaultLimit)
  const [dateFilter, setDateFilter] = useState<string>('all')
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
    const curIdx = LIMIT_PRESETS.findIndex(p => p === limit)
    const nextIdx = (curIdx + 1) % LIMIT_PRESETS.length
    const nextVal = LIMIT_PRESETS[nextIdx]
    if (nextVal === 'custom') {
      setCustomLimitText(limit ? String(limit) : '24')
      setFocusSection('custom-limit')
    } else {
      setLimit(nextVal)
    }
  }, [limit])

  const cycleDate = useCallback(() => {
    const curIdx = DATE_PRESETS.indexOf(dateFilter)
    const nextIdx = (curIdx + 1) % DATE_PRESETS.length
    const nextVal = DATE_PRESETS[nextIdx]
    if (nextVal === 'custom') {
      setCustomDateText(dateFilter !== 'all' ? dateFilter : '2021')
      setFocusSection('custom-date')
    } else {
      setDateFilter(nextVal)
    }
  }, [dateFilter])

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
      const dateRange = resolveDateFilter(dateFilter)
      const queueRes = await runBatchQueue({
        filePath: inputField === 'file' ? filePath.trim() : undefined,
        lines: inputField === 'text' ? lines : undefined,
        choice,
        outputDir,
        since: dateRange.since,
        until: dateRange.until,
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
        onAccountProgress: (_item, progress) => {
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
      if (focusSection === 'custom-limit' || focusSection === 'custom-date') {
        setFocusSection('options')
        return
      }
      if (focusSection === 'options') {
        setFocusSection('input')
        return
      }
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
      if (focusSection === 'custom-limit' || focusSection === 'custom-date') {
        // Let TextInput handle editing inside mini modal
        return
      }

      // Allow Ctrl shortcuts from anywhere
      if (key.ctrl) {
        if (input === 'l' || input === 'L') {
          setCustomLimitText(limit ? String(limit) : '24')
          setFocusSection('custom-limit')
          return
        }
        if (input === 'd' || input === 'D') {
          setCustomDateText(dateFilter !== 'all' ? dateFilter : '2021')
          setFocusSection('custom-date')
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
        if (input === 'r' || input === 'R') {
          toggleResume()
          return
        }
      }

      if (focusSection === 'input') {
        if (key.downArrow) {
          setFocusSection('options')
          return
        }
      } else if (focusSection === 'options') {
        if (key.upArrow) {
          setFocusSection('input')
          return
        }
        if (key.return) {
          startQueue()
          return
        }
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
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  const currentItem = queueItems[currentIndex]
  const completedCount = queueItems.filter(i => i.status === 'success' || i.status === 'failed').length
  const totalCount = queueItems.length > 0 ? queueItems.length : 1
  const percent = Math.min(100, Math.floor((completedCount / totalCount) * 100))

  return (
    <Box flexDirection="column" alignItems="center">
      {phase === 'input' && (
        <Panel title="Batch Queue" width={Math.max(60, boxWidth)}>
          <Box flexDirection="column" paddingY={1}>
            <Box marginBottom={1} justifyContent="center">
              <Text bold color={inputField === 'text' ? theme.primary : theme.gray}>
                {inputField === 'text' ? '● Links / Handles' : '○ Links / Handles'}
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>{'   ·   '}</Text>
              <Text bold color={inputField === 'file' ? theme.primary : theme.gray}>
                {inputField === 'file' ? '● File (.txt)' : '○ File (.txt)'}
              </Text>
            </Box>

            {inputField === 'text' ? (
              <FramedInput title="Links or @handles" width={Math.max(56, boxWidth - 4)}>
                <TextInput
                  value={rawText}
                  onChange={setRawText}
                  onSubmit={startQueue}
                  placeholder="@user1, @user2, tiktok.com/@user3…"
                  width={Math.max(50, boxWidth - 10)}
                  focus={focusSection === 'input'}
                  onTab={() => setInputField('file')}
                  onArrowDown={() => setFocusSection('options')}
                />
              </FramedInput>
            ) : (
              <FramedInput title="Batch file (.txt)" width={Math.max(56, boxWidth - 4)}>
                <TextInput
                  value={filePath}
                  onChange={setFilePath}
                  onSubmit={startQueue}
                  placeholder="e.g. creators.txt or C:\path\creators.txt"
                  width={Math.max(50, boxWidth - 10)}
                  focus={focusSection === 'input'}
                  onTab={() => setInputField('text')}
                  onArrowDown={() => setFocusSection('options')}
                />
              </FramedInput>
            )}

            {errorMessage ? (
              <Box marginTop={1}>
                <Text color="red">✗ {errorMessage}</Text>
              </Box>
            ) : null}

            <Box
              flexDirection="column"
              marginTop={1}
              borderStyle="round"
              borderColor={focusSection === 'options' || focusSection === 'custom-limit' || focusSection === 'custom-date' ? theme.primary : theme.gray}
              borderDimColor={focusSection === 'input'}
              paddingX={1}
            >
              {focusSection === 'custom-limit' ? (
                <Box flexDirection="column">
                  <Text bold color={theme.primary}>Set post limit (e.g. 24, all):</Text>
                  <Box marginTop={1}>
                    <TextInput
                      value={customLimitText}
                      onChange={setCustomLimitText}
                      onSubmit={(val) => {
                        const parsed = parseLimit(val)
                        setLimit(parsed)
                        setFocusSection('options')
                      }}
                      width={24}
                    />
                  </Box>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}>↵ confirm · esc cancel</Text>
                </Box>
              ) : focusSection === 'custom-date' ? (
                <Box flexDirection="column">
                  <Text bold color={theme.primary}>Set date or year (e.g. 2021, 2022, 7d):</Text>
                  <Box marginTop={1}>
                    <TextInput
                      value={customDateText}
                      onChange={setCustomDateText}
                      onSubmit={(val) => {
                        const trimmed = val.trim()
                        setDateFilter(trimmed ? trimmed : 'all')
                        setFocusSection('options')
                      }}
                      width={24}
                    />
                  </Box>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}>↵ confirm · esc cancel</Text>
                </Box>
              ) : (
                <>
                  <Box justifyContent="space-between">
                    <Text color={theme.gray} dimColor={theme.dimSecondary}>
                      [c] Media: <Text color={theme.primary} bold>{choice.toUpperCase()}</Text>
                    </Text>
                    <Text color={theme.gray} dimColor={theme.dimSecondary}>
                      [l] Posts: <Text color={theme.primary} bold>{limit ? `${limit}` : 'ALL'}</Text>
                    </Text>
                    <Text color={theme.gray} dimColor={theme.dimSecondary}>
                      [d] Date: <Text color={theme.primary} bold>{dateFilter.toUpperCase()}</Text>
                    </Text>
                  </Box>
                  <Box justifyContent="space-between" marginTop={1}>
                    <Text color={theme.gray} dimColor={theme.dimSecondary}>
                      [m] Meta: <Text color={theme.primary} bold>{writeMetadata ? 'ON' : 'OFF'}</Text>
                    </Text>
                    <Text color={theme.gray} dimColor={theme.dimSecondary}>
                      [r] Resume: <Text color={theme.primary} bold>{resume ? 'ON' : 'OFF'}</Text>
                    </Text>
                    <Text color={theme.primary} bold>
                      [↵] Start Queue
                    </Text>
                  </Box>
                </>
              )}
            </Box>

            <Box marginTop={1} justifyContent="center">
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {focusSection === 'input' ? 'Press ↓ to adjust options · ↵ to start queue' : 'Hotkeys [c] [l] [d] [m] [r] · ↑ to edit text · ↵ to start'}
              </Text>
            </Box>
          </Box>
        </Panel>
      )}

      {phase === 'running' && (
        <Panel title="Batch Queue Running" width={Math.max(60, boxWidth)}>
          <Box flexDirection="column" paddingY={1}>
            <Box justifyContent="space-between" marginBottom={1}>
              <Text color={theme.primary} bold>
                Account {currentIndex + 1} of {queueItems.length} ({percent}%)
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {isCooldown ? '⏳ Cooldown active' : '▶ Downloading'}
              </Text>
            </Box>

            <ProgressBar percent={percent} width={54} />

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
        <Panel title="Batch Queue Completed" width={Math.max(60, boxWidth)}>
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
              • Total items skipped: {result.totalSkipped}
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
