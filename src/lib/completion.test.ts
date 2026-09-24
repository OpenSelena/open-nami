import {test} from 'node:test'
import assert from 'node:assert'
import {
  generateCompletion,
  normalizeShell,
  SUPPORTED_SHELLS,
} from './completion.js'

test('normalizeShell handles canonical and alias shells', () => {
  assert.strictEqual(normalizeShell('bash'), 'bash')
  assert.strictEqual(normalizeShell('zsh'), 'zsh')
  assert.strictEqual(normalizeShell('fish'), 'fish')
  assert.strictEqual(normalizeShell('powershell'), 'powershell')
  assert.strictEqual(normalizeShell('pwsh'), 'powershell')
  assert.strictEqual(normalizeShell('BASH'), 'bash')
  assert.strictEqual(normalizeShell('unknown'), undefined)
})

test('generateCompletion generates completion scripts for all 4 binary aliases', () => {
  for (const shell of SUPPORTED_SHELLS) {
    const script = generateCompletion(shell)
    assert.ok(script.includes('open-nami'), `${shell} should include open-nami`)
    assert.ok(script.includes('opennami'), `${shell} should include opennami`)
    assert.ok(script.includes('nami'), `${shell} should include nami`)
    assert.ok(script.includes('on'), `${shell} should include on`)
  }
})
