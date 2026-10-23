import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import fsPromises from 'node:fs/promises'
import {
  loadCheckpoint,
  saveCheckpoint,
  clearCheckpoint,
  CHECKPOINT_FILENAME,
  type ExtractorCheckpoint,
} from './checkpoint.js'

test('loadCheckpoint returns null when checkpoint does not exist or is corrupt', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cp-test-'))
  try {
    const res = await loadCheckpoint(tmpDir)
    assert.equal(res, null)

    // Corrupt JSON
    await fsPromises.writeFile(path.join(tmpDir, CHECKPOINT_FILENAME), 'invalid json', 'utf-8')
    const corruptRes = await loadCheckpoint(tmpDir)
    assert.equal(corruptRes, null)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('saveCheckpoint atomically persists checkpoint and loadCheckpoint retrieves it', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cp-test-'))
  try {
    const checkpoint: ExtractorCheckpoint = {
      version: 1,
      platform: 'instagram',
      username: 'test_user',
      updatedAt: new Date().toISOString(),
      cursors: {
        timeline: 'QVFBc3RldW5pZDEyMw==',
        reels: '12345678',
      },
      completed: false,
    }

    await saveCheckpoint(tmpDir, checkpoint)
    const loaded = await loadCheckpoint(tmpDir)

    assert.ok(loaded !== null)
    assert.equal(loaded.platform, 'instagram')
    assert.equal(loaded.username, 'test_user')
    assert.equal(loaded.cursors.timeline, 'QVFBc3RldW5pZDEyMw==')
    assert.equal(loaded.cursors.reels, '12345678')
    assert.equal(loaded.completed, false)

    // Clear checkpoint
    await clearCheckpoint(tmpDir)
    const afterClear = await loadCheckpoint(tmpDir)
    assert.equal(afterClear, null)
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})
