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

// Ensure unit tests never write downloads to the user's real home/downloads directory
const testDownloadsDir = join(tmpdir(), 'open-nami-test-downloads')
process.env.OPEN_NAMI_DIR = testDownloadsDir

const res = spawnSync(cmd, ['tsx', '--test', ...files], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    OPEN_NAMI_DIR: testDownloadsDir,
  },
})
process.exit(res.status ?? 1)
