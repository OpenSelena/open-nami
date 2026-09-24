import React from 'react'
import {Text} from 'ink'
import {useTheme} from '../theme.js'

export function computeScannerTrack(tick: number, width = 30, blockWidth = 6) {
  const safeWidth = Math.max(1, width)
  const safeBlock = Math.min(safeWidth, Math.max(1, blockWidth))
  const maxPos = safeWidth - safeBlock

  if (maxPos <= 0) {
    return {before: 0, active: safeWidth, after: 0}
  }

  const cycle = 2 * maxPos
  const phase = ((tick % cycle) + cycle) % cycle
  const pos = phase <= maxPos ? phase : cycle - phase

  return {
    before: pos,
    active: safeBlock,
    after: safeWidth - pos - safeBlock,
  }
}

export function getScannerSegments(tick: number, width = 30, blockWidth = 6) {
  const {before, active, after} = computeScannerTrack(tick, width, blockWidth)
  return {
    beforeStr: '░'.repeat(before),
    activeStr: '█'.repeat(active),
    afterStr: '░'.repeat(after),
  }
}

export function ProgressBar({
  percent = 0,
  width = 30,
  showPercent = true,
  indeterminate = false,
  tick: externalTick,
}: {
  percent?: number
  width?: number
  showPercent?: boolean
  indeterminate?: boolean
  tick?: number
}) {
  const theme = useTheme()
  const [internalTick, setInternalTick] = React.useState(0)

  React.useEffect(() => {
    if (!indeterminate || externalTick !== undefined) return
    const timer = setInterval(() => setInternalTick(t => t + 1), 75)
    return () => clearInterval(timer)
  }, [indeterminate, externalTick])

  if (indeterminate) {
    const currentTick = externalTick ?? internalTick
    const {beforeStr, activeStr, afterStr} = getScannerSegments(currentTick, width)
    return (
      <Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>{beforeStr}</Text>
        <Text color={theme.primary}>{activeStr}</Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>{afterStr}</Text>
      </Text>
    )
  }

  const normalized = percent > 1 ? percent / 100 : Math.max(0, percent)
  const clamped = Math.min(1, normalized)
  const percentLabel = showPercent ? ` ${`${Math.round(clamped * 100)}%`.padStart(4)}` : ''
  const barWidth = Math.max(1, showPercent ? width - percentLabel.length : width)
  const filled = Math.round(clamped * barWidth)
  return (
    <Text>
      <Text color={theme.primary}>{'█'.repeat(filled)}</Text>
      <Text color={theme.gray} dimColor={theme.dimSecondary}>{'░'.repeat(barWidth - filled)}</Text>
      {percentLabel ? <Text color={theme.primary}>{percentLabel}</Text> : null}
    </Text>
  )
}
