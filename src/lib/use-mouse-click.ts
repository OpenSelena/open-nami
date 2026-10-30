import {useEffect, useRef} from 'react'
import {useStdin, useStdout} from 'ink'

// 1000h = report button presses, 1006h = SGR encoding (`ESC [ < b ; x ; y M`)
const ENABLE = '\u001B[?1000h\u001B[?1006h'
const DISABLE = '\u001B[?1006l\u001B[?1000l'
const SGR_ANY_MOUSE = /\u001B\[<(\d+);(\d+);(\d+)([Mm])/g

/**
 * Reports left-button presses as 1-based (column, row) terminal cells.
 * Filters out raw terminal mouse escape sequences from stdin before
 * readline or Ink can misinterpret them as keystrokes.
 */
export function useMouseClick(onClick: (x: number, y: number) => void, isActive: boolean) {
  const handlerRef = useRef(onClick)
  handlerRef.current = onClick
  const {stdin} = useStdin()
  const {stdout} = useStdout()

  useEffect(() => {
    if (!isActive || !stdin || !stdout || !process.stdin.isTTY) return
    stdout.write(ENABLE)

    const origEmit = stdin.emit
    stdin.emit = function (event: string | symbol, chunk: any, ...args: any[]): boolean {
      if (event === 'data' && (typeof chunk === 'string' || Buffer.isBuffer(chunk))) {
        const text = String(chunk)
        let lastIndex = 0
        let nonMouse = ''
        let hasMouse = false

        for (const match of text.matchAll(SGR_ANY_MOUSE)) {
          hasMouse = true
          nonMouse += text.slice(lastIndex, match.index)
          lastIndex = match.index! + match[0].length
          const [, button, x, y, state] = match
          if (button === '0' && state === 'M') {
            handlerRef.current(Number(x), Number(y))
          }
        }

        if (hasMouse) {
          nonMouse += text.slice(lastIndex)
          if (!nonMouse) {
            return true
          }
          const nextChunk = Buffer.isBuffer(chunk) ? Buffer.from(nonMouse) : nonMouse
          return origEmit.call(this, event, nextChunk, ...args)
        }
      }
      return origEmit.call(this, event, chunk, ...args)
    }

    return () => {
      stdin.emit = origEmit
      stdout.write(DISABLE)
    }
  }, [isActive, stdin, stdout])
}

export const stripMouseReports = (value: string) =>
  value.replace(/\u001B?\[?<\d+;\d+;\d+[Mm]/g, '')
