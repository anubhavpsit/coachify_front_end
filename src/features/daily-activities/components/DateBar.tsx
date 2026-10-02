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
    <div className="flex flex-col gap-3 rounded-xl border border-solid border-border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <CalendarDays className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <label htmlFor={id} className="m-0 text-sm font-semibold text-foreground">
            Lesson date
          </label>
          <span className="text-xs text-muted-foreground">{problem ?? `${friendly(value)} · ${note}`}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <Button type="button" size="sm" variant={value === today ? 'soft' : 'outline'} aria-pressed={value === today} onClick={() => onChange(today)}>
          Today
        </Button>
        <Button type="button" size="sm" variant={value === yesterday ? 'soft' : 'outline'} aria-pressed={value === yesterday} onClick={() => onChange(yesterday)}>
          Yesterday
        </Button>
        <Input id={id} type="date" className="h-9 w-40" max={today} value={value} aria-invalid={!!problem || undefined} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  )
}
