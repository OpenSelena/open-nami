import fs from 'node:fs/promises'
import {setTimeout as setTimeoutPromise} from 'node:timers/promises'

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export const DEFAULT_CHROME_HEADERS: Record<string, string> = {
  'User-Agent': DEFAULT_USER_AGENT,
  'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
}

export function parseNetscapeCookies(content: string, filterDomain?: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  const lines = content.split(/\r?\n/)

  for (const rawLine of lines) {
    let line = rawLine.trim()
    if (!line) continue

    // Handle #HttpOnly_ cookies
    if (line.startsWith('#HttpOnly_')) {
      line = line.slice('#HttpOnly_'.length)
    } else if (line.startsWith('#')) {
      continue
    }

    const parts = line.split('\t')
    if (parts.length >= 7) {
      const domain = parts[0].toLowerCase()
      const name = parts[5]
      const value = parts[6]

      if (filterDomain) {
        const cleanDomain = filterDomain.toLowerCase().replace(/^\./, '')
        const lineDomain = domain.replace(/^\./, '')
        if (!lineDomain.endsWith(cleanDomain) && !cleanDomain.endsWith(lineDomain)) {
          continue
        }
      }

      if (name) {
        cookies[name] = value
      }
    }
  }

  return cookies
}

export async function loadCookiesFromPath(
  filePath: string,
  filterDomain?: string,
): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return parseNetscapeCookies(content, filterDomain)
  } catch {
    return {}
  }
}

export function formatCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

export async function sleep(minMs: number, maxMs?: number, signal?: AbortSignal): Promise<void> {
  const ms = maxMs !== undefined ? Math.floor(minMs + Math.random() * (maxMs - minMs)) : minMs
  if (ms <= 0) return
  if (signal?.aborted) {
    throw signal.reason ?? new Error('Aborted')
  }
  try {
    await setTimeoutPromise(ms, undefined, {signal})
  } catch (err: any) {
    if (signal?.aborted && signal.reason) {
      throw signal.reason
    }
    throw err
  }
}

export interface RequestOptions extends RequestInit {
  cookies?: Record<string, string> | string
  cookiePath?: string | null
  cookieDomain?: string
  retries?: number
  retryDelayMs?: number
}

export class HttpClient {
  private defaultCookies: Record<string, string> = {}
  private defaultHeaders: Record<string, string>
  private cookieCache: Map<string, Record<string, string>> = new Map()

  constructor(headers?: Record<string, string>, cookies?: Record<string, string>) {
    this.defaultHeaders = {...DEFAULT_CHROME_HEADERS, ...headers}
    if (cookies) {
      this.defaultCookies = {...cookies}
    }
  }

  setCookie(name: string, value: string): void {
    this.defaultCookies[name] = value
  }

  setHeader(name: string, value: string): void {
    this.defaultHeaders[name] = value
  }

  clearCookieCache(): void {
    this.cookieCache.clear()
  }

  private async getCachedCookies(filePath: string, domain?: string): Promise<Record<string, string>> {
    const cacheKey = `${filePath}::${domain || ''}`
    const cached = this.cookieCache.get(cacheKey)
    if (cached) {
      return cached
    }
    const loaded = await loadCookiesFromPath(filePath, domain)
    this.cookieCache.set(cacheKey, loaded)
    return loaded
  }

  async loadCookies(filePath: string, domain?: string): Promise<void> {
    const loaded = await this.getCachedCookies(filePath, domain)
    Object.assign(this.defaultCookies, loaded)
  }

  async request(url: string, options: RequestOptions = {}): Promise<Response> {
    const retries = options.retries ?? 3
    const retryDelay = options.retryDelayMs ?? 1500

    let cookieHeader = ''
    if (options.cookiePath) {
      const fromPath = await this.getCachedCookies(options.cookiePath, options.cookieDomain)
      const merged = {...this.defaultCookies, ...fromPath}
      cookieHeader = formatCookieHeader(merged)
    } else if (typeof options.cookies === 'string') {
      cookieHeader = options.cookies
    } else if (options.cookies) {
      const merged = {...this.defaultCookies, ...options.cookies}
      cookieHeader = formatCookieHeader(merged)
    } else if (Object.keys(this.defaultCookies).length > 0) {
      cookieHeader = formatCookieHeader(this.defaultCookies)
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options.headers as Record<string, string>),
    }

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }

    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (options.signal?.aborted) {
        throw options.signal.reason ?? new Error('Aborted')
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        })

        if (response.status === 429) {
          // Rate limited, back off
          if (attempt < retries) {
            try {
              await response.body?.cancel()
            } catch {}
            await sleep(retryDelay * (attempt + 1) * 2, undefined, options.signal || undefined)
            continue
          }
        }

        if (response.status >= 500 && attempt < retries) {
          try {
            await response.body?.cancel()
          } catch {}
          await sleep(retryDelay * (attempt + 1), undefined, options.signal || undefined)
          continue
        }

        return response
      } catch (err) {
        lastError = err
        if (options.signal?.aborted) throw err
        if (attempt < retries) {
          await sleep(retryDelay * (attempt + 1), undefined, options.signal || undefined)
        }
      }
    }

    throw lastError ?? new Error(`Request failed after ${retries} attempts: ${url}`)
  }

  async fetchJson<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
    const res = await this.request(url, {
      ...options,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        ...(options.headers as Record<string, string>),
      },
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} (${res.statusText}) for ${url}`)
    }
    return (await res.json()) as T
  }

  async fetchText(url: string, options: RequestOptions = {}): Promise<string> {
    const res = await this.request(url, options)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} (${res.statusText}) for ${url}`)
    }
    return await res.text()
  }
}
