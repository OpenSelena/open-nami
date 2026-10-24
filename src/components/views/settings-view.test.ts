import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {PassThrough} from 'node:stream'
import {render} from 'ink'
import {
  SettingsView,
  DoctorCard,
  formatDoctorEngines,
  formatDoctorStorage,
  formatDoctorCookies,
  formatBrowserFeedback,
  resolveBrowserOptions,
  cycleBrowserOption,
} from './settings-view.js'
import type {DetectedBrowser} from '../../lib/cookies/browser-bridge.js'
import {runDoctor, type DoctorReport} from '../../lib/diagnostics/doctor.js'
import type {Theme} from '../../theme.js'

const testTheme: Theme = {
  mode: 'dark',
  primary: '#ffffff',
  gray: '#a1a1aa',
  dark: '#18181b',
  background: '#18181b',
  dimSecondary: false,
  inverseButton: false,
}

test('SettingsView is exported as a function component', () => {
  assert.equal(typeof SettingsView, 'function')
})

test('SettingsView accepts controlled focus props', () => {
  assert.equal(typeof SettingsView, 'function')
})

test('formatDoctorEngines formats all engines when healthy', () => {
  const engines = formatDoctorEngines({
    'gallery-dl': true,
    'yt-dlp': true,
    ffmpeg: true,
  })

  assert.equal(engines.length, 3)
  assert.deepEqual(
    engines.map(e => ({name: e.name, ok: e.ok, symbol: e.symbol})),
    [
      {name: 'gallery-dl', ok: true, symbol: '✓'},
      {name: 'yt-dlp', ok: true, symbol: '✓'},
      {name: 'ffmpeg', ok: true, symbol: '✓'},
    ],
  )
  assert.equal(engines[0]?.label, '✓ gallery-dl')
  assert.equal(engines[1]?.label, '✓ yt-dlp')
  assert.equal(engines[2]?.label, '✓ ffmpeg')
})

test('formatDoctorEngines handles missing or failing engine binaries', () => {
  const engines = formatDoctorEngines({
    'gallery-dl': false,
    'yt-dlp': true,
    ffmpeg: false,
  })

  assert.equal(engines.length, 3)
  assert.equal(engines[0]?.ok, false)
  assert.equal(engines[0]?.symbol, '✗')
  assert.equal(engines[0]?.label, '✗ gallery-dl')

  assert.equal(engines[1]?.ok, true)
  assert.equal(engines[1]?.symbol, '✓')
  assert.equal(engines[1]?.label, '✓ yt-dlp')

  assert.equal(engines[2]?.ok, false)
  assert.equal(engines[2]?.symbol, '✗')
  assert.equal(engines[2]?.label, '✗ ffmpeg')
})

test('formatDoctorStorage formats SQLite status correctly', () => {
  const healthy = formatDoctorStorage(true)
  assert.equal(healthy.ok, true)
  assert.equal(healthy.text, '✓ SQLite ready')

  const degraded = formatDoctorStorage(false)
  assert.equal(degraded.ok, false)
  assert.equal(degraded.text, '✗ SQLite unavailable')
})

test('formatDoctorCookies formats detected cookie platforms summary', () => {
  const allCookies = formatDoctorCookies({
    instagram: true,
    tiktok: true,
    facebook: true,
    x: true,
  })
  assert.equal(allCookies.count, 4)
  assert.deepEqual(allCookies.platforms, ['instagram', 'tiktok', 'facebook', 'x'])
  assert.equal(allCookies.text, '✓ 4 (instagram, tiktok, facebook, x)')

  const partialCookies = formatDoctorCookies({
    instagram: true,
    tiktok: false,
    facebook: false,
    x: false,
  })
  assert.equal(partialCookies.count, 1)
  assert.deepEqual(partialCookies.platforms, ['instagram'])
  assert.equal(partialCookies.text, '✓ 1 (instagram)')

  const noCookies = formatDoctorCookies({
    instagram: false,
    tiktok: false,
    facebook: false,
    x: false,
  })
  assert.equal(noCookies.count, 0)
  assert.deepEqual(noCookies.platforms, [])
  assert.equal(noCookies.text, 'none detected')
})

