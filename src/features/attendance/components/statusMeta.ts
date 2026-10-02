import type { AttendanceStatus } from '../services/dailyAttendanceService'

export const STATUS_META: Record<AttendanceStatus, { label: string; short: string; on: string }> = {
  present: { label: 'Present', short: 'P', on: 'bg-success text-success-foreground' },
  absent: { label: 'Absent', short: 'A', on: 'bg-destructive text-destructive-foreground' },
  leave: { label: 'Leave', short: 'L', on: 'bg-warning text-warning-foreground' },
  not_marked: { label: 'Not Marked', short: '—', on: 'bg-muted-foreground text-card' },
}
export const STATUSES = Object.keys(STATUS_META) as AttendanceStatus[]
