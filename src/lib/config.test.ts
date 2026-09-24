import test from 'node:test'
import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {loadConfig, saveConfig, type AppConfig} from './config.js'

test('loadConfig returns empty object when config file does not exist', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-config-test-'))
  const testConfigPath = path.join(tmpDir, 'nonexistent-config.json')

  try {
    const config = loadConfig(testConfigPath)
    assert.deepEqual(config, {})
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('saveConfig persists values and loadConfig retrieves them', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-config-test-'))
  const testConfigPath = path.join(tmpDir, 'nested', 'config.json')

  const toSave: AppConfig = {
    cookiesDir: 'F:/Nami/cookies',
    downloadDir: 'X:/Downloads/Open Nami',
  }

  try {
    saveConfig(toSave, testConfigPath)
    const loaded = loadConfig(testConfigPath)
    assert.equal(loaded.cookiesDir, 'F:/Nami/cookies')
    assert.equal(loaded.downloadDir, 'X:/Downloads/Open Nami')
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})

test('loadConfig handles corrupt JSON gracefully', async () => {
  const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'nami-config-test-'))
  const testConfigPath = path.join(tmpDir, 'corrupt.json')
  await fsPromises.writeFile(testConfigPath, '{ bad-json-content: ')

  try {
    const loaded = loadConfig(testConfigPath)
    assert.deepEqual(loaded, {})
  } finally {
    await fsPromises.rm(tmpDir, {recursive: true, force: true})
  }
})
