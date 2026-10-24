import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ExtractorPluginRegistry,
  defaultPluginRegistry,
  type IExtractorPlugin,
  type SessionHealth,
} from './plugin.js'

describe('ExtractorPluginRegistry', () => {
  test('ExtractorPluginRegistry registers and resolves platform extractors', () => {
    const registry = new ExtractorPluginRegistry()
    const mockPlugin: IExtractorPlugin = {
      platform: 'instagram',
      name: 'Mock Instagram',
      version: '1.0.0',
      canHandle: (target) => target.includes('instagram.com'),
      extract: async function* () {},
    }

    registry.register(mockPlugin)
    assert.equal(registry.has('instagram'), true)
    assert.equal(registry.has('tiktok'), false)
    assert.equal(registry.get('instagram')?.name, 'Mock Instagram')
    assert.equal(registry.get('tiktok'), undefined)
  })

  test('list() returns all registered plugins', () => {
    const registry = new ExtractorPluginRegistry()
    const igPlugin: IExtractorPlugin = {
      platform: 'instagram',
      name: 'Mock IG',
      version: '1.0.0',
      canHandle: (target) => target.includes('instagram'),
      extract: async function* () {},
    }
    const xPlugin: IExtractorPlugin = {
      platform: 'x',
      name: 'Mock X',
      version: '1.0.0',
      canHandle: (target) => target.includes('x.com'),
      extract: async function* () {},
    }

    registry.register(igPlugin)
    registry.register(xPlugin)

    const list = registry.list()
    assert.equal(list.length, 2)
    assert.deepEqual(
      list.map((p) => p.platform).sort(),
      ['instagram', 'x'].sort(),
    )
  })

  test('findByUrl() finds plugin whose canHandle returns true', () => {
    const registry = new ExtractorPluginRegistry()
    const igPlugin: IExtractorPlugin = {
      platform: 'instagram',
      name: 'Mock IG',
      version: '1.0.0',
      canHandle: (target) => /instagram\.com/i.test(target),
      extract: async function* () {},
    }

    registry.register(igPlugin)
    const found = registry.findByUrl?.('https://www.instagram.com/p/123')
    assert.equal(found?.platform, 'instagram')

    const notFound = registry.findByUrl?.('https://example.com')
    assert.equal(notFound, undefined)
  })

  test('validateSession hook handles session verification', async () => {
    const mockHealth: SessionHealth = {
      valid: true,
      username: 'testuser',
      expiresAt: new Date('2027-01-01T00:00:00Z'),
    }

    const plugin: IExtractorPlugin = {
      platform: 'facebook',
      name: 'Mock FB',
      version: '1.0.0',
      canHandle: () => true,
      validateSession: async (cookiePath) => {
        if (!cookiePath) {
          return { valid: false, error: 'No cookie provided' }
        }
        return mockHealth
      },
      extract: async function* () {},
    }

    const resValid = await plugin.validateSession?.('/path/to/cookies.txt')
    assert.equal(resValid?.valid, true)
    assert.equal(resValid?.username, 'testuser')

    const resInvalid = await plugin.validateSession?.(null)
    assert.equal(resInvalid?.valid, false)
    assert.equal(resInvalid?.error, 'No cookie provided')
  })

  test('extract generator yields media items', async () => {
    const sampleItem = {
      id: 'm1',
      url: 'https://example.com/1.jpg',
      filename: '1.jpg',
      extension: 'jpg',
      type: 'photo' as const,
    }

    const plugin: IExtractorPlugin = {
      platform: 'tiktok',
      name: 'Mock TikTok',
      version: '1.0.0',
      canHandle: () => true,
      extract: async function* () {
        yield sampleItem
      },
    }

    const items = []
    for await (const item of plugin.extract(
      { platform: 'tiktok', username: 'tok', cleanUrl: 'https://tiktok.com/@tok', rawInput: 'tok' },
      { subDir: 'Photos' },
    )) {
      items.push(item)
    }

    assert.equal(items.length, 1)
    assert.equal(items[0].id, 'm1')
  })

  test('defaultPluginRegistry is instantiated as ExtractorPluginRegistry', () => {
    assert.ok(defaultPluginRegistry instanceof ExtractorPluginRegistry)
  })
})
