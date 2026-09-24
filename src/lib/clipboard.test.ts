import test from 'node:test'
import assert from 'node:assert/strict'
import {readClipboard} from './clipboard.js'

test('readClipboard returns trimmed output on successful command execution', () => {
  const mockExec: any = (cmd: string, args: string[], options: any) => {
    assert.ok(options.timeout >= 1000, 'timeout should be at least 1000ms for slow shell startups')
    return '  https://instagram.com/testuser  \r\n'
  }

  const result = readClipboard(mockExec)
  assert.equal(result, 'https://instagram.com/testuser')
})

test('readClipboard returns empty string when all clipboard commands fail', () => {
  const failingExec: any = () => {
    throw new Error('Command failed')
  }

  const result = readClipboard(failingExec)
  assert.equal(result, '')
})
