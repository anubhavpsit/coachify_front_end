import { useMemo, useState } from 'react'
import { CalendarDays, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAsync } from '@/hooks/useAsync'
import { getErrorMessage } from '@/lib/apiClient'
import StudentPicker from './StudentPicker'
import { assignStudents, fetchAssessment, type Assessment, type StudentOption } from '../services/assessmentsService'

interface Props {
  assessment: Assessment | null
  students: StudentOption[]
  studentsLoaded: boolean
  onClose: () => void
  onAssigned?: () => void
}

/** Wrapper so the inner state resets for every assessment opened. */
export default function AssignStudentsDialog(p: Props) {
  return (
    <Dialog open={!!p.assessment} onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent className="sm:max-w-xl">{p.assessment && <AssignBody key={p.assessment.id} {...p} assessment={p.assessment} />}</DialogContent>
    </Dialog>
  )
}

function AssignBody({ assessment, students, studentsLoaded, onClose, onAssigned }: Props & { assessment: Assessment }) {
  // Details carry the current assignments: those students are shown, not changed.
  const detail = useAsync(() => fetchAssessment(assessment.id).catch((e) => (console.error('Error loading assessment details:', e), null)), [assessment.id])
  const full = detail.data ?? assessment
  const assigned = useMemo(() => new Map((detail.data?.assignments ?? []).map((a) => [a.student_id, a.scheduled_date])), [detail.data])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [date, setDate] = useState(assessment.scheduled_date || '')
  const [saving, setSaving] = useState(false)
  const [tried, setTried] = useState(false)

  // Only the assessment's class (legacy filter).
  const classId = (() => {
    const raw = full.class_id ?? full.class?.id ?? null
    const n = raw === null || raw === undefined ? NaN : Number(raw)
    return Number.isNaN(n) ? null : n
  })()
  const eligible = classId === null ? students : students.filter((s) => s.classId === classId)
  // Send only students shown to this user (legacy: others would 403 for teachers).
  const visible = new Set(students.map((s) => s.id))
  const toSend = [...selected].filter((id) => !assigned.has(id) && visible.has(id) && (classId === null || eligible.some((s) => s.id === id)))
  const dateError = tried && !date ? 'Pick the date of the test.' : null
  const studentError = tried && toSend.length === 0 ? 'Select at least one new student.' : null

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
        onAssigned?.()
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
        {!assessment.is_admin_approved && (
          <Alert>
            <Info aria-hidden="true" />
            <AlertDescription>This test is waiting for admin approval. Students will see it and be notified once it is approved.</AlertDescription>
          </Alert>
        )}
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
          <StudentPicker students={eligible} selected={selected} onChange={setSelected} assigned={assigned} loading={!studentsLoaded || detail.loading} error={studentError} required />
          {assigned.size > 0 && (
            <p className="m-0 text-xs text-muted-foreground">
              The date applies to the students you add now. To change an assigned student&apos;s date or call off their test, open Results and use Reschedule or Cancel.
            </p>
          )}
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