test('DoctorCard renders structured box element with valid report', () => {
  const report: DoctorReport = {
    nodeVersion: 'v20.18.0',
    binaries: {
      'gallery-dl': true,
      'yt-dlp': true,
      ffmpeg: true,
    },
    cookies: {
      instagram: true,
      tiktok: true,
      facebook: false,
      x: false,
    },
    storageOk: true,
  }

  const el = React.createElement(DoctorCard, {
    boxWidth: 64,
    theme: testTheme,
    report,
  })

  assert.equal(el.type, DoctorCard)
  assert.equal(el.props.boxWidth, 64)
  assert.equal(el.props.report?.nodeVersion, 'v20.18.0')
  assert.equal(el.props.report?.storageOk, true)
})

test('DoctorCard renders placeholder element when report is null', () => {
  const el = React.createElement(DoctorCard, {
    boxWidth: 64,
    theme: testTheme,
    report: null,
  })

  assert.equal(el.type, DoctorCard)
  assert.equal(el.props.report, null)
})

test('SettingsView accepts initialReport and doctorChecker props for deterministic testing', () => {
  const initialReport: DoctorReport = {
    nodeVersion: 'v20.18.0',
    binaries: {'gallery-dl': true, 'yt-dlp': false, ffmpeg: true},
    cookies: {instagram: false, tiktok: false, facebook: false, x: false},
    storageOk: false,
  }

  const mockChecker = async () => initialReport

  const el = React.createElement(SettingsView, {
    boxWidth: 60,
    theme: testTheme,
    gapComponent: () => null,
    onSave: () => {},
    onCancel: () => {},
    initialReport,
    doctorChecker: mockChecker,
  })

  assert.equal(el.type, SettingsView)
  assert.equal(el.props.initialReport, initialReport)
  assert.equal(el.props.doctorChecker, mockChecker)
})

test('runDoctor integrates cleanly with formatters for SettingsView presentation', async () => {
  const mockReport: DoctorReport = await runDoctor({
    binaryChecker: async bin => bin === 'gallery-dl',
    cookiesDir: 'C:\\non-existent-cookies-path',
  })

  const engines = formatDoctorEngines(mockReport.binaries)
  const storage = formatDoctorStorage(mockReport.storageOk)
  const cookies = formatDoctorCookies(mockReport.cookies)

  assert.equal(engines[0]?.name, 'gallery-dl')
  assert.equal(engines[0]?.ok, true)
  assert.equal(engines[1]?.name, 'yt-dlp')
  assert.equal(engines[1]?.ok, false)
  assert.equal(engines[2]?.name, 'ffmpeg')
  assert.equal(engines[2]?.ok, false)

  assert.equal(typeof storage.ok, 'boolean')
  assert.ok(storage.text.includes('SQLite'))

  assert.equal(typeof cookies.count, 'number')
  assert.ok(typeof cookies.text === 'string')
})

test('resolveBrowserOptions includes auto, none, and installed browsers in order', () => {
  const mockBrowsers: DetectedBrowser[] = [
    {id: 'chrome', name: 'Google Chrome', profileDir: 'C:/chrome', available: true},
    {id: 'edge', name: 'Microsoft Edge', profileDir: 'C:/edge', available: true},
    {id: 'brave', name: 'Brave Browser', profileDir: 'C:/brave', available: false},
  ]
  const options = resolveBrowserOptions(mockBrowsers)
  assert.deepEqual(options, ['auto', 'none', 'chrome', 'edge'])
})

