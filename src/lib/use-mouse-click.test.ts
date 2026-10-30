import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { stripMouseReports } from './use-mouse-click.js'

describe('useMouseClick mouse event handling', () => {
  it('stripMouseReports removes terminal SGR mouse sequences', () => {
    assert.equal(stripMouseReports('\u001B[<0;50;10M'), '')
    assert.equal(stripMouseReports('\u001B[<0;50;10m'), '')
    assert.equal(stripMouseReports('hello\u001B[<0;20;5Mworld'), 'helloworld')
    assert.equal(stripMouseReports('pure text'), 'pure text')
  })

  it('filters mouse reports from stdin data without leaking ghost keystrokes', () => {
    const fakeStdin = new EventEmitter()
    const received: string[] = []
    const clicks: Array<{ x: number; y: number }> = []

    const origEmit = fakeStdin.emit
    const SGR_ANY_MOUSE = /\u001B\[<(\d+);(\d+);(\d+)([Mm])/g

    fakeStdin.emit = function (event: string | symbol, chunk: any, ...args: any[]): boolean {
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
            clicks.push({ x: Number(x), y: Number(y) })
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

    fakeStdin.on('data', (data) => {
      received.push(String(data))
    })

    fakeStdin.emit('data', '\u001B[<0;45;12M')
    fakeStdin.emit('data', '\u001B[<0;45;12m')
    fakeStdin.emit('data', 'abc\u001B[<0;10;5Mdef')

    assert.equal(clicks.length, 2)
    assert.deepEqual(clicks[0], { x: 45, y: 12 })
    assert.deepEqual(clicks[1], { x: 10, y: 5 })
    assert.deepEqual(received, ['abcdef'])
  })
})
