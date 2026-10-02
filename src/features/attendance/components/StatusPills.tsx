import { cn } from '@/lib/utils'
import type { AttendanceStatus } from '../services/dailyAttendanceService'
import { STATUSES, STATUS_META } from './statusMeta'

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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-muted p-0.5">
      {STATUSES.map((s) => {
        const meta = STATUS_META[s]
        const checked = value === s
        return (
          <label
            key={s}
            title={meta.label}
            className={cn(
              'm-0 flex h-8 min-w-9 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors duration-150 select-none',
              'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
              checked ? meta.on : 'text-muted-foreground hover:bg-card hover:text-foreground',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input type="radio" className="sr-only" name={name} value={s} checked={checked} disabled={disabled} onChange={() => onChange(s)} aria-label={meta.label} />
            <span aria-hidden="true" className="sm:hidden">
              {meta.short}
            </span>
            <span aria-hidden="true" className="hidden sm:inline">
              {meta.label}
            </span>
          </label>
        )
      })}
    </div>
  )
}
