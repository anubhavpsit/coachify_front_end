import { useId, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getErrorMessage } from '@/lib/apiClient'
import { assignTeachers, fetchTeachers } from '../services/studentsService'

interface Props {
  show: boolean
  onHide: () => void
  studentId: number
  onAssigned: () => void
}

/** Same props and requests as the legacy react-bootstrap modal. */
export default function AssignTeachersModal({ show, onHide, studentId, onAssigned }: Props) {
  const {
    data: teachers = [],
    loading,
    error,
    reload,
  } = useAsync(
    () =>
      fetchTeachers().catch((err) => {
        console.error('Error fetching teachers:', err)
        throw err
      }),
    [],
    { enabled: show },
  )
  const [selected, setSelected] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)
  const [forStudent, setForStudent] = useState(studentId)
  const errorId = useId()

  // New student → start with a clean selection (legacy kept the previous one).
  if (forStudent !== studentId) {
    setForStudent(studentId)
    setSelected([])
    setTouched(false)
  }

  const toggle = (id: number) => setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  const q = query.trim().toLowerCase()
  const visible = q ? teachers.filter((t) => `${t.name} ${t.email}`.toLowerCase().includes(q)) : teachers
  const invalid = touched && selected.length === 0

  const handleAssign = async () => {
    setTouched(true)
    if (selected.length === 0) return
    setSaving(true)
    try {
      await assignTeachers(studentId, selected)
      toast.success(selected.length === 1 ? 'Teacher assigned.' : `${selected.length} teachers assigned.`)
      onAssigned()
      onHide()
    } catch (err) {
      console.error('Error assigning teachers:', err)
      toast.error(getErrorMessage(err, 'Failed to assign teachers.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && !saving && onHide()}>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>Assign Teachers</DialogTitle>
          <DialogDescription>Choose one or more teachers for this student.</DialogDescription>
        </DialogHeader>

        {teachers.length > 6 && (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teachers" aria-label="Search teachers" className="pl-9" />
          </div>
        )}

        <div
          role="group"
          aria-label="Teachers"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="-mx-2 max-h-72 overflow-y-auto px-2"
        >
          {loading ? (
            <div className="flex flex-col gap-3" role="status" aria-label="Loading teachers">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-2" role="alert">
              <p className="m-0 text-sm text-destructive">Unable to load teachers.</p>
              <Button variant="outline" size="sm" onClick={reload}>
                Try again
              </Button>
            </div>
          ) : teachers.length === 0 ? (
            <EmptyState icon={Users} title="No teachers available." />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} title={`No teachers match “${query}”.`} />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {visible.map((teacher) => {
                const id = `teacher-${teacher.id}`
                return (
                  <li key={teacher.id}>
                    <label
                      htmlFor={id}
                      className="m-0 flex cursor-pointer items-center gap-3 rounded-lg border border-solid border-transparent px-3 py-2.5 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary/30 has-[[data-state=checked]]:bg-primary-soft/60"
                    >
                      <Checkbox id={id} checked={selected.includes(teacher.id)} onCheckedChange={() => toggle(teacher.id)} disabled={saving} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">{teacher.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{teacher.email}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {invalid && (
          <p id={errorId} className="m-0 -mt-2 text-xs font-medium text-destructive">
            Select at least one teacher.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onHide} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleAssign()} loading={saving} disabled={loading || teachers.length === 0}>
            {saving ? 'Assigning...' : selected.length > 1 ? `Assign ${selected.length}` : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
