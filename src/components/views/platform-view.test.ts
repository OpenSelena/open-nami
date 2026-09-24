import test from 'node:test'
import assert from 'node:assert/strict'
import {PLATFORM_OPTIONS, getPlatformOptions} from './platform-view.js'

test('PLATFORM_OPTIONS contains Instagram, TikTok, Facebook, and X in standard order', () => {
  const options = getPlatformOptions()
  assert.equal(options.length, 4)

  assert.deepEqual(options[0], {label: 'Instagram', value: 'instagram'})
  assert.deepEqual(options[1], {label: 'TikTok', value: 'tiktok'})
  assert.deepEqual(options[2], {label: 'Facebook', value: 'facebook'})
  assert.deepEqual(options[3], {label: 'X (Twitter)', value: 'x'})

  assert.equal(PLATFORM_OPTIONS, options)
})

test('PlatformView is exported as a function component and options are non-empty', async () => {
  const {PlatformView} = await import('./platform-view.js')
  assert.equal(typeof PlatformView, 'function')
  for (const option of PLATFORM_OPTIONS) {
    assert.ok(option.label.length > 0)
    assert.ok(['instagram', 'tiktok', 'facebook', 'x'].includes(option.value))
  }
})

