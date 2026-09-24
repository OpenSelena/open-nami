import test from 'node:test'
import assert from 'node:assert/strict'
import {computeScannerTrack, getScannerSegments} from './progress-bar.js'

test('computeScannerTrack starts pulse at index 0 and maintains exact total width', () => {
  const frame0 = computeScannerTrack(0, 30, 6)
  assert.deepEqual(frame0, {before: 0, active: 6, after: 24})
  assert.equal(frame0.before + frame0.active + frame0.after, 30)
})

test('computeScannerTrack smoothly bounces pulse back and forth (ping-pong oscillation)', () => {
  // Max forward position is width (30) - blockWidth (6) = 24
  const frameMax = computeScannerTrack(24, 30, 6)
  assert.deepEqual(frameMax, {before: 24, active: 6, after: 0})

  // Bounce 1 step back to the left
  const frameBounce = computeScannerTrack(25, 30, 6)
  assert.deepEqual(frameBounce, {before: 23, active: 6, after: 1})

  // Full cycle returns to index 0: 2 * (30 - 6) = 48
  const frameCycle = computeScannerTrack(48, 30, 6)
  assert.deepEqual(frameCycle, {before: 0, active: 6, after: 24})
})

test('computeScannerTrack handles small widths gracefully without negative dimensions', () => {
  const frame = computeScannerTrack(5, 5, 6)
  assert.equal(frame.before + frame.active + frame.after, 5)
  assert.ok(frame.before >= 0 && frame.active >= 0 && frame.after >= 0)
})

test('getScannerSegments generates exact track and pulse string patterns', () => {
  const seg0 = getScannerSegments(0, 10, 3)
  assert.equal(seg0.beforeStr, '')
  assert.equal(seg0.activeStr, '███')
  assert.equal(seg0.afterStr, '░░░░░░░')
  assert.equal((seg0.beforeStr + seg0.activeStr + seg0.afterStr).length, 10)

  const seg1 = getScannerSegments(1, 10, 3)
  assert.equal(seg1.beforeStr, '░')
  assert.equal(seg1.activeStr, '███')
  assert.equal(seg1.afterStr, '░░░░░░')
})

