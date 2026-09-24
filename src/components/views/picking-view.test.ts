import test from 'node:test'
import assert from 'node:assert/strict'
import {getPickingOptions} from './picking-view.js'

test('getPickingOptions returns minimalistic labels for Instagram including Stories, Highlights, and Everything', () => {
  const options = getPickingOptions('instagram')
  const labels = options.map(o => o.label)
  assert.deepEqual(labels, [
    'Photos',
    'Videos',
    'Stories',
    'Highlights',
    'Everything',
  ])
  assert.equal(options[options.length - 1]?.value, 'all')
})

test('getPickingOptions returns minimalistic labels for other platforms with Everything', () => {
  const options = getPickingOptions('tiktok')
  const labels = options.map(o => o.label)
  assert.deepEqual(labels, [
    'Photos',
    'Videos',
    'Everything',
  ])
  assert.equal(options[options.length - 1]?.value, 'all')
})
