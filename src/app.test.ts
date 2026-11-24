import test from 'node:test'
import assert from 'node:assert/strict'
import React, {useState} from 'react'
import {PassThrough} from 'node:stream'
import {render} from 'ink'
import {App, TAGLINE, HINTS} from './app.js'
import {TextInput} from './components/text-input.js'
import {InputView} from './components/views/input-view.js'
import {ThemeProvider, themeFor} from './theme.js'

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g, '').replace(/\u001B\[[0-9;?]*[ -/]*[@-~]/g, '')
}

function createMockTtyStreams() {
  let output = ''
  const stdout = Object.assign(new PassThrough(), {columns: 100, rows: 40})
  stdout.on('data', chunk => {
    output += chunk.toString()
  })

  const stdin = Object.assign(new PassThrough(), {
    isTTY: true,
    setRawMode: () => stdin,
    ref: () => stdin,
    unref: () => stdin,
  })

  return {
    stdin,
    stdout,
    mark: () => output.length,
    getOutputSince: (offset = 0) => stripAnsi(output.slice(offset)),
  }
}

async function withMockTtyEnv<T>(fn: (streams: ReturnType<typeof createMockTtyStreams>) => Promise<T>): Promise<T> {
  const prevNoUpdate = process.env.OPEN_NAMI_NO_UPDATE
  const prevNoAnnouncements = process.env.OPEN_NAMI_NO_ANNOUNCEMENTS
  const prevIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')

  process.env.OPEN_NAMI_NO_UPDATE = '1'
  process.env.OPEN_NAMI_NO_ANNOUNCEMENTS = '1'
  Object.defineProperty(process.stdin, 'isTTY', {value: true, configurable: true, writable: true})

  const streams = createMockTtyStreams()
  try {
    return await fn(streams)
  } finally {
    if (prevNoUpdate === undefined) delete process.env.OPEN_NAMI_NO_UPDATE
    else process.env.OPEN_NAMI_NO_UPDATE = prevNoUpdate

    if (prevNoAnnouncements === undefined) delete process.env.OPEN_NAMI_NO_ANNOUNCEMENTS
    else process.env.OPEN_NAMI_NO_ANNOUNCEMENTS = prevNoAnnouncements

    if (prevIsTTY) Object.defineProperty(process.stdin, 'isTTY', prevIsTTY)
    else delete (process.stdin as {isTTY?: boolean}).isTTY
  }
}

async function waitForCondition(
  instance: {waitUntilRenderFlush: () => Promise<void>},
  predicate: () => boolean,
  description: string,
  timeoutMs = 1500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await instance.waitUntilRenderFlush()
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 15))
  }
  await instance.waitUntilRenderFlush()
  assert.ok(predicate(), `Timed out waiting for: ${description}`)
}

test('TAGLINE matches Open Omni format: grab any profile. paste. download. done.', () => {
  assert.equal(TAGLINE, 'grab any profile. paste. download. done.')
})

