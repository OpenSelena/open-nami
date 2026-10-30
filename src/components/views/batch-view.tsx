import React, {useState, useRef, useCallback, useEffect} from 'react'
import {Box, Text, useInput} from 'ink'
import Spinner from 'ink-spinner'
import fs from 'node:fs'
import {Panel} from '../panel.js'
import {FramedInput} from '../framed-input.js'
import {TextInput} from '../text-input.js'
import {ProgressBar} from '../progress-bar.js'
import {runBatchQueue, parseBatchContent, type BatchItem, type BatchQueueResult} from '../../lib/batch.js'
import {resolveDefaultDownloadDir} from '../../lib/engines/dispatcher.js'
import {resolveDateFilter, parseLimit} from '../../lib/engines/filters.js'
import {revealInFileManager} from '../../lib/reveal.js'
import type {ClickTarget} from '../../lib/click-map.js'
import type {SupportedPlatform} from '../../lib/parser.js'
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
  onRegisterClickTargets?: (targets: ClickTarget[]) => void
}

type BatchPhase = 'input' | 'running' | 'done'
type OptionControl = 'platform' | 'choice' | 'limit' | 'date' | 'meta' | 'resume' | 'start'
type FocusControl = 'tabs' | 'input' | OptionControl | 'custom-limit' | 'custom-date'

const PLATFORMS: SupportedPlatform[] = ['instagram', 'tiktok', 'facebook', 'x']
const CHOICES: MediaTarget[] = ['all', 'photos', 'videos', 'stories', 'highlights']
const DATE_PRESETS = ['all', '24h', '7d', '30d', '2024', '2023', '2022', '2021', 'custom']
const LIMIT_PRESETS: Array<number | 'custom' | undefined> = [undefined, 10, 24, 50, 100, 'custom']

export function extractBatchLinesFromInput(rawText: string): string[] {
  return Array.from(new Set(parseBatchContent(rawText)))
}

