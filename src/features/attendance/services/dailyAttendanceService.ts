import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy DailyAttendance page.
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } })

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'not_marked'
export type MarkableUser = { id: number; name: string; email: string; role: 'student' | 'teacher' }
export type AttendanceRecord = { id?: number; user_id: number; role: 'student' | 'teacher'; attendance_date: string; status: AttendanceStatus; reason?: string | null }

/** Users, the day's records (merged into one record per user) and holiday status — fetched in the same order as before. */
export async function loadDay(date: string) {
  const usersRes = await axios.get(`${API_BASE_URL}/attendances/markable-users`, auth())
  const users: MarkableUser[] = usersRes.data.data || []
  const attRes = await axios.get(`${API_BASE_URL}/attendances?date=${date}`, auth())
  const records: AttendanceRecord[] = attRes.data.data || []
  const map: Record<number, AttendanceRecord> = {}
  users.forEach((u) => {
    const rec = records.find((a) => a.user_id === u.id)
    map[u.id] = rec ? { ...rec } : { user_id: u.id, role: u.role, attendance_date: date, status: 'not_marked' }
  })
  const holRes = await axios.get(`${API_BASE_URL}/admin/holidays?date=${date}`, auth())
  const holidays = holRes.data?.data ?? []
  const isHoliday = Array.isArray(holidays) && holidays.length > 0
  return { users, attendance: map, isHoliday, holidayName: isHoliday ? (holidays[0]?.name ?? '') : '' }
}

/** One POST per record, in parallel (legacy). */
export async function saveDay(attendance: Record<number, AttendanceRecord>) {
  await Promise.all(Object.values(attendance).map((att) => axios.post(`${API_BASE_URL}/attendances`, att, auth())))
}

export async function markHoliday(date: string, name?: string) {
  await axios.post(`${API_BASE_URL}/admin/holidays`, { date, name: name || undefined }, auth())
}

export async function unmarkHoliday(date: string) {
  await axios.delete(`${API_BASE_URL}/admin/holidays`, { ...auth(), data: { date } })
}
