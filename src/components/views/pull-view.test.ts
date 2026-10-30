import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {PassThrough} from 'node:stream'
import {render} from 'ink'
import {
  PullView,
  formatTimeAgo,
} from './pull-view.js'
import type {TrackedProfileRecord} from '../../lib/engines/storage/ledger.js'
import type {Theme} from '../../theme.js'
import type {ClickTarget} from '../../lib/click-map.js'

const testTheme: Theme = {
  mode: 'dark',
  primary: '#ffffff',
  gray: '#a1a1aa',
  dark: '#18181b',
  background: '#18181b',
  dimSecondary: false,
  inverseButton: false,
}

function createMockStdout() {
  let output = ''
  const stream = new PassThrough()
  stream.on('data', chunk => {
    output += chunk.toString()
  })
  return {
    stream: Object.assign(stream, {columns: 100, rows: 40}),
    getOutput: () => output,
  }
}

test('PullView is exported as a function component', () => {
  assert.equal(typeof PullView, 'function')
})

test('formatTimeAgo handles undefined and formats intervals cleanly', () => {
  assert.equal(formatTimeAgo(undefined), 'never')
  assert.equal(formatTimeAgo('invalid-date'), 'never')

  const now = new Date()
  assert.equal(formatTimeAgo(now.toISOString()), 'just now')

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  assert.equal(formatTimeAgo(fiveMinutesAgo.toISOString()), '5m ago')

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
  assert.equal(formatTimeAgo(twoHoursAgo.toISOString()), '2h ago')

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  assert.equal(formatTimeAgo(threeDaysAgo.toISOString()), '3d ago')

  const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
  assert.equal(formatTimeAgo(twoMonthsAgo.toISOString()), twoMonthsAgo.toISOString().slice(0, 10))
})

test('PullView renders empty state message when no profiles are tracked', async () => {
  const {stream, getOutput} = createMockStdout()
  const instance = render(
    React.createElement(PullView, {
      onBack: () => {},
      contentWidth: 80,
      theme: testTheme,
      gapComponent: () => null,
      initialProfiles: [],
    }),
    {stdout: stream as any, debug: true},
  )

  try {
    await instance.waitUntilRenderFlush()
    const frame = getOutput()
    assert.ok(frame.includes('No tracked profiles found'), `Expected empty notice: ${frame}`)
    assert.ok(frame.includes('Download profiles with open-nami'), `Expected hint: ${frame}`)
  } finally {
    instance.unmount()
  }
})

test('PullView renders tracked profile details in list mode', async () => {
  const mockProfiles: TrackedProfileRecord[] = [
    {
      platform: 'instagram',
      username: 'selenagomez',
      profileUrl: 'https://instagram.com/selenagomez',
      targetDir: '/downloads/selenagomez',
      choice: 'photos',
      lastPulledAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      mediaCount: 42,
    },
    {
      platform: 'tiktok',
      username: 'charlidamelio',
      profileUrl: 'https://tiktok.com/@charlidamelio',
      targetDir: '/downloads/charlidamelio',
      choice: 'videos',
      lastPulledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      mediaCount: 18,
    },
  ]

  const {stream, getOutput} = createMockStdout()
  const instance = render(
    React.createElement(PullView, {
      onBack: () => {},
      contentWidth: 80,
      theme: testTheme,
      gapComponent: () => null,
      initialProfiles: mockProfiles,
    }),
    {stdout: stream as any, debug: true},
  )

  try {
    await instance.waitUntilRenderFlush()
    const frame = getOutput()
    assert.ok(frame.includes('selenagomez'), `Expected selenagomez: ${frame}`)
    assert.ok(frame.includes('42 media'), `Expected 42 media: ${frame}`)
    assert.ok(frame.includes('charlidamelio'), `Expected charlidamelio: ${frame}`)
    assert.ok(frame.includes('18 media'), `Expected 18 media: ${frame}`)
    assert.ok(frame.includes('Pull Selected'), `Expected pull action: ${frame}`)
  } finally {
    instance.unmount()
  }
})

test('PullView registers click targets for interactive mouse navigation', async () => {
  const mockProfiles: TrackedProfileRecord[] = [
    {
      platform: 'instagram',
      username: 'selenagomez',
      profileUrl: 'https://instagram.com/selenagomez',
      targetDir: '/downloads/selenagomez',
      choice: 'photos',
      lastPulledAt: new Date().toISOString(),
      mediaCount: 10,
    },
  ]

  const registeredTargets: ClickTarget[] = []
  const {stream} = createMockStdout()
  const instance = render(
    React.createElement(PullView, {
      onBack: () => {},
      contentWidth: 80,
      theme: testTheme,
      gapComponent: () => null,
      initialProfiles: mockProfiles,
      onRegisterClickTargets: (targets) => {
        registeredTargets.push(...targets)
      },
    }),
    {stdout: stream as any, debug: true},
  )

  try {
    await instance.waitUntilRenderFlush()
    await new Promise((r) => setTimeout(r, 50))
    assert.ok(registeredTargets.length > 0, 'Expected click targets to be registered')
    assert.ok(registeredTargets.some(t => t.match === 'Pull Selected'))
    assert.ok(registeredTargets.some(t => t.match === '@selenagomez'))
  } finally {
    instance.unmount()
  }
})
