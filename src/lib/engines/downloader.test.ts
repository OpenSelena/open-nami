import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  loadArchive,
  saveArchive,
  downloadMediaStream,
  ARCHIVE_FILENAME,
} from './downloader.js'
import type {MediaItem} from './extractors/types.js'

test('loadArchive returns empty set when no archive exists', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-down-test-'))
  try {
    const archive = await loadArchive(tmpDir)
    assert.equal(archive.size, 0)
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})

test('saveArchive and loadArchive roundtrips saved item IDs', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-down-test-'))
  try {
    const initial = new Set(['item_1', 'item_2', 'item_3'])
    await saveArchive(tmpDir, initial)

    const loaded = await loadArchive(tmpDir)
    assert.equal(loaded.size, 3)
    assert.ok(loaded.has('item_1'))
    assert.ok(loaded.has('item_2'))
    assert.ok(loaded.has('item_3'))
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})

test('downloadMediaStream skips already archived files', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-down-test-'))
  try {
    // Pre-create file and archive
    const existingFile = path.join(tmpDir, 'photo_1.jpg')
    await fs.writeFile(existingFile, 'fake image data')
    await saveArchive(tmpDir, new Set(['photo_1']))

    async function* mockItems(): AsyncGenerator<MediaItem> {
      yield {
        id: 'photo_1',
        url: 'https://example.com/photo_1.jpg',
        filename: 'photo_1.jpg',
        extension: 'jpg',
        type: 'photo',
      }
    }

    const progressLogs: string[] = []
    const result = await downloadMediaStream(mockItems(), {
      jobName: 'TestJob',
      destDir: tmpDir,
      onProgress: p => {
        progressLogs.push(p.statusText)
      },
    })

    assert.equal(result.skipped, 1)
    assert.equal(result.downloaded, 0)
    assert.ok(progressLogs.some(msg => msg.includes('Skipping already downloaded')))
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})

test('downloadMediaStream passes referer header to request', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nami-down-test-'))
  try {
    let capturedHeaders: Record<string, string> | undefined
    const mockHttpClient: any = {
      request: async (_url: string, opts: any) => {
        capturedHeaders = opts?.headers
        return {
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(Buffer.from('dummy data'))
              controller.close()
            },
          }),
        }
      },
    }

    async function* mockItems(): AsyncGenerator<MediaItem> {
      yield {
        id: 'photo_test',
        url: 'https://example.com/photo.jpg',
        filename: 'photo.jpg',
        extension: 'jpg',
        type: 'photo',
      }
    }

    const result = await downloadMediaStream(mockItems(), {
      jobName: 'RefererJob',
      destDir: tmpDir,
      httpClient: mockHttpClient,
      referer: 'https://www.tiktok.com/',
    })

    assert.equal(result.downloaded, 1)
    assert.equal(capturedHeaders?.['Referer'], 'https://www.tiktok.com/')
  } finally {
    await fs.rm(tmpDir, {recursive: true, force: true})
  }
})
