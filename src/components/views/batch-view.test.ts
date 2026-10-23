import test from 'node:test'
import assert from 'node:assert/strict'
import {BatchView} from './batch-view.js'

test('BatchView is exported as a function component', () => {
  assert.equal(typeof BatchView, 'function')
})
