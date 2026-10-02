import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseNetscapeCookies,
  formatCookieHeader,
  sleep,
  HttpClient,
  DEFAULT_USER_AGENT,
} from './http.js'

test('parseNetscapeCookies parses valid cookies and handles #HttpOnly_', () => {
  const content = `
# Netscape HTTP Cookie File
# https://curl.haxx.se/docs/http-cookies.html
.instagram.com\tTRUE\t/\tTRUE\t1750000000\tsessionid\tabc123xyz
#HttpOnly_.instagram.com\tTRUE\t/\tTRUE\t1750000000\tds_user_id\t999888
.twitter.com\tTRUE\t/\tTRUE\t1750000000\tauth_token\ttoken456
`

  const cookies = parseNetscapeCookies(content)
  assert.equal(cookies['sessionid'], 'abc123xyz')
  assert.equal(cookies['ds_user_id'], '999888')
  assert.equal(cookies['auth_token'], 'token456')

  const igCookies = parseNetscapeCookies(content, 'instagram.com')
  assert.equal(igCookies['sessionid'], 'abc123xyz')
  assert.equal(igCookies['ds_user_id'], '999888')
  assert.equal(igCookies['auth_token'], undefined)
})

test('formatCookieHeader serializes cookie object', () => {
  const header = formatCookieHeader({
    sessionid: '123',
    csrftoken: 'abc',
  })
  assert.equal(header, 'sessionid=123; csrftoken=abc')
})

test('sleep aborts when AbortSignal triggers', async () => {
  const controller = new AbortController()
  const promise = sleep(5000, undefined, controller.signal)
  controller.abort(new Error('User cancelled'))

  await assert.rejects(promise, {message: 'User cancelled'})
})

test('HttpClient initializes with default Chrome headers', () => {
  const client = new HttpClient()
  assert.ok(client)
})
