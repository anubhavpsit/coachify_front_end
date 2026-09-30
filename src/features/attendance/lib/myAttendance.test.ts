import { describe, expect, it } from 'vitest'
import { correctableDays, countedDays, monthDays, monthInsights, normalizeYmd, type MyRecord } from './myAttendance'

const rec = (d: string, status: MyRecord['status']): MyRecord => ({ user_id: 1, role: 'student', attendance_date: d, status })

describe('my attendance logic (legacy parity)', () => {
  it('fills the month, skipping unrecorded holidays', () => {
    const days = monthDays([rec('2026-02-02', 'present')], 2, 2026, new Set(['2026-02-03']))
    expect(days).toHaveLength(27) // 28 days - 1 holiday
    expect(days.find((d) => d.attendance_date === '2026-02-02')?.status).toBe('present')
    expect(days.find((d) => d.attendance_date === '2026-02-03')).toBeUndefined()
  })
  it('counts only up to today and from admission', () => {
    const days = [rec('2026-09-01', 'present'), rec('2026-09-10', 'absent'), rec('2026-09-20', 'present')]
    expect(countedDays(days, '2026-09-15', '2026-09-05').map((d) => d.attendance_date)).toEqual(['2026-09-10'])
  })
  it('correctable = absent/leave without an existing request', () => {
    const counted = [rec('2026-09-01', 'absent'), rec('2026-09-02', 'leave'), rec('2026-09-03', 'present'), rec('2026-09-04', 'not_marked')]
    const reqs = [{ id: 1, attendance_date: '2026-09-02', requested_status: 'present' as const, reason: 'x', status: 'pending' as const, created_at: '' }]
    expect(correctableDays(counted, reqs).map((d) => d.attendance_date)).toEqual(['2026-09-01'])
  })
  it('insights: present/(present+absent) and longest streak', () => {
    const counted = [rec('2026-09-01', 'present'), rec('2026-09-02', 'present'), rec('2026-09-03', 'absent'), rec('2026-09-04', 'present'), rec('2026-09-05', 'leave')]
    expect(monthInsights(counted)).toEqual({ present: 3, absent: 1, leave: 1, notMarked: 0, percentage: 75, longestPresent: 2 })
  })
  it('normalizes timestamps to dates', () => {
    expect(normalizeYmd('2026-09-01T00:00:00.000000Z')).toBe('2026-09-01')
  })
})
