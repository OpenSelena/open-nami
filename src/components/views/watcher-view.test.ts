import test from 'node:test'
import assert from 'node:assert/strict'
import {WatcherView} from './watcher-view.js'

test('WatcherView is exported as a function component', () => {
  assert.equal(typeof WatcherView, 'function')
})
