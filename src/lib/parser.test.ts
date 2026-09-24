import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseProfileInput,
  sanitizeUsername,
  isBareUsername,
  buildProfileUrl,
  buildCanonicalProfile,
} from './parser.js'

test('sanitizes usernames safely on Windows filesystem', () => {
  assert.equal(sanitizeUsername('user:name?*'), 'user_name__')
  assert.equal(sanitizeUsername('  .test.  '), 'test')
  assert.equal(sanitizeUsername('con'), '_con')
  assert.equal(sanitizeUsername('PRN'), '_PRN')
  assert.equal(sanitizeUsername('aux.json'), '_aux.json')
  assert.equal(sanitizeUsername('..'), 'unknown')
  assert.equal(sanitizeUsername('../../etc/passwd'), '_.._etc_passwd')
})

test('parses TikTok profile URLs', () => {
  const res = parseProfileInput('https://www.tiktok.com/@prasamshakarki6')
  assert.equal(res.platform, 'tiktok')
  assert.equal(res.username, 'prasamshakarki6')
  assert.equal(res.cleanUrl, 'https://www.tiktok.com/@prasamshakarki6')
})

test('parses Instagram profile URLs', () => {
  const res = parseProfileInput('https://www.instagram.com/therock/')
  assert.equal(res.platform, 'instagram')
  assert.equal(res.username, 'therock')
  assert.equal(res.cleanUrl, 'https://www.instagram.com/therock/')
})

test('parses Facebook profile URLs', () => {
  const res = parseProfileInput('https://www.facebook.com/zuck')
  assert.equal(res.platform, 'facebook')
  assert.equal(res.username, 'zuck')
  assert.equal(res.cleanUrl, 'https://www.facebook.com/zuck')

  const resId = parseProfileInput('https://www.facebook.com/profile.php?id=100084729182')
  assert.equal(resId.platform, 'facebook')
  assert.equal(resId.username, '100084729182')
})

test('parses X / Twitter profile URLs', () => {
  const res = parseProfileInput('https://x.com/elonmusk')
  assert.equal(res.platform, 'x')
  assert.equal(res.username, 'elonmusk')
  assert.equal(res.cleanUrl, 'https://x.com/elonmusk')
})

test('parses platform prefix shortcuts', () => {
  const ig = parseProfileInput('ig:therock')
  assert.equal(ig.platform, 'instagram')
  assert.equal(ig.username, 'therock')

  const tt = parseProfileInput('tt:@danceuser')
  assert.equal(tt.platform, 'tiktok')
  assert.equal(tt.username, 'danceuser')
})

test('isBareUsername accurately detects valid bare usernames', () => {
  assert.equal(isBareUsername('momo'), true)
  assert.equal(isBareUsername('@momo'), true)
  assert.equal(isBareUsername('unknown'), true)
  assert.equal(isBareUsername('@unknown'), true)
  assert.equal(isBareUsername('aux'), true)
  assert.equal(isBareUsername('con'), true)
  assert.equal(isBareUsername('  @user_name123  '), true)
  assert.equal(isBareUsername('john.doe-official'), true)
  assert.equal(isBareUsername('https://instagram.com/momo'), false)
  assert.equal(isBareUsername('ig:momo'), false)
  assert.equal(isBareUsername('https://example.com/user'), false)
  assert.equal(isBareUsername('hello world'), false)
  assert.equal(isBareUsername(''), false)
  assert.equal(isBareUsername('   '), false)
  assert.equal(isBareUsername('@'), false)
  assert.equal(isBareUsername('..'), false)
  assert.equal(isBareUsername('.'), false)
  assert.equal(isBareUsername('---'), false)
  assert.equal(isBareUsername('___'), false)
})

test('parses bare username without platform prefix or URL', () => {
  const bare1 = parseProfileInput('momo')
  assert.equal(bare1.platform, 'unknown')
  assert.equal(bare1.username, 'momo')
  assert.equal(bare1.cleanUrl, '')
  assert.equal(bare1.rawInput, 'momo')

  const bare2 = parseProfileInput('@momo')
  assert.equal(bare2.platform, 'unknown')
  assert.equal(bare2.username, 'momo')
  assert.equal(bare2.cleanUrl, '')
  assert.equal(bare2.rawInput, '@momo')

  const bareWhitespace = parseProfileInput('  @dance_fan  ')
  assert.equal(bareWhitespace.platform, 'unknown')
  assert.equal(bareWhitespace.username, 'dance_fan')
  assert.equal(bareWhitespace.cleanUrl, '')

  const bareUnknown = parseProfileInput('unknown')
  assert.equal(bareUnknown.platform, 'unknown')
  assert.equal(bareUnknown.username, 'unknown')

  const bareAtUnknown = parseProfileInput('@unknown')
  assert.equal(bareAtUnknown.platform, 'unknown')
  assert.equal(bareAtUnknown.username, 'unknown')

  const bareAux = parseProfileInput('aux')
  assert.equal(bareAux.platform, 'unknown')
  assert.equal(bareAux.username, 'aux')
})

test('buildProfileUrl generates canonical URLs for all supported platforms', () => {
  assert.equal(buildProfileUrl('instagram', 'momo'), 'https://www.instagram.com/momo/')
  assert.equal(buildProfileUrl('tiktok', 'momo'), 'https://www.tiktok.com/@momo')
  assert.equal(buildProfileUrl('facebook', 'momo'), 'https://www.facebook.com/momo')
  assert.equal(buildProfileUrl('x', 'momo'), 'https://x.com/momo')
  assert.equal(buildProfileUrl('x', 'aux'), 'https://x.com/aux')
  assert.equal(buildProfileUrl('instagram', 'con'), 'https://www.instagram.com/con/')
})

test('buildCanonicalProfile creates complete ParsedProfile with canonical URL', () => {
  const profile = buildCanonicalProfile('instagram', '@momo', '@momo')
  assert.deepEqual(profile, {
    platform: 'instagram',
    username: 'momo',
    cleanUrl: 'https://www.instagram.com/momo/',
    rawInput: '@momo',
  })

  const xProfile = buildCanonicalProfile('x', 'elonmusk')
  assert.deepEqual(xProfile, {
    platform: 'x',
    username: 'elonmusk',
    cleanUrl: 'https://x.com/elonmusk',
    rawInput: 'elonmusk',
  })

  const auxProfile = buildCanonicalProfile('x', 'aux')
  assert.deepEqual(auxProfile, {
    platform: 'x',
    username: '_aux',
    cleanUrl: 'https://x.com/aux',
    rawInput: 'aux',
  })

  const conProfile = buildCanonicalProfile('instagram', 'con')
  assert.deepEqual(conProfile, {
    platform: 'instagram',
    username: '_con',
    cleanUrl: 'https://www.instagram.com/con/',
    rawInput: 'con',
  })
})

test('rejects unsupported URLs without classifying them as bare usernames', () => {
  const res = parseProfileInput('https://unsupported.com/user123')
  assert.equal(res.platform, 'unknown')
  assert.equal(res.username, '')
  assert.equal(res.cleanUrl, '')

  const empty = parseProfileInput('   ')
  assert.equal(empty.platform, 'unknown')
  assert.equal(empty.username, '')
})


