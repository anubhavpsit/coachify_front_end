import { useState } from 'react'
import { Search, Users } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import type { StudentOption } from '../services/assessmentsService'

interface Props {
  /** Already limited to the test's class. */
  students: StudentOption[]
  selected: Set<number>
  onChange: (next: Set<number>) => void
  /** Student id → date: shown ticked and locked. */
  assigned?: Map<number, string>
  loading?: boolean
  error?: string | null
  /** Marks the heading as required (Assign) or not (Create). */
  required?: boolean
  emptyText?: string
}

/** Search + select all + the list of students, for Create and Assign. */
export default function StudentPicker({ students, selected, onChange, assigned, loading, error, required, emptyText = 'No students available for this class.' }: Props) {
  const [q, setQ] = useState('')
  const shown = q.trim() ? students.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())) : students
  const pickable = shown.filter((s) => !assigned?.has(s.id))
  const allShown = pickable.length > 0 && pickable.every((s) => selected.has(s.id))
  const count = [...selected].filter((id) => students.some((s) => s.id === id) && !assigned?.has(id)).length

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Students {required && <span className="text-destructive">*</span>}</span>
        <span className="text-xs text-muted-foreground">{count} selected</span>
        {pickable.length > 0 && (
          <label className="m-0 ml-auto flex items-center gap-2 text-sm">
            <Checkbox
              checked={allShown}
              onCheckedChange={() => {
                const next = new Set(selected)
                pickable.forEach((s) => (allShown ? next.delete(s.id) : next.add(s.id)))
                onChange(next)
              }}
            />
            Select all{q ? ' shown' : ''}
          </label>
        )}
      </div>
      {students.length > 6 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" className="h-9 pl-9" placeholder="Search students" aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      {loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading students">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title={emptyText} className="py-4" />
      ) : (
        <ul className={cn('m-0 max-h-64 list-none overflow-y-auto rounded-lg border border-solid p-0', error ? 'border-destructive' : 'border-border')}>
          {shown.map((s) => {
            const already = !!assigned?.has(s.id)
            return (
              <li key={s.id} className="border-b border-solid border-border last:border-b-0">
                <label className={cn('m-0 flex items-center gap-3 px-3 py-2 text-sm', already ? 'text-muted-foreground' : 'cursor-pointer hover:bg-muted/50', selected.has(s.id) && 'bg-primary-soft/40')}>
                  <Checkbox checked={already || selected.has(s.id)} disabled={already} onCheckedChange={() => toggle(s.id)} />
                  <span className="flex-1">{s.name}</span>
                  {already && <Badge variant="secondary">Assigned · {formatDate(assigned?.get(s.id))}</Badge>}
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {error && <p className="m-0 text-sm text-destructive">{error}</p>}
    </div>
  )
}
