import { cn } from '@/lib/utils'
import { ymd, type MyStatus } from '../lib/myAttendance'

const TONE: Record<MyStatus | 'holiday', string> = {
  present: 'bg-success-soft text-success border-success/30',
  absent: 'bg-destructive-soft text-destructive border-destructive/30',
  leave: 'bg-warning-soft text-warning border-warning/30',
  not_marked: 'bg-muted/60 text-muted-foreground border-transparent',
  holiday: 'bg-info-soft text-info border-info/30',
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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Attendance calendar">
        {cells.map((date, i) => {
          if (!date) return <div key={`pad${i}`} />
          const day = Number(date.slice(8))
          const kind: MyStatus | 'holiday' = holidays.has(date) && !statusByDate.has(date) ? 'holiday' : (statusByDate.get(date) ?? 'not_marked')
          const counted = isCounted(date)
          const canRequest = correctable.has(date)
          const label = `${date}: ${LABEL[kind]}${requested.has(date) ? ', correction requested' : ''}${canRequest ? ', request a correction' : ''}`
          const cls = cn(
            'relative flex aspect-square min-h-10 flex-col items-center justify-center rounded-lg border border-solid text-sm font-semibold',
            counted || kind === 'holiday' ? TONE[kind] : 'border-transparent text-muted-foreground/50',
          )
          const dot = requested.has(date) && <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" aria-hidden="true" />
          return canRequest ? (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-label={label}
              title="Request a correction"
              onClick={() => onRequest(date)}
              className={cn(cls, 'm-0 cursor-pointer outline-none transition-transform hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50')}
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
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(LABEL) as Array<keyof typeof LABEL>).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn('size-3 rounded border border-solid', TONE[k])} aria-hidden="true" />
            {LABEL[k]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" /> Correction requested
        </span>
      </div>
    </div>
  )
}
