import {readClipboard} from './clipboard.js'
import {parseProfileInput} from './parser.js'
import {dispatchDownload, resolveDefaultDownloadDir} from './engines/dispatcher.js'
import type {ParsedProfile} from './parser.js'
import type {MediaTarget, EngineResult} from './engines/types.js'

export interface WatcherOptions {
  choice?: MediaTarget
  getChoice?: () => MediaTarget
  outputDir?: string
  intervalMs?: number
  writeMetadata?: boolean
  getWriteMetadata?: () => boolean
  signal?: AbortSignal
  readClipboardFn?: () => string
  dispatchFn?: typeof dispatchDownload
  onDetected?: (profile: ParsedProfile) => void
  onProgress?: (profile: ParsedProfile, statusText: string) => void
  onComplete?: (profile: ParsedProfile, result: EngineResult) => void
  onError?: (profile: ParsedProfile, err: Error) => void
}

export function startClipboardWatcher(options: WatcherOptions = {}): {
  stop: () => void
  promise: Promise<void>
} {
  const choice = options.choice || 'all'
  const intervalMs = options.intervalMs ?? 1000
  const readClip = options.readClipboardFn ?? readClipboard
  const dispatch = options.dispatchFn ?? dispatchDownload

  let isRunning = true
  let lastClipboardText = ''
  const processedUrls = new Set<string>()

  let timer: NodeJS.Timeout | null = null
  let resolvePromise: (() => void) | null = null

  const stop = () => {
    if (!isRunning && !timer && !resolvePromise) return
    isRunning = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (resolvePromise) {
      const resolve = resolvePromise
      resolvePromise = null
      resolve()
    }
  }

  if (options.signal) {
    if (options.signal.aborted) {
      isRunning = false
    } else {
      options.signal.addEventListener('abort', stop, {once: true})
    }
  }

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve

    if (!isRunning || options.signal?.aborted) {
      resolvePromise = null
      resolve()
      return
    }

    const loop = async () => {
      if (!isRunning || options.signal?.aborted) {
        stop()
        return
      }

      try {
        const text = readClip().trim()
        if (text && text !== lastClipboardText) {
          lastClipboardText = text
          const parsed = parseProfileInput(text)

          if (parsed.platform !== 'unknown' && parsed.cleanUrl && !processedUrls.has(parsed.cleanUrl)) {
            processedUrls.add(parsed.cleanUrl)
            options.onDetected?.(parsed)

            try {
              const res = await dispatch({
                profile: parsed,
                choice: options.getChoice ? options.getChoice() : (options.choice || 'all'),
                outputDir: resolveDefaultDownloadDir(parsed.platform, parsed.username, options.outputDir),
                writeMetadata: options.getWriteMetadata ? options.getWriteMetadata() : (options.writeMetadata ?? false),
                signal: options.signal,
                onProgress: (p) => {
                  if (p.statusText) {
                    options.onProgress?.(parsed, p.statusText)
                  }
                },
              })
              options.onComplete?.(parsed, res)
            } catch (err: unknown) {
              const error = err instanceof Error ? err : new Error(String(err))
              options.onError?.(parsed, error)
            }
          }
        }
      } catch {}

      if (isRunning && !options.signal?.aborted) {
        timer = setTimeout(loop, intervalMs)
      } else {
        stop()
      }
    }

    loop()
  })

  return {stop, promise}
}
