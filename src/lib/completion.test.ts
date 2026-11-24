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
  assert.strictEqual(generateCompletion('pwsh'), generateCompletion('powershell'))
  assert.throws(() => generateCompletion('tcsh'), /Unsupported shell/)
})

test('generateCompletion includes all subcommands, options, and platform choices for every shell', () => {
  const subcommands = ['pull', 'sync', 'list', 'track', 'untrack']
  const longFlags = [
    '--help',
    '--version',
    '--doctor',
    '--output',
    '--watch',
    '--batch',
    '--update',
    '--update-ytdlp',
    '--update-gallerydl',
    '--theme',
    '--photos',
    '--videos',
    '--stories',
    '--highlights',
    '--all',
    '--since',
    '--until',
    '--limit',
    '--resume',
    '--write-metadata',
    '--no-track',
    '--platform',
    '--completion',
  ]
  const shortFlags: Record<(typeof SUPPORTED_SHELLS)[number], string[]> = {
    bash: ['-h', '-v', '-o', '-w', '-b', '-U', '-l', '-p'],
    zsh: ['-h', '-v', '-o', '-w', '-b', '-U', '-l', '-p'],
    fish: ['-s h', '-s v', '-s o', '-s w', '-s b', '-s U', '-s l', '-s p'],
    powershell: ['-h', '-v', '-o', '-w', '-b', '-U', '-l', '-p'],
  }

  for (const shell of SUPPORTED_SHELLS) {
    const script = generateCompletion(shell)

    for (const subcommand of subcommands) {
      assert.match(script, new RegExp(`\\b${subcommand}\\b`), `${shell} should include subcommand ${subcommand}`)
    }

    for (const flag of longFlags) {
      const expected = shell === 'fish' ? `-l ${flag.slice(2)}` : flag
      assert.ok(script.includes(expected), `${shell} should include flag ${flag}`)
    }

    for (const shortFlag of shortFlags[shell]) {
      assert.ok(script.includes(shortFlag), `${shell} should include short flag ${shortFlag}`)
    }

    assert.match(
      script,
      /instagram['",\s]+tiktok['",\s]+facebook['",\s]+x/,
      `${shell} should include platform choices`,
    )
    assert.match(
      script,
      /auto['",\s]+light['",\s]+dark/,
      `${shell} should include theme choices`,
    )
  }
})
