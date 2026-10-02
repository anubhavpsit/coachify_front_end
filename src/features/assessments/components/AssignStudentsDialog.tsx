import { useMemo, useState } from 'react'
import { CalendarDays, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getErrorMessage } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { assignStudents, fetchAssessment, type Assessment, type StudentOption } from '../services/assessmentsService'

interface Props {
  assessment: Assessment | null
  students: StudentOption[]
  studentsLoaded: boolean
  onClose: () => void
}

/** Wrapper so the inner state resets for every assessment opened. */
export default function AssignStudentsDialog(p: Props) {
  return (
    <Dialog open={!!p.assessment} onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent className="sm:max-w-xl">{p.assessment && <AssignBody key={p.assessment.id} {...p} assessment={p.assessment} />}</DialogContent>
    </Dialog>
  )
}

function AssignBody({ assessment, students, studentsLoaded, onClose }: Props & { assessment: Assessment }) {
  // Details carry the current assignments (legacy pre-selected them).
  const detail = useAsync(() => fetchAssessment(assessment.id).catch((e) => (console.error('Error loading assessment details:', e), null)), [assessment.id])
  const full = detail.data ?? assessment
  const assigned = useMemo(() => new Set((detail.data?.assignments ?? []).map((a) => a.student_id)), [detail.data])
  const [picked, setPicked] = useState<Set<number> | null>(null)
  const selected = picked ?? assigned
  const [date, setDate] = useState(assessment.scheduled_date || '')
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)

  // Only the assessment's class (legacy filter).
  const classId = (() => {
    const raw = full.class_id ?? full.class?.id ?? null
    const n = raw === null || raw === undefined ? NaN : Number(raw)
    return Number.isNaN(n) ? null : n
  })()
  const eligible = classId === null ? students : students.filter((s) => s.classId === classId)
  const shown = q.trim() ? eligible.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase())) : eligible
  // Send only students shown to this user (legacy: others would 403 for teachers).
  const visible = new Set(students.map((s) => s.id))
  const toSend = [...selected].filter((id) => visible.has(id) && (classId === null || eligible.some((s) => s.id === id)))
  const allShown = shown.length > 0 && shown.every((s) => selected.has(s.id))
  const dateError = tried && !date ? 'Pick the date of the test.' : null
  const studentError = tried && toSend.length === 0 ? 'Select at least one student.' : null

  const toggle = (id: number) =>
    setPicked(() => {
      const next = new Set(selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = async () => {
    setTried(true)
    if (!date || toSend.length === 0) return
    setSaving(true)
    try {
      const ok = await assignStudents(
        assessment.id,
        toSend.map((id) => ({ student_id: id, scheduled_date: date })),
      )
      if (ok) {
        toast.success(`Assigned to ${toSend.length} ${toSend.length === 1 ? 'student' : 'students'}.`)
        onClose()
      }
    } catch (err) {
      console.error('Error assigning students:', err)
      toast.error(getErrorMessage(err, 'Failed to assign students'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Assign students</DialogTitle>
        <DialogDescription>
          {assessment.title}
          {full.class?.name ? ` · ${full.class.name} only` : ''}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor="assign-date">
            Test date <span className="text-destructive">*</span>
          </Label>
          <div className="relative max-w-56">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="assign-date" type="date" className="pl-9" value={date} aria-invalid={!!dateError || undefined} aria-describedby={dateError ? 'assign-date-err' : undefined} onChange={(e) => setDate(e.target.value)} />
          </div>
          {dateError && (
            <p id="assign-date-err" className="m-0 text-sm text-destructive">
              {dateError}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              Students <span className="text-destructive">*</span>
            </span>
            <span className="text-xs text-muted-foreground">{toSend.length} selected</span>
            {shown.length > 0 && (
              <label className="m-0 ml-auto flex items-center gap-2 text-sm">
                <Checkbox
                  checked={allShown}
                  onCheckedChange={() =>
                    setPicked(() => {
                      const next = new Set(selected)
                      shown.forEach((s) => (allShown ? next.delete(s.id) : next.add(s.id)))
                      return next
                    })
                  }
                />
                Select all{q ? ' shown' : ''}
              </label>
            )}
          </div>
          {eligible.length > 6 && (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input type="search" className="h-9 pl-9" placeholder="Search students" aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          )}
          {!studentsLoaded || detail.loading ? (
            <div className="flex flex-col gap-2" role="status" aria-label="Loading students">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          ) : eligible.length === 0 ? (
            <EmptyState icon={Users} title="No students available for this class." className="py-4" />
          ) : (
            <ul className={cn('m-0 max-h-64 list-none overflow-y-auto rounded-lg border border-solid p-0', studentError ? 'border-destructive' : 'border-border')}>
              {shown.map((s) => (
                <li key={s.id} className="border-b border-solid border-border last:border-b-0">
                  <label className={cn('m-0 flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50', selected.has(s.id) && 'bg-primary-soft/40')}>
                    <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                    <span className="flex-1">{s.name}</span>
                    {assigned.has(s.id) && <Badge variant="secondary">Already assigned</Badge>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {studentError && <p className="m-0 text-sm text-destructive">{studentError}</p>}
          {assigned.size > 0 && <p className="m-0 text-xs text-muted-foreground">Unticking a student who is already assigned doesn&apos;t remove them; ticked ones get this date.</p>}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving} disabled={saving}>
          {saving ? 'Assigning...' : `Assign${toSend.length ? ` ${toSend.length}` : ''}`}
        </Button>
      </DialogFooter>
    </>
  )
}
