const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

/** 1240 → "1.2K", like the counts on Reels/Shorts. */
export function compactCount(n: number | null | undefined): string {
  return compact.format(Math.max(0, n ?? 0))
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "2 days ago" from an ISO timestamp; '' when missing/invalid; "just now" under a minute. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(t)) return ''
  const secs = Math.round((t - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(secs) >= size) return relative.format(Math.trunc(secs / size), unit)
  }
  return 'just now'
}

/** "en.wikipedia.org" for a source link; '' when it isn't a URL. */
export function hostOf(url: string | null | undefined): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
}
