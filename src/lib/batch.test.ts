import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {parseBatchContent, runBatchQueue} from './batch.js'

test('parseBatchContent ignores comments and empty lines and strips trailing comments', () => {
  const fileContent = `
    # List of social media targets
    https://www.instagram.com/user_a/

    // TikTok influencer
    tiktok:user_b # backup account

    x:user_c // twitter
    @user_d

    # Finished
  `
  const lines = parseBatchContent(fileContent)
  assert.deepEqual(lines, [
    'https://www.instagram.com/user_a/',
    'tiktok:user_b',
    'x:user_c',
    '@user_d',
  ])
})

test('runBatchQueue processes accounts sequentially and tallies results', async () => {
  const lines = [
    'https://www.instagram.com/user1/',
    'https://www.instagram.com/user2/',
    'invalid_target_missing_platform',
  ]

  const started: string[] = []
  const completed: string[] = []

  const result = await runBatchQueue({
    lines,
    choice: 'photos',
    minDelayMs: 10,
    maxDelayMs: 20,
    runnerOverrides: {
      nativeRunner: async () => {
        return {success: true, downloaded: 4, skipped: 1}
      },
    },
    onAccountStart: (item) => {
      started.push(item.profile.username)
    },
    onAccountComplete: (item) => {
      completed.push(item.profile.username)
    },
  })

  assert.equal(result.total, 3)
  assert.equal(result.succeeded, 2)
  assert.equal(result.failed, 1)
  assert.equal(result.totalDownloaded, 8)
  assert.equal(result.totalSkipped, 2)
  assert.deepEqual(started, ['user1', 'user2'])
  assert.deepEqual(completed, ['user1', 'user2'])
  assert.equal(result.items[2]!.status, 'failed')
})

test('runBatchQueue resolves bare usernames when defaultPlatform is provided', async () => {
  const lines = [
    '@selenagomez',
    'cristiano',
    'https://www.tiktok.com/@mrbeast',
  ]

  const profiles: Array<{username: string; platform: string; cleanUrl: string}> = []

  const result = await runBatchQueue({
    lines,
    choice: 'photos',
    defaultPlatform: 'instagram',
    minDelayMs: 10,
    maxDelayMs: 20,
    runnerOverrides: {
      nativeRunner: async () => {
        return {success: true, downloaded: 2, skipped: 0}
      },
    },
    onAccountStart: (item) => {
      profiles.push({
        username: item.profile.username,
        platform: item.profile.platform,
        cleanUrl: item.profile.cleanUrl,
      })
    },
  })

  assert.equal(result.total, 3)
  assert.equal(result.succeeded, 3)
  assert.equal(result.failed, 0)
  assert.deepEqual(profiles, [
    {
      username: 'selenagomez',
      platform: 'instagram',
      cleanUrl: 'https://www.instagram.com/selenagomez/',
    },
    {
      username: 'cristiano',
      platform: 'instagram',
      cleanUrl: 'https://www.instagram.com/cristiano/',
    },
    {
      username: 'mrbeast',
      platform: 'tiktok',
      cleanUrl: 'https://www.tiktok.com/@mrbeast',
    },
  ])
})

test('runBatchQueue halts immediately when AbortSignal is triggered', async () => {
  const lines = [
    'https://www.instagram.com/user1/',
    'https://www.instagram.com/user2/',
    'https://www.instagram.com/user3/',
  ]

  const controller = new AbortController()
  let runs = 0

  const result = await runBatchQueue({
    lines,
    choice: 'photos',
    signal: controller.signal,
    minDelayMs: 10,
    maxDelayMs: 20,
    runnerOverrides: {
      nativeRunner: async () => {
        runs++
        if (runs === 1) {
          controller.abort()
        }
        return {success: true, downloaded: 1, skipped: 0}
      },
    },
  })

  // Only the first account ran before abort stopped the queue
  assert.equal(runs, 1)
  assert.equal(result.succeeded, 1)
})