test('HINTS includes correct keybindings for platform selection phase', () => {
  assert.ok(HINTS.platform, 'HINTS must include platform phase')
  assert.deepEqual(HINTS.platform, [
    ['↑↓', 'choose'],
    ['↵', 'select'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes correct keybindings for picking phase', () => {
  assert.ok(HINTS.picking, 'HINTS must include picking phase')
  assert.deepEqual(HINTS.picking, [
    ['↑↓', 'choose'],
    ['↵', 'download'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes settings, watcher, and batch shortcuts in input phase', () => {
  assert.ok(HINTS.input, 'HINTS must include input phase')
  assert.deepEqual(HINTS.input, [
    ['↵', 'download'],
    ['^w', 'watcher'],
    ['^b', 'batch'],
    ['^s', 'settings'],
    ['^p', 'history'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes navigation and action shortcuts in settings phase', () => {
  assert.ok(HINTS.settings, 'HINTS must include settings phase')
  assert.deepEqual(HINTS.settings, [
    ['tab', 'switch field'],
    ['↵', 'save'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes watcher shortcuts', () => {
  assert.ok(HINTS.watcher, 'HINTS must include watcher phase')
  assert.deepEqual(HINTS.watcher, [
    ['c', 'target'],
    ['m', 'sidecar'],
    ['o', 'open dir'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes batch shortcuts', () => {
  assert.ok(HINTS.batch, 'HINTS must include batch phase')
  assert.deepEqual(HINTS.batch, [
    ['tab', 'switch field'],
    ['c', 'target'],
    ['m', 'sidecar'],
    ['l', 'limit'],
    ['d', 'date'],
    ['r', 'resume'],
    ['↵', 'start'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes pull shortcuts', () => {
  assert.ok(HINTS.pull, 'HINTS must include pull phase')
  assert.deepEqual(HINTS.pull, [
    ['↑↓', 'navigate'],
    ['space', 'toggle'],
    ['a', 'all'],
    ['d', 'untrack'],
    ['c', 'clear all'],
    ['↵', 'pull'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('TextInput invokes onEmptyHotkey only when value is empty and blocks insertion when consumed', async () => {
  await withMockTtyEnv(async ({stdin, stdout}) => {
    const hotkeys: string[] = []
    let currentValue = ''

    function Wrapper() {
      const [val, setVal] = useState('')
      currentValue = val
      return React.createElement(ThemeProvider, {
        mode: 'dark',
        children: React.createElement(TextInput, {
          value: val,
          onChange: (next: string) => {
            currentValue = next
            setVal(next)
          },
          onEmptyHotkey: (char: string) => {
            if (char === 'p' || char === 'P') {
              hotkeys.push(char)
              return true
            }
            return false
          },
        }),
      })
    }

    const instance = render(React.createElement(Wrapper), {
      stdin: stdin as any,
      stdout: stdout as any,
      debug: true,
    })

    try {
      await instance.waitUntilRenderFlush()

      stdin.write('p')
      await waitForCondition(instance, () => hotkeys.length === 1, 'lowercase p hotkey')
      assert.equal(currentValue, '')

      stdin.write('P')
      await waitForCondition(instance, () => hotkeys.length === 2, 'uppercase P hotkey')
      assert.equal(currentValue, '')

      stdin.write('a')
      await waitForCondition(instance, () => currentValue === 'a', 'typing non-hotkey character a')
      assert.deepEqual(hotkeys, ['p', 'P'])

      stdin.write('p')
      await waitForCondition(instance, () => currentValue === 'ap', 'typing p when value is non-empty')
      assert.deepEqual(hotkeys, ['p', 'P'])
    } finally {
      instance.unmount()
    }
  })
})

test('InputView wires onPullClick through TextInput without mutating urlInput', async () => {
  await withMockTtyEnv(async ({stdin, stdout}) => {
    let pullCalls = 0
    let currentValue = ''

    function Wrapper() {
      const [val, setVal] = useState('')
      currentValue = val
      return React.createElement(ThemeProvider, {
        mode: 'dark',
        children: React.createElement(InputView, {
          urlInput: val,
          setUrlInput: (next: string) => {
            currentValue = next
            setVal(next)
          },
          onSubmit: () => {},
          boxWidth: 60,
          clipboardOffered: false,
          clipboardAccepted: false,
          releaseUrl: 'https://github.com/OpenSelena/open-nami/releases/tag/v1.0.0',
          theme: themeFor('dark'),
          buttonText: 'download',
          gapComponent: () => null,
          onPullClick: () => {
            pullCalls += 1
          },
        }),
      })
    }

    const instance = render(React.createElement(Wrapper), {
      stdin: stdin as any,
      stdout: stdout as any,
      debug: true,
    })

    try {
      await instance.waitUntilRenderFlush()

      stdin.write('p')
      await waitForCondition(instance, () => pullCalls === 1, 'p triggers onPullClick')
      assert.equal(currentValue, '')

      stdin.write('a')
      await waitForCondition(instance, () => currentValue === 'a', 'typing a updates urlInput')
      stdin.write('p')
      await waitForCondition(instance, () => currentValue === 'ap', 'typing p on non-empty InputView appends p')
      assert.equal(pullCalls, 1)
    } finally {
      instance.unmount()
    }
  })
})

test('App renders ^p history hint and pressing p on empty InputView opens PullView without leaking p', async () => {
  await withMockTtyEnv(async ({stdin, stdout, mark, getOutputSince}) => {
    const instance = render(React.createElement(App, {version: '1.9.6'}), {
      stdin: stdin as any,
      stdout: stdout as any,
      debug: true,
      exitOnCtrlC: false,
    })

    try {
      await waitForCondition(
        instance,
        () => {
          const text = getOutputSince(0)
          return text.includes('Paste a profile link') && text.includes('^p history')
        },
        'initial input view with ^p history hint',
      )
      assert.equal(getOutputSince(0).includes('^h history'), false, 'must not render broken ^h hint')

      let m = mark()
      stdin.write('p')
      await waitForCondition(
        instance,
        () => getOutputSince(m).includes('Tracked Profiles'),
        'p on empty InputView opens PullView',
      )

      m = mark()
      stdin.write('\u001B')
      await waitForCondition(
        instance,
        () => {
          const text = getOutputSince(m)
          return text.includes('Paste a profile link') && text.includes('https://instagram.com/profile')
        },
        'Esc returns to empty InputView without leaked p',
      )

      m = mark()
      stdin.write('P')
      await waitForCondition(
        instance,
        () => getOutputSince(m).includes('Tracked Profiles'),
        'P on empty InputView opens PullView',
      )

      m = mark()
      stdin.write('p')
      await waitForCondition(
        instance,
        () => {
          const text = getOutputSince(m)
          return text.includes('Paste a profile link') && text.includes('https://instagram.com/profile')
        },
        'p inside PullView toggles back to empty InputView',
      )

      m = mark()
      stdin.write('z')
      await waitForCondition(
        instance,
        () => {
          const text = getOutputSince(m)
          return (
            text.includes('z') &&
            !text.includes('https://instagram.com/profile') &&
            !text.includes('pz') &&
            !text.includes('Pz')
          )
        },
        'typing z after returning shows only z without leaked p',
      )

      m = mark()
      stdin.write('p')
      await waitForCondition(
        instance,
        () => getOutputSince(m).includes('zp'),
        'p on non-empty InputView inserts p instead of opening PullView',
      )
      assert.equal(getOutputSince(m).includes('Tracked Profiles'), false)

      m = mark()
      stdin.write('\x7f')
      await waitForCondition(
        instance,
        () => {
          const text = getOutputSince(m)
          return text.includes('z') && !text.includes('zp')
        },
        'first backspace deletes p',
      )

      m = mark()
      stdin.write('\x7f')
      await waitForCondition(
        instance,
        () => getOutputSince(m).includes('https://instagram.com/profile'),
        'second backspace restores empty placeholder',
      )

      m = mark()
      stdin.write('\x10')
      await waitForCondition(
        instance,
        () => getOutputSince(m).includes('Tracked Profiles'),
        'Ctrl+P opens PullView',
      )

      m = mark()
      stdin.write('\x10')
      await waitForCondition(
        instance,
        () => {
          const text = getOutputSince(m)
          return text.includes('Paste a profile link') && text.includes('https://instagram.com/profile')
        },
        'Ctrl+P toggles back to InputView',
      )
    } finally {
      instance.unmount()
    }
  })
})
