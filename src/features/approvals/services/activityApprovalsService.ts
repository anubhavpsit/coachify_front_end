import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests mirror the legacy DailyActivityApprovalsPage (same URLs, headers, bodies).
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` })
const STORAGE_BASE = import.meta.env.VITE_STORAGE_BASE_URL ?? 'http://coachify.local/storage'

export type ApprovalFilter = 'pending' | 'approved' | 'all'
export type DateParams = { date?: string; date_from?: string; date_to?: string }

export type ReviewAttachment = {
  id: number
  original_name: string
  path: string
  url?: string | null
  file_type?: 'image' | 'pdf' | 'other'
  is_admin_approved?: boolean
}

export type ActivityNotification = {
  id: number
  title: string
  body?: string | null
  status: string
  sent_at?: string | null
  scheduled_for?: string | null
  created_at: string
  last_error?: string | null
}

export type ReviewActivity = {
  id: number
  activity_date: string
  chapter?: string | null
  topic?: string | null
  chapter_number?: number | null
  topic_model?: { id: number; name: string } | null
  chapter_model?: { id: number; name: string } | null
  notes?: string | null
  homework?: string | null
  is_admin_approved?: boolean
  admin_feedback?: string | null
  teacher?: { id: number; name: string } | null
  student?: { id: number; name: string } | null
  subject?: { id: number; subject: string } | null
  attachments?: ReviewAttachment[]
  student_notification?: ActivityNotification | null
  teacher_notification?: ActivityNotification | null
}

export type BulkResult = { approved?: number; attachments_approved?: number; students_notified?: number; awaiting_teacher?: number }

export const reviewAttachmentUrl = (a: ReviewAttachment) => a.url || `${STORAGE_BASE}/${a.path}`

/** Sent back with remarks and not yet fixed — bulk approve skips these (backend rule too). */
export const isAwaitingTeacher = (a: ReviewActivity) => !a.is_admin_approved && !!a.admin_feedback
export const isPendingReview = (a: ReviewActivity) => !a.is_admin_approved && !a.admin_feedback

export async function fetchStudentOptions(isApprover: boolean): Promise<{ id: number; name: string }[]> {
  const res = await axios.get<{ success: boolean; data: { id: number; name: string }[] }>(`${API_BASE_URL}${isApprover ? '/students' : '/teachers/students'}`, {
    headers: auth(),
  })
  return res.data.success ? res.data.data || [] : []
}

export async function fetchReviewActivities(isApprover: boolean, status: ApprovalFilter, dates: DateParams, studentId?: string): Promise<ReviewActivity[]> {
  const params: Record<string, string> = {}
  if (status !== 'all') params.approved = status === 'approved' ? 'true' : 'false'
  if (dates.date) params.date = dates.date
  if (dates.date_from) params.date_from = dates.date_from
  if (dates.date_to) params.date_to = dates.date_to
  if (studentId) params.student_id = studentId
  const endpoint = isApprover ? `${API_BASE_URL}/admin/daily-activities` : `${API_BASE_URL}/teacher/daily-activities`
  const res = await axios.get<{ success: boolean; data: ReviewActivity[] }>(endpoint, { headers: auth(), params })
  if (!res.data.success) throw new Error('Unable to load activities. Please try again later.')
  return res.data.data || []
}

/** approved=true approves; approved=false + remarks sends back (or un-approves). Returns the backend message. */
export async function setActivityApproval(id: number, approved: boolean, remarks?: string): Promise<string | undefined> {
  const res = await axios.patch(`${API_BASE_URL}/daily-activities/${id}/approval`, { approved, remarks }, { headers: auth() })
  return res.data?.message
}

export async function setAttachmentApproval(activityId: number, attachmentId: number, approved: boolean): Promise<void> {
  await axios.patch(`${API_BASE_URL}/daily-activities/${activityId}/attachments/${attachmentId}/approval`, { approved }, { headers: auth() })
}

export async function approveBulk(ids: number[], includeAttachments: boolean): Promise<BulkResult> {
  const res = await axios.post(`${API_BASE_URL}/daily-activities/approve-bulk`, { ids, include_attachments: includeAttachments }, { headers: auth() })
  return res.data?.data ?? {}
}

export async function sendNotificationNow(notificationId: number): Promise<void> {
  await axios.post(`${API_BASE_URL}/notifications/${notificationId}/send`, {}, { headers: auth() })
}
