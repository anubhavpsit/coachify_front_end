import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import { normalizeYmd, ymd, type CorrectionRequest, type MyRecord } from '../lib/myAttendance'

// Requests copied verbatim from the legacy MyAttendance page.
const opts = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' } })

export type ProfileStats = {
  percentage: number | null
  notMarked: number | null
  admission: string | null
  lifetime: { present?: number; absent?: number; leave?: number } | null
}

/** Records + my requests are required; holidays and profile stats are best-effort (legacy). */
export async function loadMyMonth(month: number, year: number, userId?: number) {
  const atts = await axios.get(`${API_BASE_URL}/my/attendance?month=${month}&year=${year}`, opts())
  const records: MyRecord[] = (atts.data.data || []).map((r: MyRecord) => ({ ...r, attendance_date: normalizeYmd(String(r.attendance_date)) }))
  const reqs = await axios.get(`${API_BASE_URL}/attendance-corrections/mine`, opts())
  const requests: CorrectionRequest[] = (reqs.data.data || []).map((r: CorrectionRequest) => ({ ...r, attendance_date: normalizeYmd(String(r.attendance_date)) }))

  let holidays = new Set<string>()
  try {
    const first = ymd(new Date(year, month - 1, 1))
    const last = ymd(new Date(year, month, 0))
    const res = await axios.get(`${API_BASE_URL}/admin/holidays?from=${first}&to=${last}`, opts())
    holidays = new Set((res.data?.data || []).map((h: { holiday_date: string }) => normalizeYmd(String(h.holiday_date))))
  } catch {
    /* best effort */
  }

  const stats: ProfileStats = { percentage: null, notMarked: null, admission: null, lifetime: null }
  if (userId) {
    try {
      const prof = await axios.get(`${API_BASE_URL}/users/${userId}`, opts())
      const u = prof.data?.data || {}
      if (typeof u.attendance_percentage === 'number') stats.percentage = u.attendance_percentage
      if (typeof u.not_marked_days === 'number') stats.notMarked = u.not_marked_days
      const adm = u.admission_date || u.created_at
      if (adm) stats.admission = ymd(new Date(adm))
      if (u.attendance_stats) {
        const num = (v: unknown) => (typeof v === 'number' ? v : undefined)
        stats.lifetime = { present: num(u.attendance_stats.present_days), absent: num(u.attendance_stats.absent_days), leave: num(u.attendance_stats.leave_days) }
      }
    } catch {
      /* best effort */
    }
  }
  return { records, requests, holidays, stats }
}

export async function requestCorrection(body: { attendance_date: string; requested_status: 'present' | 'absent' | 'leave'; reason: string }) {
  await axios.post(`${API_BASE_URL}/attendance-corrections`, body, opts())
}
