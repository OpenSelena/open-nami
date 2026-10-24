import { test } from 'node:test'
import assert from 'node:assert/strict'
import { listDetectedBrowsers, exportCookiesForPlatform } from './browser-bridge.js'

test('listDetectedBrowsers detects known browser profile paths on OS', () => {
  const browsers = listDetectedBrowsers()
  assert.equal(Array.isArray(browsers), true)
  assert.equal(browsers.some(b => ['chrome', 'firefox', 'edge', 'brave'].includes(b.id)), true)
  for (const b of browsers) {
    assert.equal(typeof b.id, 'string')
    assert.equal(typeof b.name, 'string')
    assert.equal(typeof b.profileDir, 'string')
    assert.equal(typeof b.available, 'boolean')
  }
})

test('exportCookiesForPlatform returns false for invalid or unavailable browser', async () => {
  const result = await exportCookiesForPlatform('nonexistent-browser', 'instagram', '/tmp/fake-cookie.txt')
  assert.equal(result, false)
})
