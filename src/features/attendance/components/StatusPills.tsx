import { cn } from '@/lib/utils'
import type { AttendanceStatus } from '../services/dailyAttendanceService'

export const STATUS_META: Record<AttendanceStatus, { label: string; short: string; on: string }> = {
  present: { label: 'Present', short: 'P', on: 'tw:bg-success tw:text-success-foreground' },
  absent: { label: 'Absent', short: 'A', on: 'tw:bg-destructive tw:text-destructive-foreground' },
  leave: { label: 'Leave', short: 'L', on: 'tw:bg-warning tw:text-warning-foreground' },
  not_marked: { label: 'Not Marked', short: '—', on: 'tw:bg-muted-foreground tw:text-card' },
}
export const STATUSES = Object.keys(STATUS_META) as AttendanceStatus[]

/** Native radio group styled as a segmented control (keyboard: arrow keys). */
export default function StatusPills({
  name,
  value,
  onChange,
  disabled,
  label,
}: {
  name: string
  value: AttendanceStatus
  onChange: (s: AttendanceStatus) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="tw:inline-flex tw:rounded-lg tw:bg-muted tw:p-0.5">
      {STATUSES.map((s) => {
        const meta = STATUS_META[s]
        const checked = value === s
        return (
          <label
            key={s}
            title={meta.label}
            className={cn(
              'tw:m-0 tw:flex tw:h-8 tw:min-w-9 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-md tw:px-2 tw:text-xs tw:font-semibold tw:transition-colors tw:duration-150 tw:select-none',
              'tw:has-[:focus-visible]:ring-[3px] tw:has-[:focus-visible]:ring-ring/50',
              checked ? meta.on : 'tw:text-muted-foreground tw:hover:bg-card tw:hover:text-foreground',
              disabled && 'tw:cursor-not-allowed tw:opacity-50',
            )}
          >
            <input type="radio" className="tw:sr-only" name={name} value={s} checked={checked} disabled={disabled} onChange={() => onChange(s)} aria-label={meta.label} />
            <span aria-hidden="true" className="tw:sm:hidden">
              {meta.short}
            </span>
            <span aria-hidden="true" className="tw:hidden tw:sm:inline">
              {meta.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}
