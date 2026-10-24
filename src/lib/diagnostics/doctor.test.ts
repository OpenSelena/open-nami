import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runDoctor } from './doctor.js'

test('runDoctor returns structured system diagnostics', async () => {
  const report = await runDoctor()
  assert.equal(typeof report.nodeVersion, 'string')
  assert.ok(report.nodeVersion.startsWith('v'))
  assert.equal(typeof report.storageOk, 'boolean')
  assert.equal(typeof report.binaries['yt-dlp'], 'boolean')
  assert.equal(typeof report.binaries['gallery-dl'], 'boolean')
  assert.equal(typeof report.binaries.ffmpeg, 'boolean')
  assert.equal(typeof report.cookies.instagram, 'boolean')
  assert.equal(typeof report.cookies.tiktok, 'boolean')
  assert.equal(typeof report.cookies.facebook, 'boolean')
  assert.equal(typeof report.cookies.x, 'boolean')
})

test('runDoctor respects custom binary checker options', async () => {
  const customChecker = async (bin: 'gallery-dl' | 'yt-dlp' | 'ffmpeg') => {
    return bin === 'ffmpeg'
  }

  const report = await runDoctor({ binaryChecker: customChecker })
  assert.equal(report.binaries['gallery-dl'], false)
  assert.equal(report.binaries['yt-dlp'], false)
  assert.equal(report.binaries.ffmpeg, true)
})

test('runDoctor detects cookies in custom directory', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nami-doc-cookie-test-'))
  try {
    fs.writeFileSync(path.join(tempDir, 'instagram.com_cookies.txt'), '# Netscape HTTP Cookie File\n.instagram.com TRUE / FALSE 0 sessionid test12345678901234567890')
    const report = await runDoctor({ cookiesDir: tempDir })
    assert.equal(report.cookies.instagram, true)
    assert.equal(report.cookies.tiktok, false)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('runDoctor handles storage write failure gracefully', async () => {
  // Pass an invalid / inaccessible storage directory
  const invalidDir = path.join(os.tmpdir(), 'non_existent_file_as_dir_' + Date.now(), 'sub')
  // We make a file at the parent path so mkdir will fail
  const blockerFile = path.join(os.tmpdir(), 'nami_blocker_' + Date.now())
  fs.writeFileSync(blockerFile, 'blocking file')
  try {
    const report = await runDoctor({ storageDir: path.join(blockerFile, 'child_dir') })
    assert.equal(report.storageOk, false)
  } finally {
    fs.rmSync(blockerFile, { force: true })
  }
})
