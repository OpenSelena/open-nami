// covers the CSI/OSC sequences ink emits (colors, cursor moves, erase lines)
const ANSI_PATTERN = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
    '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
  ].join('|'),
  'g',
)
const stripAnsi = (text: string) => text.replace(ANSI_PATTERN, '')

let frameLines: string[] = []

export function captureFrames<T extends NodeJS.WriteStream>(stream: T): T {
  return new Proxy(stream, {
    get(target, prop) {
      if (prop === 'write') {
        return (chunk: unknown, ...rest: unknown[]) => {
          const lines = String(chunk).split('\n').map(stripAnsi)
          if (lines.some(line => line.trim() !== '')) frameLines = lines
          return (target.write as (...args: unknown[]) => boolean)(chunk, ...rest)
        }
      }
      const value = Reflect.get(target, prop)
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
    },
  })
}

export type ClickTarget = {
  match: string
  action: () => void
  padX?: number
  padY?: number
}

export function clickTargetAt(x: number, y: number, targets: ClickTarget[]): ClickTarget | undefined {
  for (const target of targets) {
    const {match, padX = 1, padY = 0} = target
    for (let row = y - 1 - padY; row <= y - 1 + padY; row++) {
      const line = frameLines[row]
      if (!line) continue
      let index = line.indexOf(match)
      while (index !== -1) {
        if (x - 1 >= index - padX && x - 1 <= index + match.length - 1 + padX) return target
        index = line.indexOf(match, index + 1)
      }
    }
  }
  return undefined
}

export function findFrameRow(text: string): number {
  return frameLines.findIndex(line => line.includes(text))
}

export function frameRowSpan(row: number): [number, number] | undefined {
  const line = frameLines[row]
  if (!line) return undefined
  const first = line.search(/\S/)
  if (first === -1) return undefined
  return [first + 1, line.trimEnd().length]
}
