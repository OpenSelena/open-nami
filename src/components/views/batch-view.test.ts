import test from 'node:test'
import assert from 'node:assert/strict'
import {BatchView} from './batch-view.js'

test('BatchView is exported as a function component', () => {
  assert.equal(typeof BatchView, 'function')
})

test('extractBatchLinesFromInput ignores comments and trailing comment tags', async () => {
  const {extractBatchLinesFromInput} = await import('./batch-view.js')
  const input = `
    # Recommended creators
    https://instagram.com/alice # fashion model
    https://tiktok.com/@bob // comedy
    charlidamelio
  `
  const lines = extractBatchLinesFromInput(input)
  assert.deepEqual(lines, [
    'https://instagram.com/alice',
    'https://tiktok.com/@bob',
    'charlidamelio',
  ])
})

