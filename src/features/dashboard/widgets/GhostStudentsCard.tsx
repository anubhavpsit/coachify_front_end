import { useState } from 'react'
import { Ghost, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { markStudentInactive } from '@/features/students/services/studentsService'
import { classLabel, fetchClasses, fetchGhostStudents, type StudentSummary } from '../services/widgetsService'
import StudentListCard from './StudentListCard'

const DAYS = 30

/** Gate: `dashboard.ghost_students` (in DashboardPage). Hidden entirely when there are none, as before. */
export default function GhostStudentsCard() {
  const { data, loading } = useAsync(() => Promise.all([fetchGhostStudents(DAYS), fetchClasses()]), [])
  const [removed, setRemoved] = useState<number[]>([])
  const [confirming, setConfirming] = useState<StudentSummary | null>(null)

  const students = (data?.[0] ?? []).filter((s) => !removed.includes(s.id))
  const classes = data?.[1] ?? []

  if (!loading && students.length === 0) return null

  const markInactive = async (student: StudentSummary) => {
    try {
      await markStudentInactive(student.id)
      setRemoved((prev) => [...prev, student.id])
      toast.success(`${student.name} marked inactive.`)
    } catch {
      toast.error('Failed to mark student inactive. Please try again.')
      throw new Error('mark-inactive failed') // keep the dialog open
    }
  }

  return (
    <>
      <StudentListCard
        title="Ghost Students"
        icon={Ghost}
        iconClassName="bg-warning-soft text-warning"
        countLabel={`${students.length} not seen in ${DAYS}+ days`}
        badgeVariant="warning"
        loading={loading}
        students={students}
        showStatus
        className={(s) => classLabel(classes, s.class)}
        action={(s) => (
          <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={() => setConfirming(s)}>
            <UserMinus aria-hidden="true" />
            Mark Inactive
          </Button>
        )}
      />
      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(open) => !open && setConfirming(null)}
        title="Mark student inactive?"
        description={confirming ? `“${confirming.name}” will be marked inactive.` : undefined}
        confirmLabel="Mark Inactive"
        destructive
        onConfirm={() => (confirming ? markInactive(confirming) : undefined)}
      />
    </>
  )
}
