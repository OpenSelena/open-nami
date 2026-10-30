import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

function findTests(dir) {
  let results = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...findTests(full))
    } else if (entry.name.endsWith('.test.ts')) {
      results.push(full)
    }
  }
  return results
}

const files = findTests('src')
const isWindows = process.platform === 'win32'
const cmd = isWindows ? 'npx.cmd' : 'npx'

// Ensure unit tests never write downloads or database records to the user's real home directory
const testRunId = Date.now()
const testDownloadsDir = join(tmpdir(), `open-nami-test-downloads-${testRunId}`)
const testAnnouncementCache = join(tmpdir(), `open-nami-test-announcements-${testRunId}.json`)

process.env.NODE_ENV = 'test'
process.env.OPEN_NAMI_TEST = '1'
process.env.OPEN_NAMI_DIR = testDownloadsDir
process.env.OPEN_NAMI_DB = ':memory:'
process.env.OPEN_NAMI_ANNOUNCEMENT_CACHE = testAnnouncementCache

const res = spawnSync(cmd, ['tsx', '--test', ...files], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    OPEN_NAMI_TEST: '1',
    OPEN_NAMI_DIR: testDownloadsDir,
    OPEN_NAMI_DB: ':memory:',
    OPEN_NAMI_ANNOUNCEMENT_CACHE: testAnnouncementCache,
  },
})
process.exit(res.status ?? 1)
