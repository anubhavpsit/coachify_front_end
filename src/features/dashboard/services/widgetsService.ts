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
