import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy widget components (URLs + headers).
const token = () => localStorage.getItem('authToken')

export type BirthdayUser = { id: number; name: string; role: string; dob: string; status?: string; profile_image?: string | null }
export type LowAttendanceUser = { id: number; name: string; role: string; status?: string; attendance_percentage: number; profile_image?: string | null }
export type FollowUpEnquiry = {
  id: number
  enquiry_type: 'student' | 'teacher' | string
  name: string
  contact_number: string
  status: 'active' | 'inactive' | string
  last_communication_at?: string | null
  created_at: string
}

/** BirthdayCard: GET /dashboard/birthdays/current-month */
export async function fetchMonthBirthdays(): Promise<BirthdayUser[] | undefined> {
  const response = await axios.get(`${API_BASE_URL}/dashboard/birthdays/current-month`, {
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' },
  })
  return response.data.success ? response.data.data : undefined
}

/** TodayBirthdayCard: GET /dashboard/birthday/today */
export async function fetchTodayBirthdays(): Promise<BirthdayUser[] | undefined> {
  const response = await axios.get(`${API_BASE_URL}/dashboard/birthday/today`, {
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' },
  })
  return response.data.success ? response.data.data : undefined
}

/** LowAttendanceCard: GET /attendance/low-percentage (legacy sent no Accept header) */
export async function fetchLowAttendance(): Promise<LowAttendanceUser[]> {
  const res = await axios.get(`${API_BASE_URL}/attendance/low-percentage`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  return res.data.data
}

/** EnquiriesFollowUpCard: GET /enquiries/follow-up */
export async function fetchFollowUpEnquiries() {
  const t = token()
  if (!t) throw new Error('You are not authenticated.')
  const response = await axios.get<{ success: boolean; data: FollowUpEnquiry[]; meta?: { follow_up_frequency_days?: number } }>(
    `${API_BASE_URL}/enquiries/follow-up`,
    { headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' } },
  )
  if (!response.data.success) throw new Error('Unable to load enquiries.')
  return { enquiries: response.data.data || [], frequencyDays: response.data.meta?.follow_up_frequency_days ?? null }
}

export type CoachingClass = { id: number; name: string }
export type StudentSummary = { id: number; name: string; email: string; class: string | null; status?: string; created_at?: string | null }

/** Ghost/Unassigned cards: GET /classes/{tenant_id} (to show class names) */
export async function fetchClasses(): Promise<CoachingClass[]> {
  const res = await axios.get<{ data: CoachingClass[] }>(`${API_BASE_URL}/classes/${localStorage.getItem('tenant_id')}`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  return res.data.data || []
}

/** GhostStudentsCard: GET /dashboard/ghost-students?days=N */
export async function fetchGhostStudents(days: number): Promise<StudentSummary[] | undefined> {
  const res = await axios.get<{ success: boolean; data: StudentSummary[] }>(`${API_BASE_URL}/dashboard/ghost-students?days=${days}`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  return res.data.success ? res.data.data : undefined
}

/** UnassignedStudentsCard: GET /dashboard/unassigned-students */
export async function fetchUnassignedStudents(): Promise<StudentSummary[] | undefined> {
  const res = await axios.get<{ success: boolean; data: StudentSummary[] }>(`${API_BASE_URL}/dashboard/unassigned-students`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  return res.data.success ? res.data.data : undefined
}

/** Class id → name, falling back to the raw value (legacy getClassName). */
export function classLabel(classes: CoachingClass[], classIdOrName: string | null): string {
  if (!classIdOrName) return '—'
  const found = classes.find((c) => String(c.id) === String(classIdOrName))
  return found ? found.name : classIdOrName
}
