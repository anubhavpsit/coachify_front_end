import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import type { DateParams } from './activityApprovalsService'

// Same requests as the legacy GeneratedContentApprovalsPage.
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` })

export type ContentNotification = { id: number; title: string; status: string; sent_at?: string | null; created_at: string; last_error?: string | null }
export type GeneratedContent = {
  id: number
  daily_activity_id: number
  explanation_html?: string | null
  homework_html?: string | null
  sample_questions_html?: string | null
  sample_questions_with_solutions_html?: string | null
  is_admin_approved?: boolean
  approved_at?: string | null
  admin_feedback?: string | null
  ingested_at?: string | null
  daily_activity?: {
    id: number
    activity_date: string
    chapter?: string | null
    topic?: string | null
    teacher?: { id: number; name: string } | null
    student?: { id: number; name: string } | null
    subject?: { id: number; subject: string } | null
  } | null
  teacher_notification?: ContentNotification | null
  student_notification?: ContentNotification | null
}

export async function fetchStudentsForContent(): Promise<{ id: number; name: string }[]> {
  const res = await axios.get<{ success: boolean; data: { id: number; name: string }[] }>(`${API_BASE_URL}/students`, { headers: auth() })
  return res.data.success ? res.data.data || [] : []
}

export async function fetchGeneratedContent(approved: boolean, dates: DateParams, studentId?: string): Promise<GeneratedContent[]> {
  const params: Record<string, string> = { approved: approved ? 'true' : 'false' }
  if (dates.date) params.date = dates.date
  if (dates.date_from) params.date_from = dates.date_from
  if (dates.date_to) params.date_to = dates.date_to
  if (studentId) params.student_id = studentId
  const res = await axios.get<{ success: boolean; data: GeneratedContent[] }>(`${API_BASE_URL}/admin/generated-content`, { headers: auth(), params })
  if (!res.data.success) throw new Error('Unable to load generated content. Please try again later.')
  return res.data.data || []
}

export async function setContentApproval(id: number, approved: boolean, remarks?: string): Promise<string | undefined> {
  const res = await axios.patch(`${API_BASE_URL}/generated-content/${id}/approval`, { approved, remarks }, { headers: auth() })
  return res.data?.message
}
