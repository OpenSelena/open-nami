import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TaskManager } from './task-manager.js'
import { EngineEventBus } from './event-bus.js'
import { MediaLedger } from '../storage/ledger.js'

test('TaskManager executes job and emits events through EventBus', async () => {
  const bus = new EngineEventBus()
  const ledger = new MediaLedger(':memory:')
  const manager = new TaskManager(bus, ledger)

  let started = false
  bus.on('job:start', () => { started = true })

  const result = await manager.execute({
    profile: { platform: 'instagram', username: 'testuser', cleanUrl: 'https://instagram.com/testuser', rawInput: 'testuser' },
    choice: 'photos',
    runnerOverrides: {
      nativeRunner: async () => ({ success: true, downloaded: 2, skipped: 0 }),
    },
  })

  assert.equal(started, true)
  assert.equal(result.downloadedCount, 2)
  ledger.close()
})

test('TaskManager initializes with default instances when none provided', () => {
  const manager = new TaskManager()
  assert.ok(manager.events instanceof EngineEventBus)
  assert.ok(manager.ledger instanceof MediaLedger)
  manager.ledger.close()
})

test('TaskManager emits job:complete event with accurate EngineResult', async () => {
  const bus = new EngineEventBus()
  const ledger = new MediaLedger(':memory:')
  const manager = new TaskManager(bus, ledger)

  let completePayload: any = null
  bus.on('job:complete', (payload) => {
    completePayload = payload
  })

  const result = await manager.execute({
    profile: { platform: 'tiktok', username: 'videocreator', cleanUrl: 'https://tiktok.com/@videocreator', rawInput: 'videocreator' },
    choice: 'videos',
    runnerOverrides: {
      nativeRunner: async () => ({ success: true, downloaded: 5, skipped: 1 }),
    },
  })

  assert.ok(completePayload)
  assert.equal(completePayload.result.downloadedCount, 5)
  assert.equal(completePayload.result.skippedCount, 1)
  assert.equal(result.success, true)
  ledger.close()
})

test('TaskManager captures runner errors properly', async () => {
  const bus = new EngineEventBus()
  const ledger = new MediaLedger(':memory:')
  const manager = new TaskManager(bus, ledger)

  const result = await manager.execute({
    profile: { platform: 'x', username: 'elonmusk', cleanUrl: 'https://x.com/elonmusk', rawInput: 'elonmusk' },
    choice: 'photos',
    runnerOverrides: {
      nativeRunner: async () => ({ success: false, downloaded: 0, skipped: 0, error: 'Network timeout' }),
    },
  })

  assert.equal(result.success, false)
  assert.deepEqual(result.errors, ['Network timeout'])
  ledger.close()
})
