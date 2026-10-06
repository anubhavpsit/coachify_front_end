import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy UserProfileModal.
const token = () => localStorage.getItem('authToken')
const opts = () => ({ headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' } })

export type RelatedUser = { id: number; name: string; email: string; profile_img?: string | null; profile_image?: string | null }
export type UserProfile = {
  id: number
  name: string
  email: string
  role: string
  current_class_id?: number | null
  current_class_name?: string | null
  attendance_percentage?: number
  not_marked_days?: number
  dob?: string | null
  created_at?: string | null
  /** Students: day they actually started (joining date / first enrollment). */
  admission_date?: string | null
  /** Students: names of their subjects. */
  subject_names?: string[]
  profile_img?: string | null
  profile_image?: string | null
  tenant_id: number
  student_profile?: { class?: string; subjects?: (string | number)[]; phone?: string; fee_due_date?: string | null; trial_days?: number | null } | null
  teachers?: RelatedUser[]
  students?: RelatedUser[]
}
export type FeeSummary = {
  last_paid_at: string | null
  last_paid_amount: number | null
  last_payment_mode?: string | null
  next_due_date: string
  is_overdue: boolean
  days_overdue: number
  status_label?: string
}
export type FeeHistoryItem = { id: number; from_date: string; to_date: string; paid_at?: string | null; amount: number; status?: string; payment_mode?: string }
export type AsmResult = {
  assignment_id: number
  title: string
  subject: string
  marks_obtained: number
  total_marks: number
  percentage: number
  attempted_at?: string | null
  graded_at?: string | null
}
export type AsmSummary = {
  completed_count: number
  average_percentage: number | null
  last_assessment_date?: string | null
  next_assessment_date?: string | null
  last_result: AsmResult | null
  recent_results: AsmResult[]
}
export type SubjectInsight = { subject_id: number; subject: string; activity_count: number; days_count: number; share: number; dates?: string[]; series?: number[] }
export type ChapterInsight = { chapter: string; activity_count: number }

export async function fetchUserProfile(id: number): Promise<UserProfile | undefined> {
  const res = await axios.get(`${API_BASE_URL}/users/${id}`, opts())
  return res.data.success ? res.data.data : undefined
}

export async function fetchInsightSubjects(studentId: number, windowDays: number) {
  const res = await axios.get(`${API_BASE_URL}/insights/activities/subjects`, { ...opts(), params: { window_days: windowDays, student_id: studentId } })
  if (!res.data?.success) return { items: [] as SubjectInsight[], notes: [] as string[] }
  return { items: (res.data.data.items || []) as SubjectInsight[], notes: (res.data.data.focus?.notes || []) as string[] }
}

export async function fetchInsightChapters(studentId: number, windowDays: number, subjectId: number): Promise<ChapterInsight[]> {
  const res = await axios.get(`${API_BASE_URL}/insights/activities/chapters`, { ...opts(), params: { window_days: windowDays, student_id: studentId, subject_id: subjectId } })
  return res.data?.success ? res.data.data.items || [] : []
}

export async function fetchAssessmentSummary(studentId: number): Promise<AsmSummary> {
  const res = await axios.get(`${API_BASE_URL}/students/${studentId}/assessments/summary`, { ...opts(), params: { limit: 5 } })
  if (!res.data?.success) throw new Error('Unable to load assessments summary.')
  return res.data.data
}

/** Legacy messages: 403 → hide the card, 404 → "No fee history available.", else generic. */
export async function fetchFeeSummary(studentId: number): Promise<{ summary: FeeSummary | null; forbidden: boolean; error: string | null }> {
  try {
    const res = await axios.get(`${API_BASE_URL}/students/${studentId}/fee-summary`, opts())
    return res.data?.success ? { summary: res.data.data, forbidden: false, error: null } : { summary: null, forbidden: false, error: 'Unable to load fee summary.' }
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    if (status === 403) return { summary: null, forbidden: true, error: null }
    return { summary: null, forbidden: false, error: status === 404 ? 'No fee history available.' : 'Unable to load fee summary.' }
  }
}

/** Legacy: a 403 shows the empty state (no error). */
export async function fetchFeeHistory(studentId: number): Promise<{ items: FeeHistoryItem[]; error: string | null }> {
  try {
    const res = await axios.get(`${API_BASE_URL}/students/${studentId}/fees?limit=10`, opts())
    return res.data?.success && Array.isArray(res.data.items) ? { items: res.data.items, error: null } : { items: [], error: 'Unable to load fee history.' }
  } catch (err) {
    return { items: [], error: axios.isAxiosError(err) && err.response?.status === 403 ? null : 'Unable to load fee history.' }
  }
}

export async function uploadProfileImage(userId: number, file: File): Promise<UserProfile | undefined> {
  const formData = new FormData()
  formData.append('profile_image', file)
  const res = await axios.post(`${API_BASE_URL}/users/${userId}/profile-image`, formData, {
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'multipart/form-data' },
  })
  return res.data.success ? res.data.data : undefined
}

/** Backend: profile_image required|image|max:2048 (KB). */
export const PROFILE_IMAGE_MAX_BYTES = 2048 * 1024
export function validateProfileImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file.'
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return 'Image must be 2 MB or smaller.'
  return null
}
