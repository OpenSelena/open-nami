import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EngineEventBus } from './event-bus.js'
import {
  subscribeToEngineEvents,
  INITIAL_ENGINE_EVENT_STATE,
  type EngineEventSubscriptionState,
} from './use-engine-events.js'
import type { ParsedProfile } from '../../parser.js'
import type { EngineProgress, EngineResult } from '../types.js'

const mockProfile: ParsedProfile = {
  platform: 'instagram',
  username: 'opennami_test',
  cleanUrl: 'https://instagram.com/opennami_test',
  rawInput: 'opennami_test',
}

test('INITIAL_ENGINE_EVENT_STATE provides correct default state', () => {
  assert.equal(INITIAL_ENGINE_EVENT_STATE.isDownloading, false)
  assert.equal(INITIAL_ENGINE_EVENT_STATE.activeJob, undefined)
  assert.equal(INITIAL_ENGINE_EVENT_STATE.progress, undefined)
  assert.equal(INITIAL_ENGINE_EVENT_STATE.lastError, undefined)
  assert.equal(INITIAL_ENGINE_EVENT_STATE.lastResult, undefined)
})

test('subscribeToEngineEvents updates state on job:start', () => {
  const bus = new EngineEventBus()
  let state: EngineEventSubscriptionState = { ...INITIAL_ENGINE_EVENT_STATE }

  const unsubscribe = subscribeToEngineEvents(bus, nextState => {
    state = nextState
  })

  bus.emit('job:start', {
    profile: mockProfile,
    choice: 'photos',
    outputDir: '/downloads/test',
  })

  assert.equal(state.isDownloading, true)
  assert.deepEqual(state.activeJob, {
    profile: mockProfile,
    choice: 'photos',
    outputDir: '/downloads/test',
  })
  assert.equal(state.progress, undefined)
  assert.equal(state.lastError, undefined)
  assert.equal(state.lastResult, undefined)

  unsubscribe()
})

test('subscribeToEngineEvents updates progress on job:progress', () => {
  const bus = new EngineEventBus()
  let state: EngineEventSubscriptionState = { ...INITIAL_ENGINE_EVENT_STATE }

  const unsubscribe = subscribeToEngineEvents(bus, nextState => {
    state = nextState
  })

  bus.emit('job:start', {
    profile: mockProfile,
    choice: 'photos',
    outputDir: '/downloads/test',
  })

  const progressPayload: EngineProgress = {
    job: 'Photos',
    downloadedCount: 3,
    skippedCount: 1,
    currentFile: 'photo_001.jpg',
    statusText: 'downloading photo_001.jpg',
  }

  bus.emit('job:progress', progressPayload)

  assert.equal(state.isDownloading, true)
  assert.deepEqual(state.progress, progressPayload)

  unsubscribe()
})

test('subscribeToEngineEvents updates state on job:error', () => {
  const bus = new EngineEventBus()
  let state: EngineEventSubscriptionState = { ...INITIAL_ENGINE_EVENT_STATE }

  const unsubscribe = subscribeToEngineEvents(bus, nextState => {
    state = nextState
  })

  bus.emit('job:start', {
    profile: mockProfile,
    choice: 'videos',
    outputDir: '/downloads/test',
  })
  assert.equal(state.isDownloading, true)

  bus.emit('job:error', { error: 'Rate limit exceeded: 429' })

  assert.equal(state.isDownloading, false)
  assert.equal(state.lastError, 'Rate limit exceeded: 429')

  unsubscribe()
})

test('subscribeToEngineEvents updates state on job:complete', () => {
  const bus = new EngineEventBus()
  let state: EngineEventSubscriptionState = { ...INITIAL_ENGINE_EVENT_STATE }

  const unsubscribe = subscribeToEngineEvents(bus, nextState => {
    state = nextState
  })

  bus.emit('job:start', {
    profile: mockProfile,
    choice: 'all',
    outputDir: '/downloads/test',
  })
  assert.equal(state.isDownloading, true)

  const resultPayload: EngineResult = {
    success: true,
    downloadedCount: 12,
    skippedCount: 2,
    errors: [],
    outputDir: '/downloads/test',
  }

  bus.emit('job:complete', { result: resultPayload })

  assert.equal(state.isDownloading, false)
  assert.deepEqual(state.lastResult, resultPayload)

  unsubscribe()
})

test('subscribeToEngineEvents resets previous errors and progress on new job:start', () => {
  const bus = new EngineEventBus()
  let state: EngineEventSubscriptionState = { ...INITIAL_ENGINE_EVENT_STATE }

  const unsubscribe = subscribeToEngineEvents(bus, nextState => {
    state = nextState
  })

  bus.emit('job:error', { error: 'Old failure' })
  assert.equal(state.lastError, 'Old failure')

  bus.emit('job:start', {
    profile: mockProfile,
    choice: 'photos',
    outputDir: '/downloads/test',
  })

  assert.equal(state.isDownloading, true)
  assert.equal(state.lastError, undefined)
  assert.equal(state.progress, undefined)
  assert.equal(state.lastResult, undefined)

  unsubscribe()
})

test('subscribeToEngineEvents properly cleans up all listeners on unsubscribe', () => {
  const bus = new EngineEventBus()
  let callCount = 0

  const unsubscribe = subscribeToEngineEvents(bus, () => {
    callCount++
  })

  bus.emit('job:start', {
    profile: mockProfile,
    choice: 'photos',
    outputDir: '/downloads/test',
  })
  assert.equal(callCount, 1)

  unsubscribe()

  // Subsequent events should not trigger onChange
  bus.emit('job:progress', {
    job: 'Photos',
    downloadedCount: 1,
    skippedCount: 0,
    statusText: 'test',
  })
  bus.emit('job:error', { error: 'ignored error' })
  bus.emit('job:complete', {
    result: {
      success: true,
      downloadedCount: 1,
      skippedCount: 0,
      errors: [],
      outputDir: '/test',
    },
  })
  bus.emit('job:start', {
    profile: mockProfile,
    choice: 'videos',
    outputDir: '/test',
  })

  assert.equal(callCount, 1)
})
