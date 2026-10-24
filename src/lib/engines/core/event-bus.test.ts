import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EngineEventBus } from './event-bus.js'

test('EngineEventBus emits and receives typed events', () => {
  const bus = new EngineEventBus()
  let received = false
  const unsubscribe = bus.on('rate_limit:encountered', payload => {
    assert.equal(payload.platform, 'instagram')
    assert.equal(payload.retryAfterMs, 3000)
    received = true
  })

  bus.emit('rate_limit:encountered', { platform: 'instagram', retryAfterMs: 3000 })
  assert.equal(received, true)

  received = false
  unsubscribe()
  bus.emit('rate_limit:encountered', { platform: 'instagram', retryAfterMs: 3000 })
  assert.equal(received, false)
})

test('EngineEventBus once listener fires only once', () => {
  const bus = new EngineEventBus()
  let count = 0

  bus.once('job:error', payload => {
    assert.equal(payload.error, 'Network timeout')
    count++
  })

  bus.emit('job:error', { error: 'Network timeout' })
  bus.emit('job:error', { error: 'Network timeout' })

  assert.equal(count, 1)
})

test('EngineEventBus removeAllListeners removes listeners for specific event', () => {
  const bus = new EngineEventBus()
  let calledA = 0
  let calledB = 0

  bus.on('job:error', () => {
    calledA++
  })
  bus.on('item:download:skip', () => {
    calledB++
  })

  bus.removeAllListeners('job:error')

  bus.emit('job:error', { error: 'err' })
  bus.emit('item:download:skip', { item: { id: '1', url: 'http://example.com', filename: '1.jpg', extension: 'jpg', type: 'photo' }, reason: 'exists' })

  assert.equal(calledA, 0)
  assert.equal(calledB, 1)
})

test('EngineEventBus removeAllListeners removes all listeners when no event specified', () => {
  const bus = new EngineEventBus()
  let calledA = 0
  let calledB = 0

  bus.on('job:error', () => {
    calledA++
  })
  bus.on('item:download:skip', () => {
    calledB++
  })

  bus.removeAllListeners()

  bus.emit('job:error', { error: 'err' })
  bus.emit('item:download:skip', { item: { id: '1', url: 'http://example.com', filename: '1.jpg', extension: 'jpg', type: 'photo' }, reason: 'exists' })

  assert.equal(calledA, 0)
  assert.equal(calledB, 0)
})
