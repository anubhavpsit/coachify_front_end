import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import { summarizePerformance, type AssessmentHistoryItem, type PerformanceSummary } from '../lib/performance'

// Requests copied verbatim from the legacy ProfilePage.
const withAccept = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    Accept: 'application/json',
  },
})

export type StudentProfileBlock = {
  class?: string | null
  subjects?: number[] | string[] | null
  phone?: string | null
  dob?: string | null
  address?: string | null
  trial_days?: number | string | null
}
export type MyProfile = {
  id: number
  name: string
  email: string
  role: string
  dob?: string | null
  created_at?: string | null
  attendance_percentage?: number
  not_marked_days?: number
  profile_img?: string | null
  profile_image?: string | null
  studentProfile?: StudentProfileBlock | null
  student_profile?: StudentProfileBlock | null
}
export type MyFeeSummary = {
  last_paid_at: string | null
  last_paid_amount: number | null
  last_payment_mode?: string | null
  next_due_date: string
  is_overdue: boolean
  days_overdue: number
}
export type MyFeeRow = {
  id: number
  from_date: string
  to_date: string
  paid_at?: string | null
  amount: number
  status?: string
  payment_mode?: string
}
export type SubjectItem = { id: number; subject: string }

export async function fetchMyProfile(userId: number): Promise<MyProfile> {
  const res = await axios.get<{ success: boolean; data: MyProfile }>(`${API_BASE_URL}/users/${userId}`, withAccept())
  if (!res.data.success || !res.data.data) throw new Error('Unable to load profile.')
  return res.data.data
}

/** Legacy sent only the Authorization header here. */
export async function fetchMyPerformance(): Promise<PerformanceSummary | null> {
  const res = await axios.get<{
    success: boolean
    data: AssessmentHistoryItem[]
  }>(`${API_BASE_URL}/student/assessments/history`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
  })
  return res.data.success && Array.isArray(res.data.data) ? summarizePerformance(res.data.data) : null
}

/** Summary + recent payments together; failures are ignored (legacy). */
export async function fetchMyFees(): Promise<{
  summary: MyFeeSummary | null
  history: MyFeeRow[]
}> {
  try {
    const [sumRes, histRes] = await Promise.all([axios.get(`${API_BASE_URL}/student/fees/summary`, withAccept()), axios.get(`${API_BASE_URL}/student/fees?limit=10`, withAccept())])
    return {
      summary: sumRes.data?.success ? sumRes.data.data : null,
      history: histRes.data?.success && Array.isArray(histRes.data.items) ? histRes.data.items : [],
    }
  } catch {
    return { summary: null, history: [] }
  }
}

export async function fetchMySubjects(userId: number): Promise<SubjectItem[]> {
  try {
    const res = await axios.get<{
      data?: SubjectItem[]
      subjects?: SubjectItem[]
    }>(`${API_BASE_URL}/students/${userId}/subjects`, withAccept())
    const list = res.data?.data || res.data?.subjects || []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
