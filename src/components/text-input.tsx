import React, {useRef, useState} from 'react'
import {Text, useInput} from 'ink'
import {useTheme} from '../theme.js'
import {stripMouseReports} from '../lib/use-mouse-click.js'

export {stripMouseReports}

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  /** visible columns — text scrolls horizontally to keep the cursor in view */
  width?: number
  /** newest-first entries recalled with ↑/↓ */
  history?: string[]
  /** when a paste into an empty field satisfies this, submit immediately */
  submitOnPaste?: (value: string) => boolean
  /** tab pressed — accept a suggestion, etc. */
  onTab?: () => void
  focus?: boolean
  onArrowUp?: () => void
  onArrowDown?: () => void
}

const wordLeft = (text: string, from: number) => {
  let i = from
  while (i > 0 && !/\w/.test(text[i - 1]!)) i--
  while (i > 0 && /\w/.test(text[i - 1]!)) i--
  return i
}

const wordRight = (text: string, from: number) => {
  let i = from
  while (i < text.length && !/\w/.test(text[i]!)) i++
  while (i < text.length && /\w/.test(text[i]!)) i++
  return i
}

/**
 * Single-line editor with readline-style keys:
 * word jumps (⌥←/→, ⌥b/f), word delete (⌥⌫, ^w), kill line (^u/^k),
 * home/end (^a/^e), shift+arrow selection, ↑/↓ history recall,
 * paste auto-submit, and horizontal scrolling.
 */
export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  width = 40,
  history = [],
  submitOnPaste,
  onTab,
  focus = true,
  onArrowUp,
  onArrowDown,
}: Props) {
  const theme = useTheme()
  const [cursorState, setCursorState] = useState(value.length)
  const [anchorState, setAnchorState] = useState<number | null>(null)
  const [historyPos, setHistoryPos] = useState<number | null>(null)
  const draftRef = useRef('')
  const offsetRef = useRef(0)

  // the parent can reset value (e.g. after submit) — clamp stale positions
  const cursor = Math.min(cursorState, value.length)
  const anchor = anchorState === null ? null : Math.min(anchorState, value.length)
  const selection: [number, number] | null =
    anchor !== null && anchor !== cursor ? [Math.min(anchor, cursor), Math.max(anchor, cursor)] : null

  const place = (position: number, selecting = false) => {
    if (selecting) {
      if (anchor === null) setAnchorState(cursor)
    } else {
      setAnchorState(null)
    }
    setCursorState(Math.max(0, Math.min(value.length, position)))
  }

  const edit = (next: string, position: number) => {
    setAnchorState(null)
    setCursorState(Math.max(0, Math.min(next.length, position)))
    setHistoryPos(null)
    onChange(next)
  }

  const recall = (text: string) => {
    setAnchorState(null)
    setCursorState(text.length)
    onChange(text)
  }

  const removeRange = (start: number, end: number) => edit(value.slice(0, start) + value.slice(end), start)

  useInput((input, key) => {
    if (key.return) {
      onSubmit?.(value)
      return
    }
    if (key.tab) {
      onTab?.()
      return
    }
    if (key.pageUp || key.pageDown) return
    if (key.escape) {
      setAnchorState(null)
      return
    }

    if (key.upArrow || key.downArrow) {
      if (history.length === 0) {
        if (key.upArrow) onArrowUp?.()
        if (key.downArrow) onArrowDown?.()
        return
      }
      if (key.upArrow) {
        if (historyPos === null) draftRef.current = value
        const next = historyPos === null ? 0 : Math.min(historyPos + 1, history.length - 1)
        if (next === historyPos) return
        setHistoryPos(next)
        recall(history[next]!)
      } else if (historyPos !== null) {
        const next = historyPos - 1
        setHistoryPos(next < 0 ? null : next)
        recall(next < 0 ? draftRef.current : history[next]!)
      }
      return
    }

    if (key.home) return place(0)
    if (key.end) return place(value.length)

    if (key.leftArrow || key.rightArrow) {
      const dir = key.leftArrow ? -1 : 1
      if (selection && !key.shift) return place(dir < 0 ? selection[0] : selection[1])
      const byWord = key.meta || key.ctrl
      const target = byWord ? (dir < 0 ? wordLeft(value, cursor) : wordRight(value, cursor)) : cursor + dir
      return place(target, key.shift)
    }

    if (key.backspace) {
      if (selection) return removeRange(selection[0], selection[1])
      return removeRange(key.meta ? wordLeft(value, cursor) : Math.max(0, cursor - 1), cursor)
    }
    if (key.delete) {
      if (selection) return removeRange(selection[0], selection[1])
      return removeRange(cursor, key.meta ? wordRight(value, cursor) : Math.min(value.length, cursor + 1))
    }

    if (key.ctrl) {
      if (input === 'a') return place(0)
      if (input === 'e') return place(value.length)
      if (input === 'u') return removeRange(0, selection ? selection[1] : cursor)
      if (input === 'k') return removeRange(selection ? selection[0] : cursor, value.length)
      if (input === 'w') {
        const end = selection ? selection[1] : cursor
        return removeRange(wordLeft(value, selection ? selection[0] : cursor), end)
      }
      return
    }
    if (key.meta) {
      if (input === 'b') return place(wordLeft(value, cursor))
      if (input === 'f') return place(wordRight(value, cursor))
      return
    }

    if (!input) return
    // eslint-disable-next-line no-control-regex
    const clean = stripMouseReports(input).replace(/[\x00-\x1f\x7f]/g, '')
    if (!clean) return
    const [start, end] = selection ?? [cursor, cursor]
    const next = value.slice(0, start) + clean + value.slice(end)
    edit(next, start + clean.length)
    if (clean.length > 1 && value === '' && submitOnPaste?.(next.trim())) onSubmit?.(next)
  }, {isActive: Boolean(process.stdin.isTTY) && focus})

  // scroll the window so the cursor stays visible
  const span = Math.max(8, width)
  let offset = Math.min(offsetRef.current, Math.max(0, value.length + 1 - span))
  if (cursor < offset) offset = cursor
  if (cursor > offset + span - 1) offset = cursor - span + 1
  offsetRef.current = offset

  if (!focus) {
    if (!value) {
      return (
        <Text color={theme.gray} dimColor={theme.dimSecondary}>
          {placeholder.slice(0, span - 1)}
        </Text>
      )
    }
    const cells = Array.from({length: Math.min(span, value.length - offset + 1)}, (_, column) => {
      const index = offset + column
      return (
        <Text key={index} color={theme.gray} dimColor={theme.dimSecondary}>
          {value[index] ?? ' '}
        </Text>
      )
    })
    return <Text>{cells}</Text>
  }

  if (!value) {
    return (
      <Text>
        <Text inverse> </Text>
        <Text color={theme.gray} dimColor={theme.dimSecondary}>{placeholder.slice(0, span - 1)}</Text>
      </Text>
    )
  }

  const cells = Array.from({length: Math.min(span, value.length - offset + 1)}, (_, column) => {
    const index = offset + column
    const selected = selection !== null && index >= selection[0] && index < selection[1]
    const atCursor = selection === null && index === cursor
    return (
      <Text key={index} color={theme.primary} inverse={selected || atCursor}>
        {value[index] ?? ' '}
      </Text>
    )
  })
  return <Text>{cells}</Text>
}
