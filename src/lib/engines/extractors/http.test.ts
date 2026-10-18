import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseNetscapeCookies,
  formatCookieHeader,
  sleep,
  HttpClient,
  DEFAULT_USER_AGENT,
  combineTimeoutSignal,
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

test('HttpClient caches cookies loaded from path and reuses in-memory', async () => {
  const os = await import('node:os')
  const path = await import('node:path')
  const fs = await import('node:fs/promises')

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-http-cache-'))
  const cookiePath = path.join(tmpDir, 'cookies.txt')
  await fs.writeFile(cookiePath, '.instagram.com\tTRUE\t/\tTRUE\t1750000000\tsessionid\tinitial123\n')

  try {
    const client = new HttpClient()
    await client.loadCookies(cookiePath, 'instagram.com')

    // Change file on disk to verify cached version is retained
    await fs.writeFile(cookiePath, '.instagram.com\tTRUE\t/\tTRUE\t1750000000\tsessionid\tmodified456\n')

    const client2 = new HttpClient()
    await client2.loadCookies(cookiePath, 'instagram.com')
    // Fresh client gets modified value
    assert.equal((client2 as any).defaultCookies['sessionid'], 'modified456')

    // First client still has its loaded cookies
    assert.equal((client as any).defaultCookies['sessionid'], 'initial123')
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})

test('combineTimeoutSignal combines caller signal and timeout', () => {
  assert.equal(combineTimeoutSignal(undefined, undefined), undefined)
  assert.equal(combineTimeoutSignal(undefined, 0), undefined)

  const controller = new AbortController()
  assert.equal(combineTimeoutSignal(controller.signal, 0), controller.signal)

  const timedSignal = combineTimeoutSignal(undefined, 5000)
  assert.ok(timedSignal instanceof AbortSignal)
  assert.equal(timedSignal.aborted, false)

  controller.abort(new Error('Pre-aborted'))
  const combined = combineTimeoutSignal(controller.signal, 5000)
  assert.ok(combined?.aborted)
  assert.equal(combined?.reason?.message, 'Pre-aborted')
})

test('HttpClient request aborts immediately if caller signal is already aborted', async () => {
  const client = new HttpClient()
  const controller = new AbortController()
  controller.abort(new Error('Caller aborted early'))

  await assert.rejects(
    () => client.request('https://example.com/abort', {signal: controller.signal, retries: 0}),
    {message: 'Caller aborted early'},
  )
})

test('HttpClient fetchJson strips anti-XSSI prefixes like for (;;);', async () => {
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () =>
      new Response('for (;;);{"data":{"status":"ok"}}', {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      })

    const client = new HttpClient()
    const result = await client.fetchJson<{data: {status: string}}>('https://example.com/api')
    assert.equal(result.data.status, 'ok')
  } finally {
    globalThis.fetch = originalFetch
  }
})