test('resolveBrowserOptions returns auto and none when no browsers are installed', () => {
  const mockBrowsers: DetectedBrowser[] = [
    {id: 'chrome', name: 'Google Chrome', profileDir: 'C:/chrome', available: false},
  ]
  const options = resolveBrowserOptions(mockBrowsers)
  assert.deepEqual(options, ['auto', 'none'])
})

test('cycleBrowserOption cycles forward and wraps around with auto', () => {
  const options = ['auto', 'none', 'chrome', 'edge']
  assert.equal(cycleBrowserOption('auto', options, true), 'none')
  assert.equal(cycleBrowserOption('none', options, true), 'chrome')
  assert.equal(cycleBrowserOption('chrome', options, true), 'edge')
  assert.equal(cycleBrowserOption('edge', options, true), 'auto')
})

test('cycleBrowserOption cycles backward and wraps around with auto', () => {
  const options = ['auto', 'none', 'chrome', 'edge']
  assert.equal(cycleBrowserOption('auto', options, false), 'edge')
  assert.equal(cycleBrowserOption('edge', options, false), 'chrome')
  assert.equal(cycleBrowserOption('chrome', options, false), 'none')
  assert.equal(cycleBrowserOption('none', options, false), 'auto')
})

test('cycleBrowserOption handles current value not in options', () => {
  const options = ['auto', 'none', 'chrome']
  assert.equal(cycleBrowserOption('unknown', options, true), 'none')
})

test('formatBrowserFeedback formats auto with detected default browser', () => {
  const helium: DetectedBrowser = {
    id: 'helium',
    name: 'Helium',
    profileDir: 'C:/Users/mint/AppData/Local/imput/Helium/User Data',
    available: true,
  }
  const feedback = formatBrowserFeedback('auto', [], helium)
  assert.equal(feedback, 'system default: Helium (auto-extract session cookies)')

  const chrome: DetectedBrowser = {
    id: 'chrome',
    name: 'Google Chrome',
    profileDir: 'C:/Users/mint/AppData/Local/Google/Chrome/User Data',
    available: true,
  }
  const chromeFeedback = formatBrowserFeedback('auto', [], chrome)
  assert.equal(chromeFeedback, 'system default: Google Chrome (auto-extract session cookies)')
})

test('formatBrowserFeedback formats auto when no default browser detected', () => {
  const feedback = formatBrowserFeedback('auto', [], null)
  assert.equal(feedback, 'system default: none detected (falls back to cookie files)')
})

test('formatBrowserFeedback formats manual browser and none', () => {
  const mockBrowsers: DetectedBrowser[] = [
    {id: 'chrome', name: 'Google Chrome', profileDir: 'C:/chrome', available: true},
  ]
  assert.equal(formatBrowserFeedback('none', mockBrowsers, null), 'manual cookie files only')
  assert.equal(formatBrowserFeedback(undefined, mockBrowsers, null), 'manual cookie files only')
  assert.equal(formatBrowserFeedback('chrome', mockBrowsers, null), 'live session cookies from Google Chrome')
})

test('SettingsView accepts browsers and defaultBrowser props for deterministic injection', () => {
  const mockBrowsers: DetectedBrowser[] = [
    {id: 'firefox', name: 'Mozilla Firefox', profileDir: 'C:/firefox', available: true},
  ]
  const mockDefault: DetectedBrowser = {
    id: 'helium',
    name: 'Helium',
    profileDir: 'C:/helium',
    available: true,
  }
  const el = React.createElement(SettingsView, {
    boxWidth: 60,
    theme: testTheme,
    gapComponent: () => null,
    onSave: () => {},
    onCancel: () => {},
    browsers: mockBrowsers,
    defaultBrowser: mockDefault,
  })
  assert.equal(el.type, SettingsView)
  assert.equal(el.props.browsers, mockBrowsers)
  assert.equal(el.props.defaultBrowser, mockDefault)
})

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