export function BatchView({
  onBack,
  outputDir,
  boxWidth,
  theme,
  gapComponent: Gap,
  defaultChoice = 'all',
  defaultLimit,
  defaultWriteMetadata = false,
  onRegisterClickTargets,
}: BatchViewProps) {
  const [phase, setPhase] = useState<BatchPhase>('input')
  const [inputField, setInputField] = useState<'text' | 'file'>('text')
  const [rawText, setRawText] = useState('')
  const [filePath, setFilePath] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [focusedControl, setFocusedControl] = useState<FocusControl>('input')
  const [customLimitText, setCustomLimitText] = useState('')
  const [customDateText, setCustomDateText] = useState('')

  const [defaultPlatform, setDefaultPlatform] = useState<SupportedPlatform>('instagram')
  const [choice, setChoice] = useState<MediaTarget>(defaultChoice)
  const [limit, setLimit] = useState<number | undefined>(defaultLimit)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [writeMetadata, setWriteMetadata] = useState(defaultWriteMetadata)
  const [resume, setResume] = useState(true)

  const [queueItems, setQueueItems] = useState<BatchItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentProgressText, setCurrentProgressText] = useState('')
  const [isCooldown, setIsCooldown] = useState(false)
  const [result, setResult] = useState<BatchQueueResult | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const cyclePlatform = useCallback(() => {
    setDefaultPlatform(prev => {
      const idx = PLATFORMS.indexOf(prev)
      return PLATFORMS[(idx + 1) % PLATFORMS.length]!
    })
  }, [])

  const cycleChoice = useCallback(() => {
    setChoice(prev => {
      const idx = CHOICES.indexOf(prev)
      return CHOICES[(idx + 1) % CHOICES.length]!
    })
  }, [])

  const cycleLimit = useCallback(() => {
    const curIdx = LIMIT_PRESETS.findIndex(p => p === limit)
    const nextIdx = (curIdx + 1) % LIMIT_PRESETS.length
    const nextVal = LIMIT_PRESETS[nextIdx]
    if (nextVal === 'custom') {
      setCustomLimitText(limit ? String(limit) : '24')
      setFocusedControl('custom-limit')
    } else {
      setLimit(nextVal)
    }
  }, [limit])

  const cycleDate = useCallback(() => {
    const curIdx = DATE_PRESETS.indexOf(dateFilter)
    const nextIdx = (curIdx + 1) % DATE_PRESETS.length
    const nextVal = DATE_PRESETS[nextIdx]
    if (nextVal === 'custom') {
      setCustomDateText(dateFilter !== 'all' ? dateFilter : '2024')
      setFocusedControl('custom-date')
    } else {
      setDateFilter(nextVal!)
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
      lines = extractBatchLinesFromInput(rawText)
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
        defaultPlatform,
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
          setCurrentProgressText(`Probing @${item.profile.username || item.raw} on ${item.profile.platform}…`)
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
  }, [inputField, filePath, rawText, choice, defaultPlatform, outputDir, dateFilter, limit, resume, writeMetadata])

  useInput((input, key) => {
    if (key.ctrl && (input === 'c' || input === 'C')) {
      return
    }

    if (key.escape) {
      if (focusedControl === 'custom-limit' || focusedControl === 'custom-date') {
        setFocusedControl('start')
        return
      }
      if (focusedControl !== 'input' && phase === 'input') {
        setFocusedControl('input')
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

    if (phase === 'running') {
      return
    }

    if (phase === 'input') {
      if (focusedControl === 'custom-limit' || focusedControl === 'custom-date') {
        return
      }

      if (focusedControl === 'input') {
        if (key.downArrow) {
          setFocusedControl('platform')
          return
        }
        if (key.upArrow) {
          setFocusedControl('tabs')
          return
        }
        return
      }

      if (focusedControl === 'tabs') {
        if (key.leftArrow || key.rightArrow || input === ' ' || key.return) {
          setInputField(prev => (prev === 'text' ? 'file' : 'text'))
          return
        }
        if (key.downArrow || key.tab) {
          setFocusedControl('input')
          return
        }
        return
      }

      if (focusedControl === 'platform') {
        if (key.rightArrow) { setFocusedControl('choice'); return }
        if (key.downArrow) { setFocusedControl('limit'); return }
        if (key.upArrow) { setFocusedControl('input'); return }
        if (key.tab && !key.shift) { setFocusedControl('choice'); return }
        if (key.tab && key.shift) { setFocusedControl('input'); return }
      } else if (focusedControl === 'choice') {
        if (key.leftArrow) { setFocusedControl('platform'); return }
        if (key.downArrow) { setFocusedControl('date'); return }
        if (key.upArrow) { setFocusedControl('input'); return }
        if (key.tab && !key.shift) { setFocusedControl('limit'); return }
        if (key.tab && key.shift) { setFocusedControl('platform'); return }
      } else if (focusedControl === 'limit') {
        if (key.upArrow) { setFocusedControl('platform'); return }
        if (key.rightArrow) { setFocusedControl('date'); return }
        if (key.downArrow) { setFocusedControl('meta'); return }
        if (key.tab && !key.shift) { setFocusedControl('date'); return }
        if (key.tab && key.shift) { setFocusedControl('choice'); return }
      } else if (focusedControl === 'date') {
        if (key.upArrow) { setFocusedControl('choice'); return }
        if (key.leftArrow) { setFocusedControl('limit'); return }
        if (key.downArrow) { setFocusedControl('resume'); return }
        if (key.tab && !key.shift) { setFocusedControl('meta'); return }
        if (key.tab && key.shift) { setFocusedControl('limit'); return }
      } else if (focusedControl === 'meta') {
        if (key.upArrow) { setFocusedControl('limit'); return }
        if (key.rightArrow) { setFocusedControl('resume'); return }
        if (key.downArrow) { setFocusedControl('start'); return }
        if (key.tab && !key.shift) { setFocusedControl('resume'); return }
        if (key.tab && key.shift) { setFocusedControl('date'); return }
      } else if (focusedControl === 'resume') {
        if (key.upArrow) { setFocusedControl('date'); return }
        if (key.leftArrow) { setFocusedControl('meta'); return }
        if (key.downArrow) { setFocusedControl('start'); return }
        if (key.tab && !key.shift) { setFocusedControl('start'); return }
        if (key.tab && key.shift) { setFocusedControl('meta'); return }
      } else if (focusedControl === 'start') {
        if (key.upArrow) { setFocusedControl('meta'); return }
        if (key.downArrow || (key.tab && !key.shift)) { setFocusedControl('tabs'); return }
        if (key.tab && key.shift) { setFocusedControl('resume'); return }
      }

      if (input === ' ' || key.return) {
        switch (focusedControl) {
          case 'platform': cyclePlatform(); break
          case 'choice': cycleChoice(); break
          case 'limit': cycleLimit(); break
          case 'date': cycleDate(); break
          case 'meta': toggleMetadata(); break
          case 'resume': toggleResume(); break
          case 'start': startQueue(); break
        }
        return
      }

      if (input === 'p' || input === 'P') { cyclePlatform(); return }
      if (input === 'c' || input === 'C') { cycleChoice(); return }
      if (input === 'l' || input === 'L') { cycleLimit(); return }
      if (input === 'd' || input === 'D') { cycleDate(); return }
      if (input === 'm' || input === 'M') { toggleMetadata(); return }
      if (input === 'r' || input === 'R') { toggleResume(); return }
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  useEffect(() => {
    if (!onRegisterClickTargets) return

    const targets: ClickTarget[] = []

    if (phase === 'input') {
      targets.push({
        match: 'Links / Handles',
        padX: 2,
        padY: 0,
        action: () => {
          setInputField('text')
          setFocusedControl('input')
        },
      })
      targets.push({
        match: 'File (.txt)',
        padX: 2,
        padY: 0,
        action: () => {
          setInputField('file')
          setFocusedControl('input')
        },
      })

      targets.push({
        match: 'download',
        padX: 2,
        padY: 1,
        action: startQueue,
      })

      targets.push({
        match: 'Platform:',
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl('platform')
          cyclePlatform()
        },
      })
      targets.push({
        match: 'Media:',
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl('choice')
          cycleChoice()
        },
      })
      targets.push({
        match: 'Posts:',
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl('limit')
          cycleLimit()
        },
      })
      targets.push({
        match: 'Date:',
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl('date')
          cycleDate()
        },
      })
      targets.push({
        match: 'Meta:',
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl('meta')
          toggleMetadata()
        },
      })
      targets.push({
        match: 'Resume:',
        padX: 2,
        padY: 0,
        action: () => {
          setFocusedControl('resume')
          toggleResume()
        },
      })
      targets.push({
        match: 'Start Batch Queue',
        padX: 3,
        padY: 0,
        action: () => {
          setFocusedControl('start')
          startQueue()
        },
      })

      targets.push({
        match: 'tab switch field',
        action: () => setInputField(prev => (prev === 'text' ? 'file' : 'text')),
      })
      targets.push({
        match: 'c target',
        action: cycleChoice,
      })
      targets.push({
        match: 'm sidecar',
        action: toggleMetadata,
      })
      targets.push({
        match: 'l limit',
        action: cycleLimit,
      })
      targets.push({
        match: 'd date',
        action: cycleDate,
      })
      targets.push({
        match: 'r resume',
        action: toggleResume,
      })
      targets.push({
        match: '↵ start',
        action: startQueue,
      })
    }

    if (phase === 'running') {
      targets.push({
        match: 'Stop queue and return',
        padX: 2,
        action: () => {
          abortControllerRef.current?.abort()
          setPhase('input')
        },
      })
      targets.push({
        match: 'Stop queue',
        padX: 2,
        action: () => {
          abortControllerRef.current?.abort()
          setPhase('input')
        },
      })
    }

    if (phase === 'done') {
      targets.push({
        match: 'Open Downloads Folder',
        padX: 2,
        action: () => {
          const target = outputDir || resolveDefaultDownloadDir('instagram', 'batch')
          revealInFileManager(target)
        },
      })
      targets.push({
        match: 'Return to Start',
        padX: 2,
        action: () => setPhase('input'),
      })
    }

    onRegisterClickTargets(targets)

    return () => {
      onRegisterClickTargets([])
    }
  }, [
    phase,
    inputField,
    focusedControl,
    onRegisterClickTargets,
    cyclePlatform,
    cycleChoice,
    cycleLimit,
    cycleDate,
    toggleMetadata,
    toggleResume,
    startQueue,
    outputDir,
  ])

  const panelWidth = Math.max(64, boxWidth)
  const inputFrameWidth = panelWidth - 18
  const innerContentWidth = panelWidth - 6
  const colWidth = Math.floor((innerContentWidth - 4) / 2)

  const currentItem = queueItems[currentIndex]
  const completedCount = queueItems.filter(i => i.status === 'success' || i.status === 'failed').length
  const totalCount = queueItems.length > 0 ? queueItems.length : 1
  const percent = Math.min(100, Math.floor((completedCount / totalCount) * 100))

  return (
    <Box flexDirection="column" alignItems="center">
      {phase === 'input' && (
        <Panel title="Batch Queue" width={panelWidth}>
          <Box flexDirection="column" alignItems="center" paddingY={1}>
            {/* Mode selection buttons */}
            <Box marginBottom={1} justifyContent="center">
              <Box marginRight={2}>
                <Text
                  bold
                  color={inputField === 'text' ? theme.primary : theme.gray}
                  inverse={inputField === 'text'}
                >
                  {'  Links / Handles  '}
                </Text>
              </Box>
              <Box>
                <Text
                  bold
                  color={inputField === 'file' ? theme.primary : theme.gray}
                  inverse={inputField === 'file'}
                >
                  {'  File (.txt)  '}
                </Text>
              </Box>
            </Box>

            {/* Input field with right-side download button */}
            {inputField === 'text' ? (
              <FramedInput
                title="Links or @handles"
                width={inputFrameWidth}
                button="download"
              >
                <TextInput
                  value={rawText}
                  onChange={setRawText}
                  onSubmit={startQueue}
                  placeholder="@user1, @user2, tiktok.com/@user3…"
                  width={inputFrameWidth - 4}
                  focus={focusedControl === 'input'}
                  onArrowDown={() => setFocusedControl('platform')}
                  onArrowUp={() => setFocusedControl('tabs')}
                  onTab={() => setFocusedControl('platform')}
                />
              </FramedInput>
            ) : (
              <FramedInput
                title="Batch file (.txt)"
                width={inputFrameWidth}
                button="download"
              >
                <TextInput
                  value={filePath}
                  onChange={setFilePath}
                  onSubmit={startQueue}
                  placeholder="e.g. creators.txt or C:\path\creators.txt"
                  width={inputFrameWidth - 4}
                  focus={focusedControl === 'input'}
                  onArrowDown={() => setFocusedControl('platform')}
                  onArrowUp={() => setFocusedControl('tabs')}
                  onTab={() => setFocusedControl('platform')}
                />
              </FramedInput>
            )}

            {errorMessage ? (
              <Box marginTop={1}>
                <Text color="red">✗ {errorMessage}</Text>
              </Box>
            ) : null}

            {/* 6 Options in clean 2-column grid */}
            <Box
              flexDirection="column"
              width={innerContentWidth}
              marginTop={1}
              borderStyle="round"
              borderColor={focusedControl !== 'input' && focusedControl !== 'tabs' && focusedControl !== 'start' ? theme.primary : theme.gray}
              borderDimColor={focusedControl === 'input' || focusedControl === 'tabs' || focusedControl === 'start'}
              paddingX={1}
            >
              {focusedControl === 'custom-limit' ? (
                <Box flexDirection="column">
                  <Text bold color={theme.primary}>Set post limit (e.g. 24, all):</Text>
                  <Box marginTop={1}>
                    <TextInput
                      value={customLimitText}
                      onChange={setCustomLimitText}
                      onSubmit={(val) => {
                        const parsed = parseLimit(val)
                        setLimit(parsed)
                        setFocusedControl('limit')
                      }}
                      width={24}
                    />
                  </Box>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}>↵ confirm · esc cancel</Text>
                </Box>
              ) : focusedControl === 'custom-date' ? (
                <Box flexDirection="column">
                  <Text bold color={theme.primary}>Set date or year (e.g. 2024, 7d):</Text>
                  <Box marginTop={1}>
                    <TextInput
                      value={customDateText}
                      onChange={setCustomDateText}
                      onSubmit={(val) => {
                        const trimmed = val.trim()
                        setDateFilter(trimmed ? trimmed : 'all')
                        setFocusedControl('date')
                      }}
                      width={24}
                    />
                  </Box>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}>↵ confirm · esc cancel</Text>
                </Box>
              ) : (
                <>
                  {/* Row 1: Platform & Media */}
                  <Box justifyContent="space-between" width="100%">
                    <Box width={colWidth}>
                      <Text color={theme.gray} dimColor={theme.dimSecondary}>[p] Platform: </Text>
                      <Text
                        bold
                        color={theme.primary}
                        inverse={focusedControl === 'platform'}
                      >
                        {` ${defaultPlatform.toUpperCase()} `}
                      </Text>
                    </Box>
                    <Box width={colWidth}>
                      <Text color={theme.gray} dimColor={theme.dimSecondary}>[c] Media: </Text>
                      <Text
                        bold
                        color={theme.primary}
                        inverse={focusedControl === 'choice'}
                      >
                        {` ${choice === 'all' ? 'EVERYTHING' : choice.toUpperCase()} `}
                      </Text>
                    </Box>
                  </Box>

                  {/* Row 2: Posts limit & Date filter */}
                  <Box justifyContent="space-between" width="100%" marginTop={1}>
                    <Box width={colWidth}>
                      <Text color={theme.gray} dimColor={theme.dimSecondary}>[l] Posts: </Text>
                      <Text
                        bold
                        color={theme.primary}
                        inverse={focusedControl === 'limit'}
                      >
                        {` ${limit ? String(limit) : 'ALL'} `}
                      </Text>
                    </Box>
                    <Box width={colWidth}>
                      <Text color={theme.gray} dimColor={theme.dimSecondary}>[d] Date: </Text>
                      <Text
                        bold
                        color={theme.primary}
                        inverse={focusedControl === 'date'}
                      >
                        {` ${dateFilter.toUpperCase()} `}
                      </Text>
                    </Box>
                  </Box>

                  {/* Row 3: Metadata & Resume */}
                  <Box justifyContent="space-between" width="100%" marginTop={1}>
                    <Box width={colWidth}>
                      <Text color={theme.gray} dimColor={theme.dimSecondary}>[m] Meta: </Text>
                      <Text
                        bold
                        color={theme.primary}
                        inverse={focusedControl === 'meta'}
                      >
                        {` ${writeMetadata ? 'ON' : 'OFF'} `}
                      </Text>
                    </Box>
                    <Box width={colWidth}>
                      <Text color={theme.gray} dimColor={theme.dimSecondary}>[r] Resume: </Text>
                      <Text
                        bold
                        color={theme.primary}
                        inverse={focusedControl === 'resume'}
                      >
                        {` ${resume ? 'ON' : 'OFF'} `}
                      </Text>
                    </Box>
                  </Box>
                </>
              )}
            </Box>

            {/* Bottom action button */}
            <Box justifyContent="center" marginTop={1}>
              <Text
                bold
                color={theme.primary}
                inverse={focusedControl === 'start'}
              >
                {'  ↵ Start Batch Queue  '}
              </Text>
            </Box>

            <Box marginTop={1} justifyContent="center">
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {focusedControl === 'input'
                  ? 'Type handles or URLs · ↵ or click download to start'
                  : focusedControl === 'tabs'
                    ? 'Space to switch mode · ↓ to edit input'
                    : '←/→/Tab select · Space/Enter toggle · ↵ start queue · ↑ edit input'}
              </Text>
            </Box>
          </Box>
        </Panel>
      )}

      {phase === 'running' && (
        <Panel title="Batch Queue Running" width={panelWidth}>
          <Box flexDirection="column" paddingY={1}>
            <Box justifyContent="space-between" marginBottom={1}>
              <Text color={theme.primary} bold>
                Account {currentIndex + 1} of {queueItems.length} ({percent}%)
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {isCooldown ? '⏳ Cooldown active' : '▶ Downloading'}
              </Text>
            </Box>

            <ProgressBar percent={percent} width={panelWidth - 10} />

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
        <Panel title="Batch Queue Completed" width={panelWidth}>
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
