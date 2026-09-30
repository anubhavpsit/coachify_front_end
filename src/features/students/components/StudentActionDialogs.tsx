import { useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { todayInputValue } from '@/features/people/schemas/person'
import { studentClassId } from '../lib/studentRows'
import { promoteStudent, reactivateStudent, type ClassOption, type Student, type YearOption } from '../services/studentsService'

type Opt = number | ''
const toOpt = (v: string): Opt => (v === '' ? '' : Number(v))

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="tw:grid tw:gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function YearSelect({ id, value, onChange, years, disabled }: { id: string; value: Opt; onChange: (v: Opt) => void; years: YearOption[]; disabled?: boolean }) {
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(toOpt(e.target.value))} disabled={disabled}>
      <option value="">Current</option>
      {years.map((y) => (
        <option key={y.id} value={y.id}>
          {y.name}
          {y.is_current ? ' (current)' : ''}
        </option>
      ))}
    </NativeSelect>
  )
}

function ClassSelect({ id, value, onChange, classes, disabled }: { id: string; value: Opt; onChange: (v: Opt) => void; classes: ClassOption[]; disabled?: boolean }) {
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(toOpt(e.target.value))} disabled={disabled}>
      <option value="">Select Class</option>
      {classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </NativeSelect>
  )
}

const currentYearId = (years: YearOption[]): Opt => years.find((y) => y.is_current)?.id ?? ''
const inferredClass = (s: Student): Opt => {
  const c = studentClassId(s)
  return typeof c === 'number' && c ? c : ''
}

/** Single-student promote. Year + class required (legacy disabled the button until both were set). */
export function PromoteDialog({ student, years, classes, onClose, onDone }: { student: Student; years: YearOption[]; classes: ClassOption[]; onClose: () => void; onDone: () => void }) {
  const [toYear, setToYear] = useState<Opt>(currentYearId(years))
  const [toClass, setToClass] = useState<Opt>(inferredClass(student))
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!toYear || !toClass) return
    setBusy(true)
    try {
      await promoteStudent(student.id, toYear, toClass)
      toast.success(`${student.name} promoted.`)
      onDone()
      onClose()
    } catch {
      toast.error('Promote failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote Student</DialogTitle>
          <DialogDescription>
            Pre-filled from {student.name}'s current enrolment. Adjust as needed.
          </DialogDescription>
        </DialogHeader>
        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
          <Field id="promote-year" label="To Academic Year">
            <YearSelect id="promote-year" value={toYear} onChange={setToYear} years={years} disabled={busy} />
          </Field>
          <Field id="promote-class" label="To Class">
            <ClassSelect id="promote-class" value={toClass} onChange={setToClass} classes={classes} disabled={busy} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!toYear || !toClass}>
            {busy ? 'Promoting...' : 'Promote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Reactivate (rejoin). Same body as before; empty fields are omitted. */
export function ReactivateDialog({
  student,
  years,
  classes,
  onClose,
  onDone,
}: {
  student: Student
  years: YearOption[]
  classes: ClassOption[]
  onClose: () => void
  onDone: (status: string) => void
}) {
  const [date, setDate] = useState(todayInputValue())
  const [year, setYear] = useState<Opt>(currentYearId(years))
  const [cls, setCls] = useState<Opt>(inferredClass(student))
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      const status = await reactivateStudent(student.id, { rejoinedDate: date, yearId: year, classId: cls })
      toast.success(`${student.name} reactivated.`)
      onDone(status)
      onClose()
    } catch (error) {
      console.error('Error reactivating student:', error)
      toast.error('Reactivate failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivate Student</DialogTitle>
          <DialogDescription>
            Reactivating <strong>{student.name}</strong> resets their fee cycle from the rejoin date and creates a new enrollment for the selected academic year.
          </DialogDescription>
        </DialogHeader>
        <div className="tw:grid tw:gap-4">
          <Field id="react-date" label="Rejoined Date">
            <Input id="react-date" type="date" value={date} max={todayInputValue()} onChange={(e) => setDate(e.target.value)} disabled={busy} />
          </Field>
          <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
            <Field id="react-year" label="Academic Year">
              <YearSelect id="react-year" value={year} onChange={setYear} years={years} disabled={busy} />
            </Field>
            <Field id="react-class" label="Class">
              <ClassSelect id="react-class" value={cls} onChange={setCls} classes={classes} disabled={busy} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {busy ? 'Reactivating...' : 'Reactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Bulk promote is not implemented on the backend yet — same "coming soon" behaviour as before. */
export function BulkPromoteDialog({ years, classes, initialFromYear, onClose }: { years: YearOption[]; classes: ClassOption[]; initialFromYear: Opt; onClose: () => void }) {
  const [fromYear, setFromYear] = useState<Opt>(initialFromYear)
  const [fromClass, setFromClass] = useState<Opt>('')
  const [toYear, setToYear] = useState<Opt>(currentYearId(years))
  const [toClass, setToClass] = useState<Opt>('')
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="tw:flex tw:items-center tw:gap-2">
            Bulk Promote Students <Badge variant="warning">Coming soon</Badge>
          </DialogTitle>
          <DialogDescription>Move a whole class to the next academic year in one go.</DialogDescription>
        </DialogHeader>
        <Alert variant="info">
          <Info aria-hidden="true" />
          <AlertDescription>Bulk promote will be available in a future update. Use “Promote” on a student's row for now.</AlertDescription>
        </Alert>
        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
          <Field id="bulk-from-year" label="From Academic Year">
            <YearSelect id="bulk-from-year" value={fromYear} onChange={setFromYear} years={years} />
          </Field>
          <Field id="bulk-from-class" label="From Class">
            <ClassSelect id="bulk-from-class" value={fromClass} onChange={setFromClass} classes={classes} />
          </Field>
          <Field id="bulk-to-year" label="To Academic Year">
            <YearSelect id="bulk-to-year" value={toYear} onChange={setToYear} years={years} />
          </Field>
          <Field id="bulk-to-class" label="To Class">
            <ClassSelect id="bulk-to-class" value={toClass} onChange={setToClass} classes={classes} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => toast.info('Coming soon! Bulk promote will be available in a future update.')}>Promote</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
