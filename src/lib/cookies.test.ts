import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {findCookieFile, createSafeCookieCopy, detectAvailableCookies, CANDIDATE_DIRS} from './cookies.js'

test('CANDIDATE_DIRS contains no duplicate paths', () => {
  const normalized = CANDIDATE_DIRS.map(d => path.normalize(d).toLowerCase())
  const unique = new Set(normalized)
  assert.equal(normalized.length, unique.size, 'CANDIDATE_DIRS should not contain duplicates')
})

test('CANDIDATE_DIRS does not contain machine-specific hardcoded paths', () => {
  for (const dir of CANDIDATE_DIRS) {
    assert.ok(!/^[a-zA-Z]:[\\\/]Nami/i.test(dir), `CANDIDATE_DIRS should not contain machine-specific path: ${dir}`)
  }
})

test('findCookieFile respects OPEN_NAMI_COOKIES_DIR environment variable', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cookie-test-'))
  const cookieFile = path.join(tmpDir, 'instagram.com_cookies.txt')
  await fsPromises.writeFile(cookieFile, '# Netscape HTTP Cookie File\n.instagram.com TRUE / TRUE 1700000000 sessionid 12345\n')

  const prevEnv = process.env.OPEN_NAMI_COOKIES_DIR
  try {
    process.env.OPEN_NAMI_COOKIES_DIR = tmpDir
    const found = findCookieFile('instagram')
    assert.equal(found, cookieFile)
  } finally {
    if (prevEnv !== undefined) {
      process.env.OPEN_NAMI_COOKIES_DIR = prevEnv
    } else {
      delete process.env.OPEN_NAMI_COOKIES_DIR
    }
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('createSafeCookieCopy creates temporary copy with secure permissions and cleans up', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cookie-test-copy-'))
  const srcCookie = path.join(tmpDir, 'test_cookies.txt')
  await fsPromises.writeFile(srcCookie, '# Sensitive cookie data\nsessionid=secret123\n')

  const resolved = await createSafeCookieCopy(srcCookie)
  assert.equal(resolved.isTemporary, true)
  assert.ok(fs.existsSync(resolved.filePath))

  if (process.platform !== 'win32') {
    const stats = await fsPromises.stat(resolved.filePath)
    assert.equal(stats.mode & 0o777, 0o600, 'Cookie copy must have 0600 mode on POSIX')
  }

  await resolved.cleanup()
  assert.ok(!fs.existsSync(resolved.filePath), 'Cookie copy must be unlinked after cleanup')
  await fsPromises.rm(tmpDir, {recursive: true, force: true})
})

test('detectAvailableCookies identifies valid cookie files in directory', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-cookie-detect-'))
  await fsPromises.writeFile(path.join(tmpDir, 'instagram.com_cookies.txt'), '# Netscape HTTP Cookie File\nvalid-cookie-line-here-longer-than-20\n')
  await fsPromises.writeFile(path.join(tmpDir, 'tiktok.com_cookies.txt'), '# Netscape HTTP Cookie File\nvalid-cookie-line-here-longer-than-20\n')

  try {
    const detected = detectAvailableCookies(tmpDir)
    assert.deepEqual(detected.sort(), ['instagram', 'tiktok'].sort())
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})
