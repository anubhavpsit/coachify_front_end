import axios from 'axios'
import { refreshNoticeUnread } from './noticeUnread'
import { formatDate, formatDateTime } from '../utils/date'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export type InboxNotification = {
  id: number
  type: string
  type_label: string | null
  title: string
  body: string | null
  created_at: string
  is_read: boolean
  read_at: string | null
  sender: { id: number; name: string; role: string; profile_img: string | null } | null
  data: Record<string, unknown>
  action_route: string | null
}

export type InboxResponse = {
  success: boolean
  data: InboxNotification[]
  meta: { limit: number; has_more: boolean; next_cursor: string | null; unread_count?: number }
}

/**
 * Fired after any read-state change so the bell and the page stay in sync.
 * detail: { id } for one notification, { all: true } for mark-all.
 */
export const INBOX_CHANGED_EVENT = 'my-notifications:changed'
export type InboxChange = { id: number } | { all: true }

function emitChange(detail: InboxChange) {
  window.dispatchEvent(new CustomEvent<InboxChange>(INBOX_CHANGED_EVENT, { detail }))
}

// --- shared unread count (top-bar bell + sidebar badge) ------------------

type CountListener = (count: number) => void
let inboxUnread = 0
const countListeners = new Set<CountListener>()

export function getInboxUnreadCount() {
  return inboxUnread
}

export function setInboxUnreadCount(next: number | undefined | null) {
  if (typeof next !== 'number' || next === inboxUnread) return
  inboxUnread = Math.max(0, next)
  countListeners.forEach(l => l(inboxUnread))
}

export function subscribeInboxUnread(listener: CountListener): () => void {
  countListeners.add(listener)
  return () => {
    countListeners.delete(listener)
  }
}

function headers() {
  return { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' }
}

export async function fetchInbox(params: { limit?: number; cursor?: string | null; unread?: boolean }) {
  const res = await axios.get<InboxResponse>(`${API_BASE_URL}/my/notifications`, {
    params: {
      limit: params.limit ?? 20,
      ...(params.cursor ? { cursor: params.cursor } : {}),
      ...(params.unread ? { unread: 1 } : {}),
    },
    headers: headers(),
  })
  return res.data
}

export async function fetchUnreadCount() {
  const res = await axios.get<{ success: boolean; data: { unread_count: number } }>(
    `${API_BASE_URL}/my/notifications/unread-count`,
    { headers: headers() },
  )
  setInboxUnreadCount(res.data.data.unread_count)
  return res.data.data.unread_count
}

export async function markNotificationRead(id: number) {
  const res = await axios.post<{ success: boolean; data: { unread_count: number } }>(
    `${API_BASE_URL}/my/notifications/${id}/read`,
    {},
    { headers: headers() },
  )
  setInboxUnreadCount(res.data.data.unread_count)
  emitChange({ id })
  refreshNoticeUnread() // a notice's notification also marks the notice read
  return res.data.data.unread_count
}

export async function markAllNotificationsRead() {
  await axios.post(`${API_BASE_URL}/my/notifications/read-all`, {}, { headers: headers() })
  setInboxUnreadCount(0)
  emitChange({ all: true })
  refreshNoticeUnread()
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
const date = (v: unknown) => {
  const s = str(v)
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined
}

/**
 * Web page a notification should open, or null (just mark read). Prefers the
 * API's own `action_route`; otherwise maps the type like the mobile app's
 * notificationRoutes.ts does.
 */
export function notificationLink(n: InboxNotification, role: string | undefined): string | null {
  const d = n.data ?? {}
  const type = str(d.type) ?? n.type
  const kind = str(d.kind)

  if (type === 'notice' || n.type === 'notice_published') {
    const id = Number(d.notice_id)
    return Number.isInteger(id) && id > 0 ? `/notices?notice=${id}` : '/notices'
  }

  if (n.action_route && n.action_route.startsWith('/')) return n.action_route

  const activityDate = date(d.activity_date)
  const dailyActivities = activityDate
    ? `/teachers/daily-activities?mode=history&date=${activityDate}`
    : '/teachers/daily-activities'

  switch (type) {
    case 'daily_activity_submitted':
    case 'daily_activity_batch_submitted':
      return '/approvals'
    case 'daily_activity_missing':
    case 'daily_activity_rejected':
    case 'generated_content_approved':
    case 'generated_content_rejected':
      return dailyActivities
    case 'teacher_follow_up_reminder':
      return str(d.reason) === 'assessment_overdue' ? '/assessments' : '/teachers/daily-activities'
    case 'daily_activity_approved':
    case 'generated_content_available':
    case 'generated_content_solutions_available':
      return '/students/activities'
    case 'assessment_auto_scheduled':
    case 'assessment_paper_needs_approval':
    case 'assessment_results_published':
      return role === 'student' ? '/students/assessments' : '/assessments'
    case 'generated_content_ready_for_review':
    case 'generated_content_reopened_for_review':
      return '/approvals/generated-content'
    case 'fact_engagement':
      return '/facts'
    case 'student_marked_inactive':
    case 'student_reactivated':
    case 'student_promoted':
      return '/students'
    case 'teacher_marked_inactive':
    case 'teacher_reactivated':
      return '/teachers'
    case 'attendance_correction_requested':
      return '/admin/attendance-corrections'
    case 'ghost_students_alert':
    case 'teacher_activity_missing_admin':
      return '/dashboard'
    case 'system':
      if (kind === 'attendance_reminder') return '/dashboard/attendance'
      if (kind === 'pending_approvals') return '/approvals'
      return null
    default:
      // legacy attendance-correction rows only carried `kind`
      if (kind === 'attendance_correction') return '/admin/attendance-corrections'
      return null
  }
}

export function timeAgo(iso: string) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`
  const days = Math.round(h / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(iso)
}

export function fullDate(iso: string) {
  return formatDateTime(iso, '')
}
