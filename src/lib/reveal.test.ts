import test from 'node:test'
import assert from 'node:assert/strict'
import {buildOpenBrowserCommand, getRevealCommand} from './reveal.js'

test('buildOpenBrowserCommand rejects non-http protocols', () => {
  assert.equal(buildOpenBrowserCommand('javascript:alert(1)', 'win32'), null)
  assert.equal(buildOpenBrowserCommand('file:///C:/Windows/system32/cmd.exe', 'win32'), null)
  assert.equal(buildOpenBrowserCommand('not-a-url', 'win32'), null)
})

test('buildOpenBrowserCommand uses rundll32 on Windows to avoid cmd.exe & separator issues', () => {
  const cmd = buildOpenBrowserCommand('https://example.com/test?a=1&b=2', 'win32')
  assert.ok(cmd)
  assert.equal(cmd.command, 'rundll32.exe')
  assert.deepEqual(cmd.args, ['url.dll,FileProtocolHandler', 'https://example.com/test?a=1&b=2'])
})

test('buildOpenBrowserCommand formats darwin and linux commands safely', () => {
  const darwin = buildOpenBrowserCommand('https://example.com', 'darwin')
  assert.ok(darwin)
  assert.equal(darwin.command, 'open')
  assert.deepEqual(darwin.args, ['https://example.com'])

  const linux = buildOpenBrowserCommand('https://example.com', 'linux')
  assert.ok(linux)
  assert.equal(linux.command, 'xdg-open')
  assert.deepEqual(linux.args, ['https://example.com'])
})

test('getRevealCommand selects file or dir safely on Windows and macOS', () => {
  const winDir = getRevealCommand('C:\\Users\\test', 'win32', true)
  assert.equal(winDir.command, 'explorer.exe')
  assert.deepEqual(winDir.args, ['C:\\Users\\test'])

  const winFile = getRevealCommand('C:\\Users\\test\\file.txt', 'win32', false)
  assert.equal(winFile.command, 'explorer.exe')
  assert.deepEqual(winFile.args, ['/select,C:\\Users\\test\\file.txt'])
})
