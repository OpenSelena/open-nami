export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function shortenPath(filepath: string, homedir: string, max = 60): string {
  const pretty = filepath.startsWith(homedir) ? `~${filepath.slice(homedir.length)}` : filepath
  if (pretty.length <= max) return pretty
  const ext = /\.\w{1,5}$/.exec(pretty)?.[0] ?? ''
  return `${pretty.slice(0, max - ext.length - 1)}…${ext}`
}

/**
 * Word-wrap into left-flush lines. Ink's own wrapping keeps the space at
 * each break (wrap-ansi with trim: false), which indents every continuation
 * line by one cell and makes multi-line text look off-center.
 */
export function wrapText(text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word
    else if (line.length + 1 + word.length <= width) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

export function formatSpeed(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return ''
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatEta(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  return formatDuration(seconds)
}

export function terminalLink(text: string, url: string): string {
  return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`
}

export type ScraperErrorCategory =
  | 'not_found'
  | 'auth_required'
  | 'rate_limited'
  | 'private_account'
  | 'generic'

export interface ErrorClassification {
  category: ScraperErrorCategory
  message: string
  hint: string
  inlineText: string
}

const ERROR_RULES: Array<{
  tokens: string[]
  category: ScraperErrorCategory
  message: string
  hint: string
  inlineText: string
}> = [
  {
    tokens: ['notfounderror', 'could not be found', 'not found', 'user does not exist', 'profile not found'],
    category: 'not_found',
    message: 'profile or user could not be found',
    hint: 'verify username spelling, or the profile may be private, deleted, or login-restricted.',
    inlineText: 'not found or has no content',
  },
  {
    tokens: ['login', 'authrequired', 'redirect to login', 'checkpoint_required', 'challenge_required', 'bot verification'],
    category: 'auth_required',
    message: 'login required to access this media',
    hint: 'stories, highlights, and private accounts require active cookies in your cookies folder.',
    inlineText: 'login cookies required',
  },
  {
    tokens: ['429', 'too many requests', 'rate limit', 'throttled'],
    category: 'rate_limited',
    message: 'rate limit reached (HTTP 429)',
    hint: 'the platform is temporarily throttling requests. Please wait a minute or use cookies.',
    inlineText: 'rate limit reached (HTTP 429)',
  },
  {
    tokens: ['private'],
    category: 'private_account',
    message: 'this account is private',
    hint: 'valid cookies with an account that follows this user are required to download.',
    inlineText: 'account is private',
  },
]

export function classifyEngineError(raw: string): ErrorClassification {
  const lower = raw.toLowerCase()
  for (const rule of ERROR_RULES) {
    if (rule.tokens.some(t => lower.includes(t))) {
      return {
        category: rule.category,
        message: rule.message,
        hint: rule.hint,
        inlineText: rule.inlineText,
      }
    }
  }
  const clean = raw.replace(/\[[^\]]+\]/g, '').replace(/^[:\s-]+/, '').trim()
  return {
    category: 'generic',
    message: clean || 'download failed',
    hint: 'check your internet connection or verify the profile URL.',
    inlineText: clean || 'download failed',
  }
}

export function formatEngineError(raw: string): {message: string; hint?: string} {
  const classified = classifyEngineError(raw)
  return {
    message: classified.message,
    hint: classified.hint,
  }
}

export function cleanInlineError(err: string): string {
  const jobMatch = err.match(/^\[(Photos|Videos|Stories|Highlights)\]\s*(.*)/i)
  const jobPrefix = jobMatch ? `${jobMatch[1]!.toLowerCase()}: ` : ''
  const rest = jobMatch ? jobMatch[2]! : err

  const classified = classifyEngineError(rest)
  return `${jobPrefix}${classified.inlineText}`
}

