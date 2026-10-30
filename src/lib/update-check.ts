import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export interface UpdateCheckResult {
  currentVersion: string
  latestVersion?: string
  updateAvailable: boolean
  lastChecked: number
}

export interface CheckUpdateOptions {
  currentVersion?: string
  cachePath?: string
  force?: boolean
  timeoutMs?: number
  checkIntervalMs?: number
  fetchFn?: typeof fetch
}

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
const DEFAULT_TIMEOUT_MS = 1500

export function getDefaultUpdateCachePath(): string {
  if (process.env.OPEN_NAMI_UPDATE_CACHE && process.env.OPEN_NAMI_UPDATE_CACHE.trim()) {
    return path.resolve(process.env.OPEN_NAMI_UPDATE_CACHE.trim())
  }
  return path.join(os.homedir(), '.open-nami', 'update-check.json')
}

/**
 * Compares two semantic version strings (e.g. "1.7.0" vs "1.7.1").
 * Returns -1 if v1 < v2, 1 if v1 > v2, 0 if equal.
 */
export function compareSemVer(v1: string, v2: string): number {
  const clean1 = (v1 || '').trim().replace(/^v/, '')
  const clean2 = (v2 || '').trim().replace(/^v/, '')

  const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0)
  const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0)

  const len = Math.max(parts1.length, parts2.length)
  for (let i = 0; i < len; i++) {
    const num1 = parts1[i] ?? 0
    const num2 = parts2[i] ?? 0
    if (num1 < num2) return -1
    if (num1 > num2) return 1
  }

  return 0
}

/**
 * Synchronously reads the cached update check result to avoid startup latency.
 */
export function getCachedUpdateInfo(
  currentVersion: string,
  cachePath = getDefaultUpdateCachePath(),
): UpdateCheckResult | null {
  try {
    if (!fs.existsSync(cachePath)) return null
    const raw = fs.readFileSync(cachePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && typeof parsed.latestVersion === 'string') {
      const updateAvailable = compareSemVer(currentVersion, parsed.latestVersion) < 0
      return {
        currentVersion,
        latestVersion: parsed.latestVersion,
        updateAvailable,
        lastChecked: typeof parsed.lastChecked === 'number' ? parsed.lastChecked : 0,
      }
    }
  } catch {}
  return null
}

/**
 * Checks the npm registry for the latest release of open-nami.
 * Respects cache interval (default 24h), timeout, and NO_UPDATE_NOTIFIER environment variables.
 */
export async function checkForUpdate(
  options: CheckUpdateOptions = {},
): Promise<UpdateCheckResult> {
  const currentVersion = options.currentVersion ?? '1.0.0'
  const cachePath = options.cachePath ?? getDefaultUpdateCachePath()
  const interval = options.checkIntervalMs ?? DEFAULT_INTERVAL_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetcher = options.fetchFn ?? globalThis.fetch

  // Check opt-out environment variables
  if (
    process.env.NO_UPDATE_NOTIFIER === '1' ||
    process.env.OPEN_NAMI_NO_UPDATE === '1'
  ) {
    return {
      currentVersion,
      updateAvailable: false,
      lastChecked: Date.now(),
    }
  }

  // Check cache freshness unless forced
  const cached = getCachedUpdateInfo(currentVersion, cachePath)
  if (!options.force && cached && Date.now() - cached.lastChecked < interval) {
    return cached
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetcher('https://registry.npmjs.org/open-nami/latest', {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': `open-nami/${currentVersion}`,
      },
    })
    clearTimeout(timer)

    if (res.ok) {
      const data = (await res.json()) as { version?: string }
      if (data && typeof data.version === 'string' && data.version.trim()) {
        const latestVersion = data.version.trim()
        const updateAvailable = compareSemVer(currentVersion, latestVersion) < 0

        // Persist to cache
        try {
          const dir = path.dirname(cachePath)
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
          }
          fs.writeFileSync(
            cachePath,
            JSON.stringify(
              {
                lastChecked: Date.now(),
                latestVersion,
              },
              null,
              2,
            ),
            { encoding: 'utf8', mode: 0o600 },
          )
        } catch {}

        return {
          currentVersion,
          latestVersion,
          updateAvailable,
          lastChecked: Date.now(),
        }
      }
    }
  } catch {}

  // Fallback gracefully on network failure
  return (
    cached ?? {
      currentVersion,
      updateAvailable: false,
      lastChecked: Date.now(),
    }
  )
}
