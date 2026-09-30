import { useState } from 'react'
import { UserPlus, UserRoundX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import AssignTeachersModal from '@/features/students/components/AssignTeachersModal'
import { classLabel, fetchClasses, fetchUnassignedStudents } from '../services/widgetsService'
import StudentListCard from './StudentListCard'

/** Gate: `dashboard.unassigned_students` (in DashboardPage). Hidden entirely when there are none, as before. */
export default function UnassignedStudentsCard() {
  // Legacy: classes failing didn't block the list; students failing → empty (card hidden).
  const students = useAsync(() => fetchUnassignedStudents().catch(() => undefined), [])
  const classes = useAsync(() => fetchClasses().catch(() => []), [])
  const [assigned, setAssigned] = useState<number[]>([])
  const [assignStudentId, setAssignStudentId] = useState<number | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const list = (students.data ?? []).filter((s) => !assigned.includes(s.id))
  if (!students.loading && list.length === 0) return null

  return (
    <>
      <StudentListCard
        title="Unassigned Students"
        icon={UserRoundX}
        iconClassName="tw:bg-destructive-soft tw:text-destructive"
        countLabel={`${list.length} with no teacher`}
        badgeVariant="destructive"
        loading={students.loading}
        students={list}
        className={(s) => classLabel(classes.data ?? [], s.class)}
        action={(s) => (
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              setAssignStudentId(s.id)
              setShowAssignModal(true)
            }}
          >
            <UserPlus aria-hidden="true" />
            Assign Teacher
          </Button>
        )}
      />
      {assignStudentId && (
        <AssignTeachersModal
          show={showAssignModal}
          onHide={() => setShowAssignModal(false)}
          studentId={assignStudentId}
          // The assigned student now has a teacher, so drop them from this list.
          onAssigned={() => setAssigned((prev) => [...prev, assignStudentId])}
        />
      )}
    </>
  )
}
