import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { MediaLedger } from './engines/storage/ledger.js'
import { dispatchPull } from './pull.js'

test('dispatchPull runs sequentially across tracked profiles and aggregates results', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-pull-test-'))
  const dbFile = path.join(tmpDir, 'test-pull.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const dirA = path.join(tmpDir, 'instagram', 'creator_a')
    const dirB = path.join(tmpDir, 'tiktok', 'creator_b')
    await fsPromises.mkdir(dirA, { recursive: true })
    await fsPromises.mkdir(dirB, { recursive: true })

    ledger.trackProfile({
      platform: 'instagram',
      username: 'creator_a',
      profileUrl: 'https://instagram.com/creator_a',
      targetDir: dirA,
      choice: 'photos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 10,
    })

    ledger.trackProfile({
      platform: 'tiktok',
      username: 'creator_b',
      profileUrl: 'https://tiktok.com/@creator_b',
      targetDir: dirB,
      choice: 'videos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 5,
    })

    const started: string[] = []
    const completed: string[] = []

    const summary = await dispatchPull({
      ledger,
      minDelayMs: 10,
      maxDelayMs: 20,
      runnerOverrides: {
        nativeRunner: async (subDir) => {
          return { success: true, downloaded: 2, skipped: 1 }
        },
      },
      onProfileStart: (p) => started.push(p.username),
      onProfileComplete: (r) => completed.push(r.profile.username),
    })

    assert.equal(summary.total, 2)
    assert.equal(summary.succeeded, 2)
    assert.equal(summary.failed, 0)
    assert.equal(summary.totalDownloaded, 4)
    assert.equal(summary.totalSkipped, 2)
    assert.deepEqual(started, ['creator_a', 'creator_b'])
    assert.deepEqual(completed, ['creator_a', 'creator_b'])

    const updatedA = ledger.getTrackedProfile('instagram', 'creator_a')
    assert.ok(updatedA)
    assert.equal(updatedA.mediaCount, 12)
    assert.notEqual(updatedA.lastPulledAt, '2026-10-01T00:00:00Z')
    assert.equal(updatedA.status, 'ok')
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})

test('dispatchPull isolates errors on failing profile without halting subsequent accounts', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-pull-fail-'))
  const dbFile = path.join(tmpDir, 'test-pull-fail.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const dirErr = path.join(tmpDir, 'instagram', 'private_user')
    const dirOk = path.join(tmpDir, 'instagram', 'public_user')
    await fsPromises.mkdir(dirErr, { recursive: true })
    await fsPromises.mkdir(dirOk, { recursive: true })

    ledger.trackProfile({
      platform: 'instagram',
      username: 'private_user',
      profileUrl: 'https://instagram.com/private_user',
      targetDir: dirErr,
      choice: 'photos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 0,
    })

    ledger.trackProfile({
      platform: 'instagram',
      username: 'public_user',
      profileUrl: 'https://instagram.com/public_user',
      targetDir: dirOk,
      choice: 'photos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 3,
    })

    const summary = await dispatchPull({
      ledger,
      minDelayMs: 5,
      maxDelayMs: 10,
      runnerOverrides: {
        nativeRunner: async () => {
          // Check who is being downloaded based on mock state
          if (ledger.getTrackedProfile('instagram', 'private_user')?.status !== 'error') {
            return { success: false, downloaded: 0, skipped: 0, error: 'Account is private' }
          }
          return { success: true, downloaded: 1, skipped: 0 }
        },
      },
    })

    assert.equal(summary.total, 2)
    assert.equal(summary.succeeded, 1)
    assert.equal(summary.failed, 1)
    assert.equal(summary.totalDownloaded, 1)

    const privateRec = ledger.getTrackedProfile('instagram', 'private_user')
    assert.equal(privateRec?.status, 'error')

    const publicRec = ledger.getTrackedProfile('instagram', 'public_user')
    assert.equal(publicRec?.status, 'ok')
    assert.equal(publicRec?.mediaCount, 4)
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})

test('dispatchPull recreates missing target directory in default download location', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-pull-mkdir-'))
  const dbFile = path.join(tmpDir, 'test-pull-mkdir.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const nonExistentDir = path.join(tmpDir, 'deleted_folder', 'creator_deleted')

    ledger.trackProfile({
      platform: 'x',
      username: 'recreated_user',
      profileUrl: 'https://x.com/recreated_user',
      targetDir: nonExistentDir,
      choice: 'photos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 1,
    })

    const summary = await dispatchPull({
      ledger,
      outputDir: tmpDir,
      minDelayMs: 5,
      maxDelayMs: 10,
      runnerOverrides: {
        nativeRunner: async () => {
          return { success: true, downloaded: 1, skipped: 0 }
        },
      },
    })

    assert.equal(summary.total, 1)
    assert.equal(summary.succeeded, 1)
    assert.ok(fs.existsSync(summary.items[0]!.targetDir), 'Recreated target dir should exist on disk')
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})

test('dispatchPull filters by specific username target', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-pull-filter-'))
  const dbFile = path.join(tmpDir, 'test-pull-filter.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const dir1 = path.join(tmpDir, 'user1')
    const dir2 = path.join(tmpDir, 'user2')
    await fsPromises.mkdir(dir1, { recursive: true })
    await fsPromises.mkdir(dir2, { recursive: true })

    ledger.trackProfile({
      platform: 'instagram',
      username: 'user_one',
      profileUrl: 'https://instagram.com/user_one',
      targetDir: dir1,
      choice: 'photos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 2,
    })

    ledger.trackProfile({
      platform: 'instagram',
      username: 'user_two',
      profileUrl: 'https://instagram.com/user_two',
      targetDir: dir2,
      choice: 'photos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 4,
    })

    const summary = await dispatchPull({
      ledger,
      target: 'user_two',
      minDelayMs: 5,
      maxDelayMs: 10,
      runnerOverrides: {
        nativeRunner: async () => {
          return { success: true, downloaded: 1, skipped: 0 }
        },
      },
    })

    assert.equal(summary.total, 1)
    assert.equal(summary.succeeded, 1)
    assert.equal(summary.items[0]?.profile.username, 'user_two')
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})

test('dispatchPull prioritizes explicit options.outputDir even when original targetDir exists', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-pull-outdir-'))
  const dbFile = path.join(tmpDir, 'test-pull-outdir.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const existingDefaultDir = path.join(tmpDir, 'existing_default')
    const customOutputDir = path.join(tmpDir, 'custom_override_dir')
    await fsPromises.mkdir(existingDefaultDir, { recursive: true })

    ledger.trackProfile({
      platform: 'instagram',
      username: 'outdir_user',
      profileUrl: 'https://instagram.com/outdir_user',
      targetDir: existingDefaultDir,
      choice: 'photos',
      lastPulledAt: '2026-10-01T00:00:00Z',
      mediaCount: 1,
    })

    let capturedOutputDir: string | undefined
    const summary = await dispatchPull({
      ledger,
      outputDir: customOutputDir,
      minDelayMs: 5,
      maxDelayMs: 10,
      runnerOverrides: {
        nativeRunner: async () => {
          return { success: true, downloaded: 1, skipped: 0 }
        },
      },
    })

    assert.equal(summary.total, 1)
    assert.ok(summary.items[0]?.targetDir.startsWith(customOutputDir), `Expected targetDir to start with ${customOutputDir}, got ${summary.items[0]?.targetDir}`)
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})

