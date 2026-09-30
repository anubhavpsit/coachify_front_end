import { cn } from '@/lib/utils'
import { ymd, type MyStatus } from '../lib/myAttendance'

const TONE: Record<MyStatus | 'holiday', string> = {
  present: 'tw:bg-success-soft tw:text-success tw:border-success/30',
  absent: 'tw:bg-destructive-soft tw:text-destructive tw:border-destructive/30',
  leave: 'tw:bg-warning-soft tw:text-warning tw:border-warning/30',
  not_marked: 'tw:bg-muted/60 tw:text-muted-foreground tw:border-transparent',
  holiday: 'tw:bg-info-soft tw:text-info tw:border-info/30',
}
const LABEL: Record<MyStatus | 'holiday', string> = { present: 'Present', absent: 'Absent', leave: 'Leave', not_marked: 'Not marked', holiday: 'Holiday' }
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  month: number
  year: number
  statusByDate: Map<string, MyStatus>
  holidays: Set<string>
  /** Days outside the counted range (future / before admission) render muted. */
  isCounted: (date: string) => boolean
  correctable: Set<string>
  requested: Set<string>
  onRequest: (date: string) => void
}

/** Month grid coloured by status; eligible absent/leave days open a correction request. */
export default function AttendanceCalendar({ month, year, statusByDate, holidays, isCounted, correctable, requested, onRequest }: Props) {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: Array<string | null> = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(year, month - 1, i + 1)))]

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <div className="tw:grid tw:grid-cols-7 tw:gap-1 tw:text-center tw:text-[11px] tw:font-semibold tw:uppercase tw:text-muted-foreground" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="tw:grid tw:grid-cols-7 tw:gap-1" role="grid" aria-label="Attendance calendar">
        {cells.map((date, i) => {
          if (!date) return <div key={`pad${i}`} />
          const day = Number(date.slice(8))
          const kind: MyStatus | 'holiday' = holidays.has(date) && !statusByDate.has(date) ? 'holiday' : (statusByDate.get(date) ?? 'not_marked')
          const counted = isCounted(date)
          const canRequest = correctable.has(date)
          const label = `${date}: ${LABEL[kind]}${requested.has(date) ? ', correction requested' : ''}${canRequest ? ', request a correction' : ''}`
          const cls = cn(
            'tw:relative tw:flex tw:aspect-square tw:min-h-10 tw:flex-col tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-solid tw:text-sm tw:font-semibold',
            counted || kind === 'holiday' ? TONE[kind] : 'tw:border-transparent tw:text-muted-foreground/50',
          )
          const dot = requested.has(date) && <span className="tw:absolute tw:top-1 tw:right-1 tw:size-1.5 tw:rounded-full tw:bg-primary" aria-hidden="true" />
          return canRequest ? (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-label={label}
              title="Request a correction"
              onClick={() => onRequest(date)}
              className={cn(cls, 'tw:m-0 tw:cursor-pointer tw:outline-none tw:transition-transform tw:hover:scale-105 tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50')}
            >
              {day}
              {dot}
            </button>
          ) : (
            <div key={date} role="gridcell" aria-label={label} className={cls}>
              {day}
              {dot}
            </div>
          )
        })}
      </div>
      <div className="tw:flex tw:flex-wrap tw:gap-3 tw:text-xs tw:text-muted-foreground">
        {(Object.keys(LABEL) as Array<keyof typeof LABEL>).map((k) => (
          <span key={k} className="tw:flex tw:items-center tw:gap-1.5">
            <span className={cn('tw:size-3 tw:rounded tw:border tw:border-solid', TONE[k])} aria-hidden="true" />
            {LABEL[k]}
          </span>
        ))}
        <span className="tw:flex tw:items-center tw:gap-1.5">
          <span className="tw:size-1.5 tw:rounded-full tw:bg-primary" aria-hidden="true" /> Correction requested
        </span>
      </div>
    </div>
  )
}
