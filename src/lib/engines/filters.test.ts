import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDateBoundary,
  resolveDateFilter,
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

test('parseDateBoundary parses 4-digit years (2021, 2022) as full calendar year boundaries', () => {
  const since2021 = parseDateBoundary('2021', 'since')
  const until2021 = parseDateBoundary('2021', 'until')

  assert.ok(since2021 !== undefined)
  assert.ok(until2021 !== undefined)
  assert.equal(since2021, Math.floor(new Date('2021-01-01T00:00:00.000Z').getTime() / 1000))
  assert.equal(until2021, Math.floor(new Date('2021-12-31T23:59:59.999Z').getTime() / 1000))
  assert.ok(until2021 > since2021)

  const since2022 = parseDateBoundary('2022', 'since')
  const until2022 = parseDateBoundary('2022', 'until')
  assert.equal(since2022, Math.floor(new Date('2022-01-01T00:00:00.000Z').getTime() / 1000))
  assert.equal(until2022, Math.floor(new Date('2022-12-31T23:59:59.999Z').getTime() / 1000))
})

test('parseDateBoundary parses YYYY-MM strings correctly', () => {
  const since = parseDateBoundary('2021-05', 'since')
  const until = parseDateBoundary('2021-05', 'until')

  assert.ok(since !== undefined)
  assert.ok(until !== undefined)
  assert.equal(since, Math.floor(new Date('2021-05-01T00:00:00.000Z').getTime() / 1000))
  assert.equal(until, Math.floor(new Date('2021-05-31T23:59:59.999Z').getTime() / 1000))
})

test('resolveDateFilter resolves years, ranges, and offsets', () => {
  assert.deepEqual(resolveDateFilter('2021'), {since: '2021', until: '2021'})
  assert.deepEqual(resolveDateFilter('2022'), {since: '2022', until: '2022'})
  assert.deepEqual(resolveDateFilter('2021..2022'), {since: '2021', until: '2022'})
  assert.deepEqual(resolveDateFilter('24h'), {since: '24h', until: undefined})
  assert.deepEqual(resolveDateFilter('7d'), {since: '7d', until: undefined})
  assert.deepEqual(resolveDateFilter('all'), {})
  assert.deepEqual(resolveDateFilter(undefined), {})
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
  assert.equal(parseLimit('24'), 24)
  assert.equal(parseLimit(100), 100)
  assert.equal(parseLimit(0), undefined)
  assert.equal(parseLimit(-5), undefined)
  assert.equal(parseLimit('all'), undefined)
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

test('filterMediaStream early-exits after N consecutive duplicate items, bypassing pinned posts', async () => {
  const seenIds = new Set(['pinned_1', 'pinned_2', 'old_1', 'old_2', 'old_3', 'old_4', 'old_5', 'ancient_1'])
  let totalYielded = 0

  async function* feed(): AsyncGenerator<MediaItem> {
    const ids = [
      'pinned_1', 'pinned_2',
      'new_1', 'new_2',
      'old_1', 'old_2', 'old_3', 'old_4', 'old_5',
      'ancient_1'
    ]
    for (const id of ids) {
      totalYielded++
      yield {
        id,
        url: `https://example.com/${id}.jpg`,
        filename: id,
        extension: 'jpg',
        type: 'photo',
      }
    }
  }

  const results: MediaItem[] = []
  for await (const item of filterMediaStream(feed(), {
    earlyExitThreshold: 5,
    isDuplicate: item => seenIds.has(item.id),
  })) {
    results.push(item)
  }

  assert.equal(totalYielded, 9, 'Should halt extraction immediately upon 5th consecutive duplicate')
  assert.equal(results.length, 9)
  assert.equal(results[2]?.id, 'new_1')
  assert.equal(results[3]?.id, 'new_2')
})

