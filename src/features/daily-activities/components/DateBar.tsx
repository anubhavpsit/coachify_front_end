import { useId } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { dateProblem, todayISO, yesterdayISO } from '../schemas/activityForm'

const friendly = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/** Lesson date shared by the per-student and whole-class forms. */
export default function DateBar({ value, onChange, note }: { value: string; onChange: (v: string) => void; note: string }) {
  const id = useId()
  const problem = dateProblem(value)
  const today = todayISO()
  const yesterday = yesterdayISO()

  return (
    <div className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4 tw:sm:flex-row tw:sm:items-center">
      <div className="tw:flex tw:items-center tw:gap-3">
        <span className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-primary-soft tw:text-primary">
          <CalendarDays className="tw:size-5" aria-hidden="true" />
        </span>
        <div className="tw:flex tw:flex-col">
          <label htmlFor={id} className="tw:m-0 tw:text-sm tw:font-semibold tw:text-foreground">
            Lesson date
          </label>
          <span className="tw:text-xs tw:text-muted-foreground">{problem ?? `${friendly(value)} · ${note}`}</span>
        </div>
      </div>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:sm:ml-auto">
        <Button type="button" size="sm" variant={value === today ? 'soft' : 'outline'} aria-pressed={value === today} onClick={() => onChange(today)}>
          Today
        </Button>
        <Button type="button" size="sm" variant={value === yesterday ? 'soft' : 'outline'} aria-pressed={value === yesterday} onClick={() => onChange(yesterday)}>
          Yesterday
        </Button>
        <Input id={id} type="date" className="tw:h-9 tw:w-40" max={today} value={value} aria-invalid={!!problem || undefined} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  )
}
