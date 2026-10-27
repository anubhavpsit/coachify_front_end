import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate, toDateInputValue } from '@/utils/date'

export type CalendarTone = 'danger' | 'warning' | 'info' | 'success' | 'muted'

export type CalendarEntry = {
  key: string
  date: string // YYYY-MM-DD
  title: string
  subtitle?: string
  tone: CalendarTone
  onOpen?: () => void
}

const DOT: Record<CalendarTone, string> = {
  danger: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  muted: 'bg-muted-foreground/40',
}
const ROW: Record<CalendarTone, string> = {
  danger: 'border-l-destructive',
  warning: 'border-l-warning',
  info: 'border-l-info',
  success: 'border-l-success',
  muted: 'border-l-border',
}
const TONE_LABEL: Record<CalendarTone, string> = {
  danger: 'Results pending',
  warning: 'Today',
  info: 'Upcoming',
  success: 'Done',
  muted: 'Absent / no students',
}
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Month grid with a coloured dot per test; tap a day to list that day's tests. */
export default function AssessmentCalendar({ entries, legend = ['danger', 'warning', 'info', 'success'] }: { entries: CalendarEntry[]; legend?: CalendarTone[] }) {
  const todayIso = toDateInputValue()
  const [cursor, setCursor] = useState(() => ({ y: Number(todayIso.slice(0, 4)), m: Number(todayIso.slice(5, 7)) }))
  const [selected, setSelected] = useState<string>(todayIso)

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const e of entries) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return map
  }, [entries])

  const first = new Date(cursor.y, cursor.m - 1, 1)
  const offset = (first.getDay() + 6) % 7 // Monday first
  const days = new Date(cursor.y, cursor.m, 0).getDate()
  const iso = (d: number) => `${cursor.y}-${String(cursor.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const move = (by: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m - 1 + by, 1)
      return { y: d.getFullYear(), m: d.getMonth() + 1 }
    })
  const dayEntries = byDate.get(selected) ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => move(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-sm font-semibold" aria-live="polite">
            {MONTHS[cursor.m - 1]} {cursor.y}
          </span>
          <Button size="icon-sm" variant="ghost" aria-label="Next month" onClick={() => move(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground uppercase" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${MONTHS[cursor.m - 1]} ${cursor.y}`}>
          {Array.from({ length: offset }, (_, i) => (
            <div key={`pad${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = iso(i + 1)
            const list = byDate.get(date) ?? []
            const tones = [...new Set(list.map((e) => e.tone))]
            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                aria-selected={selected === date}
                aria-label={`${formatDate(date)}: ${list.length ? `${list.length} ${list.length === 1 ? 'test' : 'tests'}` : 'no tests'}`}
                onClick={() => setSelected(date)}
                className={cn(
                  'm-0 flex aspect-square min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-solid text-sm font-semibold transition-colors',
                  selected === date ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-accent',
                  date === todayIso && selected !== date && 'border-primary/40',
                  list.length ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {i + 1}
                <span className="flex h-1.5 gap-0.5" aria-hidden="true">
                  {tones.slice(0, 3).map((t) => (
                    <span key={t} className={cn('size-1.5 rounded-full', DOT[t])} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-hidden="true">
          {legend.map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', DOT[t])} /> {TONE_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2" role="region" aria-live="polite" aria-label={`Tests on ${selected === todayIso ? 'today' : formatDate(selected)}`}>
        <div className="text-sm font-semibold">{selected === todayIso ? 'Today' : formatDate(selected)}</div>
        {dayEntries.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">No tests on this day.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {dayEntries.map((e) => {
              const body = (
                <>
                  <span className="text-sm font-semibold text-foreground">{e.title}</span>
                  {e.subtitle && <span className="text-xs text-muted-foreground">{e.subtitle}</span>}
                </>
              )
              return (
                <li key={e.key}>
                  {e.onOpen ? (
                    <button type="button" onClick={e.onOpen} className={cn('m-0 flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border border-l-4 border-solid border-border bg-transparent p-2.5 text-left hover:bg-accent', ROW[e.tone])}>
                      {body}
                    </button>
                  ) : (
                    <div className={cn('flex flex-col gap-0.5 rounded-lg border border-l-4 border-solid border-border p-2.5', ROW[e.tone])}>{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
