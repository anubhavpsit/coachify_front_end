/**
 * The one place user-facing dates are formatted (keep in sync with the RN
 * app's src/utils/date.ts and the API's App\Support\DateFormat).
 *
 *   formatDate()     → 27/09/2026
 *   formatDateTime() → 27/09/2026 16:10:05   (24-hour, viewer's local time)
 *   formatTime()     → 16:10:05
 *   formatMonth()    → 09/2026
 *
 * API values come in three shapes:
 *   "2026-10-03"                      plain date        → shown as-is
 *   "2026-10-03T00:00:00.000000Z"     Laravel date cast → plain date
 *   "2026-09-27T10:40:05.000000Z" / "2026-09-27 10:40:05"
 *                                     timestamp (UTC; the API runs in UTC)
 *                                     → converted to local time
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_CAST = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.0+)?Z$/
const NAIVE_UTC = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/

const pad = (n: number) => String(n).padStart(2, '0')

type Parsed = { date: Date; dateOnly: boolean }

function parse(value: string | Date | null | undefined): Parsed | null {
  if (value === null || value === undefined || value === '') return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { date: value, dateOnly: false }
  }

  const v = value.trim()
  const dateOnly = v.match(DATE_ONLY) ?? v.match(DATE_CAST)
  if (dateOnly) {
    const [, y, m, d] = dateOnly
    return { date: new Date(Number(y), Number(m) - 1, Number(d)), dateOnly: true }
  }

  const naive = v.match(NAIVE_UTC)
  const ms = naive ? Date.parse(`${naive[1]}-${naive[2]}-${naive[3]}T${naive[4]}:${naive[5]}:${naive[6] ?? '00'}Z`) : Date.parse(v)
  return Number.isNaN(ms) ? null : { date: new Date(ms), dateOnly: false }
}

const dmy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
const hms = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

/** DD/MM/YYYY */
export function formatDate(value?: string | Date | null, placeholder = '-'): string {
  const p = parse(value)
  if (!p) return value && typeof value === 'string' ? value : placeholder
  return dmy(p.date)
}

/** DD/MM/YYYY HH:mm:ss — plain dates (no time) render as DD/MM/YYYY. */
export function formatDateTime(value?: string | Date | null, placeholder = '—'): string {
  const p = parse(value)
  if (!p) return value && typeof value === 'string' ? value : placeholder
  return p.dateOnly ? dmy(p.date) : `${dmy(p.date)} ${hms(p.date)}`
}

/** HH:mm:ss */
export function formatTime(value?: string | Date | null, placeholder = '—'): string {
  const p = parse(value)
  return p && !p.dateOnly ? hms(p.date) : placeholder
}

/** "2026-09" → 09/2026 */
export function formatMonth(value?: string | null, placeholder = '-'): string {
  const m = value?.match(/^(\d{4})-(\d{2})/)
  return m ? `${m[2]}/${m[1]}` : placeholder
}

/**
 * Local-date value for <input type="date"> / API params (YYYY-MM-DD).
 * Never use toISOString() for this — it's UTC and gives yesterday's date
 * between 00:00 and 05:29 IST.
 */
export function toDateInputValue(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
export function toDateTimeInputValue(value?: string | Date | null): string {
  const p = parse(value)
  if (!p) return ''
  return `${toDateInputValue(p.date)}T${pad(p.date.getHours())}:${pad(p.date.getMinutes())}`
}
