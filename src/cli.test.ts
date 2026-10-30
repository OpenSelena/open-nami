import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { MediaLedger } from './lib/engines/storage/ledger.js'
import {
  formatTrackedProfilesTable,
  handleListCommand,
  handleUntrackCommand,
  handlePullCli,
} from './cli.js'

test('formatTrackedProfilesTable renders empty notice when no profiles exist', () => {
  const output = formatTrackedProfilesTable([])
  assert.ok(output.includes('No tracked profiles found'))
})

test('formatTrackedProfilesTable formats tracked profiles in a clean tabular view', () => {
  const output = formatTrackedProfilesTable([
    {
      platform: 'instagram',
      username: 'selenagomez',
      profileUrl: 'https://instagram.com/selenagomez',
      targetDir: '/downloads/instagram/selenagomez',
      choice: 'photos',
      lastPulledAt: '2026-10-30T10:00:00Z',
      mediaCount: 42,
      status: 'ok',
    },
    {
      platform: 'tiktok',
      username: 'charlidamelio',
      profileUrl: 'https://tiktok.com/@charlidamelio',
      targetDir: '/downloads/tiktok/charlidamelio',
      choice: 'videos',
      lastPulledAt: '2026-10-29T18:00:00Z',
      mediaCount: 18,
    },
  ])

  assert.ok(output.includes('selenagomez'))
  assert.ok(output.includes('charlidamelio'))
  assert.ok(output.includes('instagram'))
  assert.ok(output.includes('tiktok'))
  assert.ok(output.includes('42'))
})

test('handleUntrackCommand removes profile from registry and strictly preserves files on disk', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cli-untrack-'))
  const dbFile = path.join(tmpDir, 'test-untrack.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const profileDir = path.join(tmpDir, 'instagram', 'creator_to_untrack')
    await fsPromises.mkdir(profileDir, { recursive: true })
    const sampleFile = path.join(profileDir, 'photo_1.jpg')
    await fsPromises.writeFile(sampleFile, 'image bytes', 'utf-8')

    ledger.trackProfile({
      platform: 'instagram',
      username: 'creator_to_untrack',
      profileUrl: 'https://instagram.com/creator_to_untrack',
      targetDir: profileDir,
      choice: 'photos',
      lastPulledAt: '2026-10-30T00:00:00Z',
      mediaCount: 1,
    })

    assert.equal(ledger.getTrackedProfiles().length, 1)

    // Test missing argument
    const emptyRes = handleUntrackCommand(undefined, ledger)
    assert.equal(emptyRes.success, false)
    assert.ok(emptyRes.message.includes('provide a username'))

    // Test non-existent profile
    const nonExistentRes = handleUntrackCommand('nobody', ledger)
    assert.equal(nonExistentRes.success, false)
    assert.ok(nonExistentRes.message.includes('not in the tracked registry'))

    // Test successful untrack
    const okRes = handleUntrackCommand('creator_to_untrack', ledger)
    assert.equal(okRes.success, true)
    assert.ok(okRes.message.includes('Untracked @creator_to_untrack'))
    assert.ok(okRes.message.includes('preserved on disk'))

    // Verify registry is empty
    assert.equal(ledger.getTrackedProfiles().length, 0)

    // Verify file still exists on disk
    assert.ok(fs.existsSync(sampleFile), 'Downloaded media file MUST remain untouched on disk')
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})

test('handleListCommand formats tracked profiles from ledger', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cli-list-'))
  const dbFile = path.join(tmpDir, 'test-list.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const emptyOut = handleListCommand(ledger)
    assert.ok(emptyOut.includes('No tracked profiles found'))

    ledger.trackProfile({
      platform: 'instagram',
      username: 'samplecreator',
      profileUrl: 'https://instagram.com/samplecreator',
      targetDir: '/tmp/samplecreator',
      choice: 'photos',
      lastPulledAt: '2026-10-30T10:00:00Z',
      mediaCount: 12,
    })

    const populatedOut = handleListCommand(ledger)
    assert.ok(populatedOut.includes('samplecreator'))
    assert.ok(populatedOut.includes('instagram'))
    assert.ok(populatedOut.includes('12'))
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})

test('handlePullCli handles empty registry with code 0', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cli-pull-'))
  const dbFile = path.join(tmpDir, 'test-pull.db')
  const ledger = new MediaLedger(dbFile)

  try {
    const code = await handlePullCli([], ledger)
    assert.equal(code, 0)
  } finally {
    ledger.close()
    await fsPromises.rm(tmpDir, { recursive: true, force: true })
  }
})
