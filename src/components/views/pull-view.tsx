import React, {useState, useEffect, useRef, useCallback} from 'react'
import {Box, Text, useInput} from 'ink'
import Spinner from 'ink-spinner'
import {Panel} from '../panel.js'
import {
  dispatchPull,
  type PullSummaryResult,
  type PullProgress,
} from '../../lib/pull.js'
import {
  defaultTaskManager,
  resolveDefaultDownloadDir,
} from '../../lib/engines/dispatcher.js'
import {revealInFileManager} from '../../lib/reveal.js'
import type {
  MediaLedger,
  TrackedProfileRecord,
} from '../../lib/engines/storage/ledger.js'
import type {Theme} from '../../theme.js'
import type {ClickTarget} from '../../lib/click-map.js'

export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'never'
  const time = new Date(isoString).getTime()
  if (isNaN(time)) return 'never'
  const diffSec = Math.floor((Date.now() - time) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return isoString.slice(0, 10)
}

export interface ProfileItemState {
  profile: TrackedProfileRecord
  selected: boolean
}

export interface PullViewProps {
  onBack: () => void
  outputDir?: string
  boxWidth?: number
  contentWidth: number
  theme: Theme
  gapComponent: React.ComponentType<{lines?: number}>
  ledger?: MediaLedger
  initialProfiles?: TrackedProfileRecord[]
  onRegisterClickTargets?: (targets: ClickTarget[]) => void
}

export type PullViewPhase = 'list' | 'syncing' | 'done'

