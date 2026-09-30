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
      <DialogContent className="tw:gap-5">
        <DialogHeader>
          <DialogTitle>Assign Teachers</DialogTitle>
          <DialogDescription>Choose one or more teachers for this student.</DialogDescription>
        </DialogHeader>

        {teachers.length > 6 && (
          <div className="tw:relative">
            <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teachers" aria-label="Search teachers" className="tw:pl-9" />
          </div>
        )}

        <div
          role="group"
          aria-label="Teachers"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="tw:-mx-2 tw:max-h-72 tw:overflow-y-auto tw:px-2"
        >
          {loading ? (
            <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading teachers">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="tw:h-10" />
              ))}
            </div>
          ) : error ? (
            <div className="tw:flex tw:flex-col tw:items-start tw:gap-2" role="alert">
              <p className="tw:m-0 tw:text-sm tw:text-destructive">Unable to load teachers.</p>
              <Button variant="outline" size="sm" onClick={reload}>
                Try again
              </Button>
            </div>
          ) : teachers.length === 0 ? (
            <EmptyState icon={Users} title="No teachers available." />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} title={`No teachers match “${query}”.`} />
          ) : (
            <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-1 tw:p-0">
              {visible.map((teacher) => {
                const id = `teacher-${teacher.id}`
                return (
                  <li key={teacher.id}>
                    <label
                      htmlFor={id}
                      className="tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-transparent tw:px-3 tw:py-2.5 tw:transition-colors tw:hover:bg-accent tw:has-[[data-state=checked]]:border-primary/30 tw:has-[[data-state=checked]]:bg-primary-soft/60"
                    >
                      <Checkbox id={id} checked={selected.includes(teacher.id)} onCheckedChange={() => toggle(teacher.id)} disabled={saving} />
                      <span className="tw:flex tw:min-w-0 tw:flex-col">
                        <span className="tw:truncate tw:text-sm tw:font-medium tw:text-foreground">{teacher.name}</span>
                        <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{teacher.email}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {invalid && (
          <p id={errorId} className="tw:m-0 tw:-mt-2 tw:text-xs tw:font-medium tw:text-destructive">
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
