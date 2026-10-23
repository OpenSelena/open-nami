import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDateBoundary,
  parseLimit,
  shouldIncludeItem,
  filterMediaStream,
} from './filters.js'
import type {MediaItem} from './extractors/types.js'

test('parseDateBoundary parses ISO dates with correct since/until boundaries', () => {
  const since = parseDateBoundary('2024-05-01', 'since')
  const until = parseDateBoundary('2024-05-01', 'until')

  assert.ok(since !== undefined)
  assert.ok(until !== undefined)
  assert.equal(since, Math.floor(new Date('2024-05-01T00:00:00.000Z').getTime() / 1000))
  assert.equal(until, Math.floor(new Date('2024-05-01T23:59:59.999Z').getTime() / 1000))
  assert.ok(until > since)
})

test('parseDateBoundary parses compact YYYYMMDD date format', () => {
  const since = parseDateBoundary('20240501', 'since')
  const until = parseDateBoundary('20240501', 'until')

  assert.ok(since !== undefined)
  assert.ok(until !== undefined)
  assert.equal(since, Math.floor(new Date('2024-05-01T00:00:00.000Z').getTime() / 1000))
  assert.equal(until, Math.floor(new Date('2024-05-01T23:59:59.000Z').getTime() / 1000))
})

test('parseDateBoundary parses relative offsets like 7d, 24h', () => {
  const now = Math.floor(Date.now() / 1000)
  const past7d = parseDateBoundary('7d', 'since')
  assert.ok(past7d !== undefined)
  // Check within 2 seconds
  assert.ok(Math.abs(past7d - (now - 7 * 86400)) <= 2)

  const past24h = parseDateBoundary('24h', 'since')
  assert.ok(past24h !== undefined)
  assert.ok(Math.abs(past24h - (now - 24 * 3600)) <= 2)
})

test('parseDateBoundary handles numeric timestamps and Date instances', () => {
  const dateObj = new Date('2024-06-15T10:00:00Z')
  assert.equal(parseDateBoundary(dateObj, 'since'), Math.floor(dateObj.getTime() / 1000))

  const epochSec = 1718445600
  assert.equal(parseDateBoundary(epochSec, 'since'), epochSec)
  assert.equal(parseDateBoundary(epochSec * 1000, 'since'), epochSec)
})

test('parseDateBoundary returns undefined on invalid inputs', () => {
  assert.equal(parseDateBoundary(undefined, 'since'), undefined)
  assert.equal(parseDateBoundary('', 'since'), undefined)
  assert.equal(parseDateBoundary('not-a-date', 'since'), undefined)
})

test('parseLimit parses positive integers safely', () => {
  assert.equal(parseLimit('50'), 50)
  assert.equal(parseLimit(100), 100)
  assert.equal(parseLimit(0), undefined)
  assert.equal(parseLimit(-5), undefined)
  assert.equal(parseLimit('abc'), undefined)
  assert.equal(parseLimit(undefined), undefined)
})

test('shouldIncludeItem filters reverse-chronological items correctly', () => {
  const item1: MediaItem = {
    id: '1',
    url: 'https://example.com/1.jpg',
    filename: '1',
    extension: 'jpg',
    type: 'photo',
    date: 1000, // Newer
  }
  const item2: MediaItem = {
    id: '2',
    url: 'https://example.com/2.jpg',
    filename: '2',
    extension: 'jpg',
    type: 'photo',
    date: 500, // Middle
  }
  const item3: MediaItem = {
    id: '3',
    url: 'https://example.com/3.jpg',
    filename: '3',
    extension: 'jpg',
    type: 'photo',
    date: 100, // Older
  }

  // Filter: between 400 and 800
  const filters = {since: 400, until: 800}

  // item1 (1000 > 800): newer than until => skip, don't stop
  assert.deepEqual(shouldIncludeItem(item1, filters), {include: false, stop: false})

  // item2 (500): inside range => include, don't stop
  assert.deepEqual(shouldIncludeItem(item2, filters), {include: true, stop: false})

  // item3 (100 < 400): older than since => skip, stop pagination
  assert.deepEqual(shouldIncludeItem(item3, filters), {include: false, stop: true})
})

test('filterMediaStream respects limit and date bounds on async streams', async () => {
  async function* generateItems(): AsyncGenerator<MediaItem> {
    const dates = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]
    for (const d of dates) {
      yield {
        id: `item_${d}`,
        url: `https://example.com/${d}.jpg`,
        filename: `${d}`,
        extension: 'jpg',
        type: 'photo',
        date: d,
      }
    }
  }

  // 1. Limit test
  const limited: MediaItem[] = []
  for await (const item of filterMediaStream(generateItems(), {limit: 3})) {
    limited.push(item)
  }
  assert.equal(limited.length, 3)
  assert.equal(limited[0].id, 'item_1000')
  assert.equal(limited[2].id, 'item_800')

  // 2. Date range test: since 500, until 850
  const dateFiltered: MediaItem[] = []
  for await (const item of filterMediaStream(generateItems(), {since: 500, until: 850})) {
    dateFiltered.push(item)
  }
  assert.deepEqual(
    dateFiltered.map(i => i.date),
    [800, 700, 600, 500],
  )

  // 3. Date range combined with limit
  const combo: MediaItem[] = []
  for await (const item of filterMediaStream(generateItems(), {since: 500, until: 850, limit: 2})) {
    combo.push(item)
  }
  assert.deepEqual(
    combo.map(i => i.date),
    [800, 700],
  )
})
