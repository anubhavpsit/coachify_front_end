// Pure ports of the legacy MyAttendance calculations (unit-tested).

export type MyStatus = 'present' | 'absent' | 'leave' | 'not_marked'
export type MyRecord = { id?: number; user_id: number; role: 'student' | 'teacher'; attendance_date: string; status: MyStatus }
export type CorrectionRequest = {
  id: number
  attendance_date: string
  current_status?: MyStatus | null
  requested_status: 'present' | 'absent' | 'leave'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  admin_comment?: string | null
}

export const normalizeYmd = (value: string) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? value

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Every day of the month: the record if any, else 'not_marked' — holidays without a record are skipped. */
export function monthDays(records: MyRecord[], month: number, year: number, holidays: Set<string>): MyRecord[] {
  const byDate = new Map(records.map((r) => [r.attendance_date, r] as const))
  const out: MyRecord[] = []
  const last = new Date(year, month, 0)
  for (let d = new Date(year, month - 1, 1); d <= last; d.setDate(d.getDate() + 1)) {
    const key = ymd(d)
    const rec = byDate.get(key)
    if (rec) out.push(rec)
    else if (!holidays.has(key)) out.push({ user_id: 0, role: 'student', attendance_date: key, status: 'not_marked' })
  }
  return out
}

/** Days that count: up to today and on/after admission. */
export function countedDays(days: MyRecord[], today: string, admission: string | null): MyRecord[] {
  return days.filter((r) => r.attendance_date <= today).filter((r) => !admission || r.attendance_date >= admission)
}

/** Absent/leave days with no correction request yet (legacy eligibility). */
export function correctableDays(counted: MyRecord[], requests: CorrectionRequest[]): MyRecord[] {
  const requested = new Set(requests.map((r) => r.attendance_date))
  return counted.filter((r) => r.status !== 'present' && r.status !== 'not_marked' && !requested.has(r.attendance_date))
}

export function monthInsights(counted: MyRecord[]) {
  const present = counted.filter((r) => r.status === 'present').length
  const absent = counted.filter((r) => r.status === 'absent').length
  const leave = counted.filter((r) => r.status === 'leave').length
  const notMarked = counted.filter((r) => r.status === 'not_marked').length
  // Match profile formula: present / (present + absent)
  const working = present + absent
  const percentage = working > 0 ? Math.round((present / working) * 100) : 0

  const sorted = [...counted].sort((a, b) => new Date(a.attendance_date).getTime() - new Date(b.attendance_date).getTime())
  let longestPresent = 0
  let current = 0
  let lastDate: Date | null = null
  for (const r of sorted) {
    const d = new Date(r.attendance_date)
    const contiguous = lastDate ? d.getTime() - lastDate.getTime() <= 86400000 + 1000 : true
    if (r.status === 'present' && (contiguous || lastDate === null)) current += 1
    else if (r.status === 'present') current = 1
    else current = 0
    longestPresent = Math.max(longestPresent, current)
    lastDate = d
  }
  return { present, absent, leave, notMarked, percentage, longestPresent }
}
