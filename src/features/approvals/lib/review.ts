import { toDateInputValue } from '@/utils/date'
import type { BulkResult, DateParams, ReviewActivity } from '../services/activityApprovalsService'

export type QuickFilter = 'today' | '3d' | '7d' | '14d' | '30d' | 'all' | 'custom'

export const QUICK_FILTERS: { value: Exclude<QuickFilter, 'custom'>; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '3d', label: '3d' },
  { value: '7d', label: '7d' },
  { value: '14d', label: '14d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
]

/** Port of the legacy getQuickFilterDates (ranges include today). */
export function quickFilterDates(filter: QuickFilter, customDate: string): DateParams {
  if (filter === 'custom') return customDate ? { date: customDate } : {}
  if (filter === 'today') return { date: toDateInputValue(new Date()) }
  if (filter === 'all') return {}
  const days = { '3d': 3, '7d': 7, '14d': 14, '30d': 30 }[filter]
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days + 1)
  return { date_from: toDateInputValue(from), date_to: toDateInputValue(to) }
}

/** Client-side narrowing of the loaded list (student, teacher, subject, topic, notes). */
export function matchesSearch(a: ReviewActivity, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return true
  return [a.student?.name, a.teacher?.name, a.subject?.subject, a.topic_model?.name ?? a.topic, a.chapter_model?.name ?? a.chapter, a.notes, a.homework]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(s))
}

/** Newest day first (the API already sorts by activity_date desc). */
export function groupByDate(list: ReviewActivity[]): { date: string; items: ReviewActivity[] }[] {
  const groups: { date: string; items: ReviewActivity[] }[] = []
  for (const a of list) {
    const d = (a.activity_date || '').slice(0, 10)
    const last = groups[groups.length - 1]
    if (last && last.date === d) last.items.push(a)
    else groups.push({ date: d, items: [a] })
  }
  return groups
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Same wording as the legacy bulk message, plus the "waiting on teacher" count when any were skipped. */
export function bulkMessage(d: BulkResult, includeAttachments: boolean): string {
  let msg = `Approved ${plural(d.approved ?? 0, 'activity', 'activities')}`
  if (includeAttachments) msg += ` and ${plural(d.attachments_approved ?? 0, 'attachment', 'attachments')}`
  msg += `; ${plural(d.students_notified ?? 0, 'student', 'students')} notified.`
  if (d.awaiting_teacher) msg += ` ${plural(d.awaiting_teacher, 'was', 'were')} skipped (waiting on the teacher).`
  return msg
}

export const lessonLabel = (a: ReviewActivity) =>
  [a.chapter_model?.name ?? (a.chapter_number ? `Chapter ${a.chapter_number}` : a.chapter), a.topic_model?.name ?? a.topic].filter(Boolean).join(' › ')
