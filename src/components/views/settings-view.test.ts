import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {
  SettingsView,
  DoctorCard,
  formatDoctorEngines,
  formatDoctorStorage,
  formatDoctorCookies,
} from './settings-view.js'
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
