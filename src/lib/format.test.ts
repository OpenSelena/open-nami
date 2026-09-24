import assert from 'node:assert/strict'
import test from 'node:test'
import {formatEngineError, cleanInlineError, classifyEngineError} from './format.js'

test('formatEngineError formats not found errors with helpful hint', () => {
  const err = '[Highlights] [instagram][error] NotFoundError: Requested user could not be found'
  const res = formatEngineError(err)
  assert.equal(res.message, 'profile or user could not be found')
  assert.ok(res.hint?.includes('spelling'))
})

test('formatEngineError formats login/auth required errors with cookies hint', () => {
  const err = '[instagram][error] HTTP redirect to login page (https://www.instagram.com/accounts/login/)'
  const res = formatEngineError(err)
  assert.equal(res.message, 'login required to access this media')
  assert.ok(res.hint?.includes('cookies'))
})

test('formatEngineError formats 429 rate limit errors with cooldown hint', () => {
  const err = '429 Too Many Requests'
  const res = formatEngineError(err)
  assert.equal(res.message, 'rate limit reached (HTTP 429)')
  assert.ok(res.hint?.includes('throttling'))
})

test('cleanInlineError removes raw tags and formats concise inline message', () => {
  const err = '[Highlights] [instagram][error] NotFoundError: Requested user could not be found'
  const cleaned = cleanInlineError(err)
  assert.equal(cleaned, 'highlights: not found or has no content')
})

test('cleanInlineError handles login required with job prefix', () => {
  const err = '[Stories] [instagram][error] AuthRequired: login cookies required'
  const cleaned = cleanInlineError(err)
  assert.equal(cleaned, 'stories: login cookies required')
})

test('classifyEngineError categorizes private accounts accurately', () => {
  const res = classifyEngineError('This account is private')
  assert.equal(res.category, 'private_account')
  assert.equal(res.message, 'this account is private')
  assert.equal(res.inlineText, 'account is private')
})
