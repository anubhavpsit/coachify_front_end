import type { ReactNode } from 'react'
import { BadgeCheck, Check, Clock, FileText, Hourglass, Paperclip, PenLine, Trash2, UserPlus, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { nextStep, testSteps, type StepKey, type StepState } from '../lib/testSteps'
import type { Assessment } from '../services/assessmentsService'

interface Props {
  assessment: Assessment | null
  open: boolean
  onClose: () => void
  isAdmin: boolean
  /** Add students, edit, delete: admin, teacher, staff with assessments.manage. */
  canEdit: boolean
  /** Question paper: admin, teacher. */
  canBuildPaper: boolean
  onApprove: () => void
  onAssign: () => void
  onBuildPaper: () => void
  onFiles: () => void
  onResults: () => void
  onEdit: () => void
  onDelete: () => void
}

const MARK: Record<StepState, { className: string; icon: ReactNode }> = {
  done: { className: 'bg-success-soft text-success', icon: <Check className="size-4" aria-hidden="true" /> },
  action: { className: 'bg-warning-soft text-warning', icon: <Clock className="size-4" aria-hidden="true" /> },
  waiting: { className: 'bg-warning-soft text-warning', icon: <Hourglass className="size-4" aria-hidden="true" /> },
  later: { className: 'bg-muted text-muted-foreground', icon: <Clock className="size-4" aria-hidden="true" /> },
  optional: { className: 'bg-muted text-muted-foreground', icon: <FileText className="size-4" aria-hidden="true" /> },
}

/** One screen for one test: what's done, what's next, and the action for each step. */
export default function TestStepsDialog({ assessment: a, open, onClose, isAdmin, canEdit, canBuildPaper, onApprove, onAssign, onBuildPaper, onFiles, onResults, onEdit, onDelete }: Props) {
  if (!a) return null
  const steps = testSteps(a, isAdmin)
  const next = nextStep(steps)
  const variant = (key: StepKey) => (next === key ? 'default' : 'outline')

  const actions: Record<StepKey, ReactNode> = {
    details: isAdmin && !a.is_admin_approved && (
      <Button size="sm" variant={variant('details')} onClick={onApprove}>
        <BadgeCheck aria-hidden="true" /> Approve test
      </Button>
    ),
    students: canEdit && (
      <Button size="sm" variant={variant('students')} onClick={onAssign}>
        <UserPlus aria-hidden="true" /> Add students
      </Button>
    ),
    paper: (
      <>
        {canBuildPaper && (
          <Button size="sm" variant={variant('paper')} onClick={onBuildPaper}>
            <FileText aria-hidden="true" /> {(a.paper_questions_count ?? 0) > 0 ? 'Open paper' : 'Build paper'}
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onFiles}>
          <Paperclip aria-hidden="true" /> Files
        </Button>
      </>
    ),
    results: (a.progress?.total ?? 1) > 0 && (
      <Button size="sm" variant={variant('results')} onClick={onResults}>
        <PenLine aria-hidden="true" /> {a.progress?.stage === 'done' ? 'View results' : 'Enter results'}
      </Button>
    ),
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{a.title}</DialogTitle>
          <DialogDescription>{[a.subject?.subject, a.class?.name, `${a.total_marks} marks`, a.teacher?.name].filter(Boolean).join(' · ')}</DialogDescription>
        </DialogHeader>

        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {steps.map((s, i) => (
            <li key={s.key} aria-current={next === s.key ? 'step' : undefined} className={cn('flex gap-3 rounded-lg p-3', next === s.key && 'bg-primary-soft/50')}>
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', MARK[s.state].className)}>{MARK[s.state].icon}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {i + 1}. {s.title}
                    {next === s.key && <Badge variant="soft">Next</Badge>}
                  </span>
                  <span className="text-sm text-muted-foreground">{s.status}</span>
                </div>
                {actions[s.key] && <div className="flex flex-wrap gap-2">{actions[s.key]}</div>}
              </div>
            </li>
          ))}
        </ol>

        <DialogFooter className="flex-wrap">
          {canEdit && (
            <>
              <Button variant="outline" className="text-destructive sm:mr-auto" onClick={onDelete}>
                <Trash2 aria-hidden="true" /> Delete
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Pencil aria-hidden="true" /> Edit details
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
