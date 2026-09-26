export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export type NoticeAudience = 'all' | 'admin' | 'teacher' | 'student'

export type Notice = {
  id: number
  title: string
  body_preview: string
  body?: string
  target_roles: NoticeAudience[]
  is_pinned: boolean
  is_important: boolean
  is_read: boolean
  published_at: string
  expires_at: string | null
  has_attachment: boolean
  attachment?: { url: string; name: string; mime: string; size: number } | null
  posted_by: { id: number; name: string; role: string } | null
  // coaching_admin only
  status?: 'active' | 'scheduled' | 'expired'
  send_push?: boolean
  push_dispatched_at?: string | null
  push_recipients_count?: number | null
}

export type NoticeListResponse = {
  success: boolean
  data: Notice[]
  pinned?: Notice[]
  meta: {
    limit: number
    has_more: boolean
    next_cursor: string | null
    unread_count?: number
    can_manage?: boolean
  }
}

export const AUDIENCE_LABELS: Record<NoticeAudience, string> = {
  all: 'All',
  admin: 'Admins',
  teacher: 'Teachers',
  student: 'Students',
}

export const ROLE_LABELS: Record<string, string> = {
  coaching_admin: 'Admin',
  staff: 'Staff',
  teacher: 'Teacher',
  student: 'Student',
}

export function authHeaders() {
  const token = localStorage.getItem('authToken')
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' }
}

export function formatNoticeDate(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** ISO string -> value for <input type="datetime-local"> in the browser's zone. */
export function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