test('SettingsView renders [AUTO] and default browser feedback for Helium', async () => {
  const mockDefault: DetectedBrowser = {
    id: 'helium',
    name: 'Helium',
    profileDir: 'C:/Users/mint/AppData/Local/imput/Helium/User Data',
    available: true,
  }

  const initialReport: DoctorReport = {
    nodeVersion: 'v20.18.0',
    binaries: {'gallery-dl': true, 'yt-dlp': true, ffmpeg: true},
    cookies: {instagram: false, tiktok: false, facebook: false, x: false},
    storageOk: true,
  }

  const {stream, getOutput} = createMockStdout()
  const instance = render(
    React.createElement(SettingsView, {
      boxWidth: 70,
      theme: testTheme,
      gapComponent: () => null,
      onSave: () => {},
      onCancel: () => {},
      defaultBrowser: mockDefault,
      initialConfig: {cookiesFromBrowser: 'auto'},
      initialReport,
    }),
    {stdout: stream as any, debug: true},
  )

  try {
    await instance.waitUntilRenderFlush()
    const frame = getOutput()
    assert.ok(frame.includes('[AUTO]'), `Expected [AUTO] in rendered output: ${frame}`)
    assert.ok(
      frame.includes('system default: Helium (auto-extract session cookies)'),
      `Expected Helium feedback in rendered output: ${frame}`,
    )
  } finally {
    instance.unmount()
  }
})

test('SettingsView renders [AUTO] and default browser feedback for Chrome', async () => {
  const mockDefault: DetectedBrowser = {
    id: 'chrome',
    name: 'Google Chrome',
    profileDir: 'C:/Users/mint/AppData/Local/Google/Chrome/User Data',
    available: true,
  }

  const initialReport: DoctorReport = {
    nodeVersion: 'v20.18.0',
    binaries: {'gallery-dl': true, 'yt-dlp': true, ffmpeg: true},
    cookies: {instagram: false, tiktok: false, facebook: false, x: false},
    storageOk: true,
  }

  const {stream, getOutput} = createMockStdout()
  const instance = render(
    React.createElement(SettingsView, {
      boxWidth: 70,
      theme: testTheme,
      gapComponent: () => null,
      onSave: () => {},
      onCancel: () => {},
      defaultBrowser: mockDefault,
      initialConfig: {cookiesFromBrowser: 'auto'},
      initialReport,
    }),
    {stdout: stream as any, debug: true},
  )

  try {
    await instance.waitUntilRenderFlush()
    const frame = getOutput()
    assert.ok(frame.includes('[AUTO]'), `Expected [AUTO] in rendered output: ${frame}`)
    assert.ok(
      frame.includes('system default: Google Chrome (auto-extract session cookies)'),
      `Expected Chrome feedback in rendered output: ${frame}`,
    )
  } finally {
    instance.unmount()
  }
})

test('SettingsView renders fallback message when no default browser is detected', async () => {
  const initialReport: DoctorReport = {
    nodeVersion: 'v20.18.0',
    binaries: {'gallery-dl': true, 'yt-dlp': true, ffmpeg: true},
    cookies: {instagram: false, tiktok: false, facebook: false, x: false},
    storageOk: true,
  }

  const {stream, getOutput} = createMockStdout()
  const instance = render(
    React.createElement(SettingsView, {
      boxWidth: 70,
      theme: testTheme,
      gapComponent: () => null,
      onSave: () => {},
      onCancel: () => {},
      defaultBrowser: null,
      initialConfig: {cookiesFromBrowser: 'auto'},
      initialReport,
    }),
    {stdout: stream as any, debug: true},
  )

  try {
    await instance.waitUntilRenderFlush()
    const frame = getOutput()
    assert.ok(frame.includes('[AUTO]'), `Expected [AUTO] in rendered output: ${frame}`)
    assert.ok(
      frame.includes('system default: none detected (falls back to cookie files)'),
      `Expected fallback feedback in rendered output: ${frame}`,
    )
  } finally {
    instance.unmount()
  }
})
