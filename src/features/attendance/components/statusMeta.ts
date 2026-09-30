import type { AttendanceStatus } from '../services/dailyAttendanceService'

export const STATUS_META: Record<AttendanceStatus, { label: string; short: string; on: string }> = {
  present: { label: 'Present', short: 'P', on: 'tw:bg-success tw:text-success-foreground' },
  absent: { label: 'Absent', short: 'A', on: 'tw:bg-destructive tw:text-destructive-foreground' },
  leave: { label: 'Leave', short: 'L', on: 'tw:bg-warning tw:text-warning-foreground' },
  not_marked: { label: 'Not Marked', short: '—', on: 'tw:bg-muted-foreground tw:text-card' },
}
export const STATUSES = Object.keys(STATUS_META) as AttendanceStatus[]
