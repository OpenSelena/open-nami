import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {
  CompletionView,
  LedgerBadge,
  LEDGER_INDEXED_LABEL,
  DONE_LABEL,
  REVEAL_LABEL,
  shouldShowLedgerBadge,
  formatCompletionSummary,
} from './completion-view.js'
import type {ParsedProfile} from '../../lib/parser.js'
import type {EngineResult} from '../../lib/engines/types.js'
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

const mockProfile: ParsedProfile = {
  platform: 'instagram',
  username: 'johndoe',
  cleanUrl: 'https://www.instagram.com/johndoe/',
  rawInput: 'johndoe',
}

function createResult(
  downloadedCount: number,
  skippedCount = 0,
  errors: string[] = [],
): EngineResult {
  return {
    success: errors.length === 0,
    downloadedCount,
    skippedCount,
    errors,
    outputDir: '/mock/downloads/johndoe',
  }
}

function extractNodeText(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return ''
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(extractNodeText).join(' ')
  }
  if (typeof node === 'object' && 'props' in (node as any)) {
    const el = node as React.ReactElement<any>
    if (el.type === LedgerBadge) {
      return LEDGER_INDEXED_LABEL
    }
    if (el.type === CompletionView) {
      return extractNodeText((el.type as any)(el.props))
    }
    if (el.props && el.props.children) {
      return extractNodeText(el.props.children)
    }
  }
  return ''
}

test('CompletionView and LedgerBadge are exported as components', () => {
  assert.equal(typeof CompletionView, 'function')
  assert.equal(typeof LedgerBadge, 'function')
  assert.equal(LEDGER_INDEXED_LABEL, '✓ indexed in media ledger')
  assert.equal(DONE_LABEL, '↵ download another')
  assert.equal(REVEAL_LABEL, '[o] reveal in folder')
})

test('shouldShowLedgerBadge evaluates correctly with default and override props', () => {
  assert.equal(shouldShowLedgerBadge({downloadedCount: 0}), false)
  assert.equal(shouldShowLedgerBadge({downloadedCount: 1}), true)
  assert.equal(shouldShowLedgerBadge({downloadedCount: 42}), true)

  // Explicit override via showLedgerBadge prop
  assert.equal(shouldShowLedgerBadge({downloadedCount: 0}, true), true)
  assert.equal(shouldShowLedgerBadge({downloadedCount: 5}, false), false)
  assert.equal(shouldShowLedgerBadge({downloadedCount: 0}, false), false)
})

test('formatCompletionSummary handles zero items scan result', () => {
  const summary = formatCompletionSummary({downloadedCount: 0, skippedCount: 0})
  assert.equal(summary.isZero, true)
  assert.equal(summary.headerPrefix, '✓ profile scanned ')
  assert.equal(summary.headerSuffix, ': 0 media items found')
  assert.equal(summary.itemsText, 'no photos or videos available')
  assert.equal(summary.headerSuffix.includes('—'), false)
})

test('formatCompletionSummary handles downloaded items with pluralization and skipped text', () => {
  const single = formatCompletionSummary({downloadedCount: 1, skippedCount: 0})
  assert.equal(single.isZero, false)
  assert.equal(single.headerPrefix, '✓ profile downloaded! ')
  assert.equal(single.headerSuffix, 'saved to:')
  assert.equal(single.itemsText, '1 media item downloaded')

  const multiple = formatCompletionSummary({downloadedCount: 12, skippedCount: 3})
  assert.equal(multiple.isZero, false)
  assert.equal(multiple.itemsText, '12 media items downloaded (3 archived)')
})

test('LedgerBadge renders media ledger indicator', () => {
  const badgeElement = React.createElement(LedgerBadge, {theme: testTheme})
  const text = extractNodeText(badgeElement)
  assert.ok(text.includes('✓ indexed in media ledger'))
})

test('CompletionView renders cleanly with 0 items without ledger indicator or em dashes', () => {
  const result = createResult(0, 0)
  const viewElement = React.createElement(CompletionView, {
    profile: mockProfile,
    result,
    theme: testTheme,
    gapComponent: () => null,
  })

  const renderedText = extractNodeText(viewElement)

  assert.ok(renderedText.includes('✓ profile scanned'))
  assert.ok(renderedText.includes(': 0 media items found'))
  assert.ok(renderedText.includes('no photos or videos available'))
  assert.ok(renderedText.includes('reveal in folder'))
  assert.ok(renderedText.includes(DONE_LABEL))

  // Ledger badge should NOT be displayed when 0 items downloaded
  assert.equal(renderedText.includes(LEDGER_INDEXED_LABEL), false)

  // Strictly check that no em dashes exist anywhere in rendered text
  assert.equal(renderedText.includes('—'), false)
  assert.equal(renderedText.includes('\u2014'), false)
})

test('CompletionView renders downloaded items with media ledger indicator', () => {
  const result = createResult(7, 2)
  const viewElement = React.createElement(CompletionView, {
    profile: mockProfile,
    result,
    theme: testTheme,
    gapComponent: () => null,
  })

  const renderedText = extractNodeText(viewElement)

  assert.ok(renderedText.includes('✓ profile downloaded!'))
  assert.ok(renderedText.includes('saved to:'))
  assert.ok(renderedText.includes('7 media items downloaded (2 archived)'))
  assert.ok(renderedText.includes('reveal in folder'))
  assert.ok(renderedText.includes(DONE_LABEL))

  // Ledger badge MUST be present
  assert.ok(renderedText.includes(LEDGER_INDEXED_LABEL))

  // Strictly check that no em dashes exist anywhere in rendered text
  assert.equal(renderedText.includes('—'), false)
  assert.equal(renderedText.includes('\u2014'), false)
})

test('CompletionView respects showLedgerBadge prop override', () => {
  // Override to false when downloadedCount > 0
  const viewDisabled = React.createElement(CompletionView, {
    profile: mockProfile,
    result: createResult(5, 0),
    theme: testTheme,
    gapComponent: () => null,
    showLedgerBadge: false,
  })
  const textDisabled = extractNodeText(viewDisabled)
  assert.equal(textDisabled.includes(LEDGER_INDEXED_LABEL), false)

  // Override to true when downloadedCount === 0
  const viewEnabled = React.createElement(CompletionView, {
    profile: mockProfile,
    result: createResult(0, 0),
    theme: testTheme,
    gapComponent: () => null,
    showLedgerBadge: true,
  })
  const textEnabled = extractNodeText(viewEnabled)
  assert.ok(textEnabled.includes(LEDGER_INDEXED_LABEL))
})

test('CompletionView displays cleaned error messages when result contains errors', () => {
  const result = createResult(0, 0, ['Network timeout', 'Rate limit exceeded'])
  const viewElement = React.createElement(CompletionView, {
    profile: mockProfile,
    result,
    theme: testTheme,
    gapComponent: () => null,
  })

  const renderedText = extractNodeText(viewElement)
  assert.ok(renderedText.includes('Network timeout'))
  assert.ok(renderedText.includes('rate limit reached'))
})