export function PullView({
  onBack,
  outputDir,
  contentWidth,
  theme,
  gapComponent: Gap,
  ledger,
  initialProfiles,
  onRegisterClickTargets,
}: PullViewProps) {
  const [phase, setPhase] = useState<PullViewPhase>('list')
  const [items, setItems] = useState<ProfileItemState[]>(() => {
    const list =
      initialProfiles ??
      (ledger || defaultTaskManager.ledger).getTrackedProfiles()
    return list.map((p) => ({profile: p, selected: true}))
  })
  const [cursor, setCursor] = useState(0)
  const [untrackConfirm, setUntrackConfirm] =
    useState<TrackedProfileRecord | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [activeProfile, setActiveProfile] =
    useState<TrackedProfileRecord | null>(null)
  const [syncIndex, setSyncIndex] = useState(0)
  const [syncTotal, setSyncTotal] = useState(0)
  const [downloadedCount, setDownloadedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [summary, setSummary] = useState<PullSummaryResult | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const startPull = useCallback(
    async (targetsToPull: TrackedProfileRecord[]) => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      setPhase('syncing')
      setSyncTotal(targetsToPull.length)
      setSyncIndex(0)
      setDownloadedCount(0)
      setSkippedCount(0)
      setCurrentFile('')

      const activeLedger = ledger || defaultTaskManager.ledger

      try {
        const res = await dispatchPull({
          profiles: targetsToPull,
          outputDir,
          ledger: activeLedger,
          signal: controller.signal,
          onProfileStart: (profile, idx, total) => {
            setActiveProfile(profile)
            setSyncIndex(idx)
            setSyncTotal(total)
            setCurrentFile('')
          },
          onProfileProgress: (prog: PullProgress) => {
            if (prog.engineProgress?.currentFile) {
              setCurrentFile(prog.engineProgress.currentFile)
            }
          },
          onProfileComplete: (res) => {
            setDownloadedCount((prev) => prev + res.downloaded)
            setSkippedCount((prev) => prev + res.skipped)
            setCurrentFile('')
          },
        })

        setSummary(res)
        setPhase('done')
      } catch (err: any) {
        if (controller.signal.aborted) {
          setPhase('list')
          return
        }
        setStatusMessage(`Pull error: ${err.message || String(err)}`)
        setPhase('list')
      }
    },
    [outputDir, ledger],
  )

  useInput((input, key) => {
    if (phase === 'syncing') {
      if (key.escape) {
        abortControllerRef.current?.abort()
      }
      return
    }

    if (phase === 'done') {
      if ((input === 'o' || input === 'O') && !key.ctrl) {
        if (outputDir) {
          revealInFileManager(outputDir)
        } else if (summary?.items?.[0]?.targetDir) {
          revealInFileManager(summary.items[0].targetDir)
        }
        return
      }
      if (key.return || key.escape) {
        onBack()
        return
      }
      return
    }

    if (untrackConfirm) {
      if (input === 'y' || input === 'Y') {
        const target = untrackConfirm
        const activeLedger = ledger || defaultTaskManager.ledger
        activeLedger.untrackProfile(target.platform, target.username)
        setUntrackConfirm(null)
        setStatusMessage(`Untracked @${target.username} (files preserved on disk)`)
        setItems((prev) => {
          const next = prev.filter(
            (p) =>
              !(
                p.profile.platform === target.platform &&
                p.profile.username === target.username
              ),
          )
          setCursor((c) => Math.max(0, Math.min(c, next.length - 1)))
          return next
        })
        return
      }
      if (input === 'n' || input === 'N' || key.escape) {
        setUntrackConfirm(null)
        return
      }
      return
    }

    if (items.length === 0) {
      if (key.escape || key.return) {
        onBack()
      }
      return
    }

    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : items.length - 1))
      return
    }

    if (key.downArrow) {
      setCursor((c) => (c < items.length - 1 ? c + 1 : 0))
      return
    }

    if (input === ' ') {
      setItems((prev) => {
        const next = [...prev]
        if (next[cursor]) {
          next[cursor] = {...next[cursor]!, selected: !next[cursor]!.selected}
        }
        return next
      })
      return
    }

    if (input === 'a' || input === 'A') {
      setItems((prev) => {
        const allSelected = prev.every((p) => p.selected)
        return prev.map((p) => ({...p, selected: !allSelected}))
      })
      return
    }

    if (input === 'd' || input === 'D') {
      if (items[cursor]) {
        setUntrackConfirm(items[cursor]!.profile)
      }
      return
    }

    if (key.return) {
      const selected = items.filter((p) => p.selected)
      const targetsToPull = selected.length > 0 ? selected : [items[cursor]!]
      startPull(targetsToPull.map((t) => t.profile))
      return
    }

    if (key.escape) {
      onBack()
      return
    }
  }, {isActive: Boolean(process.stdin.isTTY)})

  useEffect(() => {
    if (!onRegisterClickTargets) return
    const targets: ClickTarget[] = []

    if (phase === 'list' && !untrackConfirm && items.length > 0) {
      targets.push({
        match: 'Pull Selected',
        action: () => {
          const selected = items.filter((p) => p.selected)
          const toPull = selected.length > 0 ? selected : [items[cursor]!]
          startPull(toPull.map((t) => t.profile))
        },
      })
      targets.push({
        match: '[d] Untrack',
        action: () => {
          if (items[cursor]) setUntrackConfirm(items[cursor]!.profile)
        },
      })
      targets.push({
        match: '[a] All',
        action: () => {
          setItems((prev) => {
            const allSelected = prev.every((p) => p.selected)
            return prev.map((p) => ({...p, selected: !allSelected}))
          })
        },
      })
      for (const item of items) {
        targets.push({
          match: `@${item.profile.username}`,
          action: () => {
            setItems((prev) =>
              prev.map((p) =>
                p.profile.username === item.profile.username
                  ? {...p, selected: !p.selected}
                  : p,
              ),
            )
          },
        })
      }
    }

    if (phase === 'done') {
      targets.push({
        match: 'Reveal in folder',
        action: () => {
          if (outputDir) {
            revealInFileManager(outputDir)
          } else if (summary?.items?.[0]?.targetDir) {
            revealInFileManager(summary.items[0].targetDir)
          }
        },
      })
      targets.push({match: '[↵] Done', action: onBack})
      targets.push({match: '[Esc] Back', action: onBack})
    }

    onRegisterClickTargets(targets)
  }, [
    phase,
    untrackConfirm,
    items,
    cursor,
    summary,
    outputDir,
    onBack,
    startPull,
    onRegisterClickTargets,
  ])

  return (
    <Box flexDirection="column" alignItems="center">
      {phase === 'list' && items.length === 0 && (
        <Panel title="Tracked Profiles" width={contentWidth}>
          <Box flexDirection="column" paddingY={1}>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              No tracked profiles found.
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              Download profiles with open-nami &lt;url&gt; to start tracking updates.
            </Text>
            <Gap lines={1} />
            <Text color={theme.primary}>[Esc] Back</Text>
          </Box>
        </Panel>
      )}

      {phase === 'list' && untrackConfirm && (
        <Panel title="Confirm Untrack" width={contentWidth}>
          <Box flexDirection="column" paddingY={1}>
            <Text color={theme.primary} bold>
              Untrack @{untrackConfirm.username} on {untrackConfirm.platform}?
            </Text>
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              Downloaded media files on disk will NOT be deleted.
            </Text>
            <Gap lines={1} />
            <Box flexDirection="row">
              <Text color="red" bold>
                [y] Confirm Untrack
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {'   '}[n / Esc] Cancel
              </Text>
            </Box>
          </Box>
        </Panel>
      )}

      {phase === 'list' && !untrackConfirm && items.length > 0 && (
        <Panel title={`Tracked Profiles (${items.length})`} width={contentWidth}>
          <Box flexDirection="column" paddingY={1}>
            {statusMessage && (
              <Box marginBottom={1}>
                <Text color="yellow">{statusMessage}</Text>
              </Box>
            )}
            {items.map((item, idx) => {
              const isCursor = idx === cursor
              const checkbox = item.selected ? '[x]' : '[ ]'
              const lastSync = formatTimeAgo(item.profile.lastPulledAt)
              return (
                <Box
                  key={`${item.profile.platform}-${item.profile.username}`}
                  flexDirection="row"
                >
                  <Text color={isCursor ? theme.primary : theme.gray} bold={isCursor}>
                    {isCursor ? '❯ ' : '  '}
                    <Text color={item.selected ? 'green' : theme.gray}>
                      {checkbox}{' '}
                    </Text>
                    <Text color={isCursor ? theme.primary : theme.gray}>
                      {item.profile.platform.padEnd(10)}{' '}
                    </Text>
                    <Text bold color={isCursor ? theme.primary : undefined}>
                      {`@${item.profile.username}`.padEnd(20)}
                    </Text>
                    <Text color={theme.gray} dimColor={theme.dimSecondary}>
                      {`${item.profile.mediaCount || 0} media`.padEnd(12)}
                    </Text>
                    <Text color={theme.gray} dimColor={theme.dimSecondary}>
                      {`synced ${lastSync}`}
                    </Text>
                  </Text>
                </Box>
              )
            })}
            <Gap lines={1} />
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              <Text color={theme.primary}>[↑↓]</Text> Navigate{'  '}
              <Text color={theme.primary}>[Space]</Text> Toggle{'  '}
              <Text color={theme.primary}>[a]</Text> All{'  '}
              <Text color={theme.primary}>[d]</Text> Untrack{'  '}
              <Text color={theme.primary} bold>
                [↵] Pull Selected
              </Text>
            </Text>
          </Box>
        </Panel>
      )}

      {phase === 'syncing' && (
        <Panel
          title={`Syncing Profiles (${syncIndex + 1}/${syncTotal})`}
          width={contentWidth}
        >
          <Box flexDirection="column" paddingY={1}>
            {activeProfile && (
              <Box flexDirection="row" alignItems="center">
                <Text color={theme.primary}>
                  <Spinner type="dots" />{' '}
                </Text>
                <Text bold color={theme.primary}>
                  Syncing @{activeProfile.username}{' '}
                </Text>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  on {activeProfile.platform}…
                </Text>
              </Box>
            )}
            <Box marginTop={1}>
              <Text color="green" bold>
                {downloadedCount}
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {' '}
                new downloaded ·{' '}
              </Text>
              <Text color={theme.gray} dimColor={theme.dimSecondary}>
                {skippedCount} skipped
              </Text>
            </Box>
            {currentFile && (
              <Box marginTop={1}>
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  → {currentFile.slice(0, 60)}
                </Text>
              </Box>
            )}
            <Gap lines={1} />
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              <Text color={theme.primary}>[Esc]</Text> Cancel
            </Text>
          </Box>
        </Panel>
      )}

      {phase === 'done' && (
        <Panel title="Synchronization Complete" width={contentWidth}>
          <Box flexDirection="column" paddingY={1}>
            <Box marginBottom={1}>
              <Text
                bold
                color={summary && summary.failed === 0 ? 'green' : 'yellow'}
              >
                {summary?.succeeded || 0} up-to-date, {summary?.failed || 0}{' '}
                failed of {summary?.total || 0} profiles.
              </Text>
            </Box>
            <Box marginBottom={1}>
              <Text color={theme.primary}>
                Total new media:{' '}
                <Text bold color="green">
                  {summary?.totalDownloaded || 0}
                </Text>{' '}
                downloaded (
                <Text color={theme.gray} dimColor={theme.dimSecondary}>
                  {summary?.totalSkipped || 0} skipped
                </Text>
                )
              </Text>
            </Box>
            {summary?.items &&
              summary.items.map((item) => (
                <Box
                  key={`${item.profile.platform}-${item.profile.username}`}
                  flexDirection="row"
                >
                  <Text color={item.status === 'success' ? 'green' : 'red'}>
                    {item.status === 'success' ? '✓ ' : '✗ '}
                  </Text>
                  <Text bold>{`@${item.profile.username}`}: </Text>
                  <Text color={theme.gray} dimColor={theme.dimSecondary}>
                    {item.status === 'success'
                      ? `${item.downloaded} new items downloaded (${item.skipped} skipped)`
                      : item.error || 'Failed'}
                  </Text>
                </Box>
              ))}
            <Gap lines={1} />
            <Text color={theme.gray} dimColor={theme.dimSecondary}>
              <Text color={theme.primary}>[o]</Text> Reveal in folder{'  '}
              <Text color={theme.primary}>[↵]</Text> Done{'  '}
              <Text color={theme.primary}>[Esc]</Text> Back
            </Text>
          </Box>
        </Panel>
      )}
    </Box>
  )
}
