import { useMemo, useState } from 'react'
import { ClipboardList, FileText, Paperclip, Plus, Sparkles, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import AttachmentPreviewModal from '@/components/common/AttachmentPreviewModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { usePermission } from '@/permissions'
import { formatDate } from '@/utils/date'
import { useFocusRow } from '@/utils/useFocusRow'
import AssignStudentsDialog from '../components/AssignStudentsDialog'
import CreateAssessmentDialog from '../components/CreateAssessmentDialog'
import FilesDialog from '../components/FilesDialog'
import QuestionPaperDialog from '../components/QuestionPaperDialog'
import ResultsDialog from '../components/ResultsDialog'
import {
  fetchAssessments,
  fetchAutoAssessment,
  fetchStudentOptions,
  fetchSubjectsAndClasses,
  fileUrl,
  setAssessmentApproval,
  setAutoAssessment,
  type Assessment,
  type AssessmentFile,
} from '../services/assessmentsService'

const STATUS_VARIANT: Record<string, 'secondary' | 'info' | 'success' | 'destructive' | 'warning'> = {
  draft: 'secondary',
  scheduled: 'info',
  upcoming: 'info',
  completed: 'success',
  cancelled: 'destructive',
}

/**
 * Route gate: assessments.view | .manage | .grade | role teacher (unchanged).
 * In-page gates kept exactly (Q6 — role based):
 *  - auto-generate toggle, approve / mark pending (assessment and files), remove file: role coaching_admin;
 *  - question paper: coaching_admin | teacher;
 *  - students list: teacher → /teachers/students, others → /students.
 */
export default function AssessmentsPage() {
  const { hasRole } = usePermission()
  const isAdmin = hasRole(ROLES.COACHING_ADMIN)
  const isTeacher = hasRole(ROLES.TEACHER)

  const list = useAsync(() => fetchAssessments().catch((e) => (console.error('Error fetching assessments:', e), [] as Assessment[])), [])
  const [patched, setPatched] = useState<Record<number, Assessment>>({})
  const [added, setAdded] = useState<Assessment[]>([])
  const [syncedFor, setSyncedFor] = useState<unknown>(null)
  if (list.data !== syncedFor) {
    setSyncedFor(list.data)
    setPatched({})
    setAdded([])
  }
  const assessments = useMemo(() => [...added, ...(list.data ?? [])].map((a) => patched[a.id] ?? a), [added, list.data, patched])

  const catalog = useAsync(() => fetchSubjectsAndClasses().catch((e) => (console.error('Error loading subjects/classes:', e), { subjects: [], classes: [] })), [])
  const students = useAsync(() => fetchStudentOptions(isTeacher).catch((e) => (console.error('Error loading students:', e), [])), [isTeacher])
  const auto = useAsync(() => fetchAutoAssessment().catch((e) => (console.error('Error loading auto-assessment setting:', e), false)), [])
  const [autoOverride, setAutoOverride] = useState<boolean | null>(null)
  const autoOn = autoOverride ?? auto.data ?? false

  const focusId = useFocusRow('assessment', 'assessment-row-', !list.loading)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const shown = assessments.filter(
    (a) => (!subjectFilter || String(a.subject_id) === subjectFilter) && (!approvalFilter || (approvalFilter === 'approved' ? a.is_admin_approved : !a.is_admin_approved)),
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [assignFor, setAssignFor] = useState<Assessment | null>(null)
  const [resultsFor, setResultsFor] = useState<Assessment | null>(null)
  const [filesFor, setFilesFor] = useState<Assessment | null>(null)
  const [paperFor, setPaperFor] = useState<number | null>(null)
  const [preview, setPreview] = useState<AssessmentFile | null>(null)
  const [approvalFor, setApprovalFor] = useState<Assessment | null>(null)
  const [autoConfirm, setAutoConfirm] = useState<boolean | null>(null)

  const changeApproval = async () => {
    const a = approvalFor!
    try {
      const updated = await setAssessmentApproval(a.id, !a.is_admin_approved)
      if (updated) {
        setPatched((p) => ({ ...p, [a.id]: updated }))
        toast.success(updated.is_admin_approved ? `“${a.title}” approved.` : `“${a.title}” marked as pending.`)
      }
    } catch (err) {
      console.error('Error updating approval:', err)
      toast.error('Failed to update approval.')
      throw err
    }
  }

  const toggleAuto = async () => {
    const next = autoConfirm!
    try {
      setAutoOverride(await setAutoAssessment(next))
      toast.success(next ? 'Auto-generate is on.' : 'Auto-generate is off.')
    } catch (err) {
      console.error('Error updating auto-assessment setting:', err)
      toast.error('Failed to update the setting.')
      throw err
    }
  }

  const columns: ColumnDef<Assessment, unknown>[] = [
    {
      id: 'title',
      header: 'Assessment',
      accessorFn: (a) => a.title,
      cell: ({ row }) => {
        const a = row.original
        return (
          <div className="flex max-w-xs flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-1.5 font-medium text-foreground">
              {a.title}
              {a.source === 'auto' && (
                <Badge variant="soft" title="Created automatically">
                  <Sparkles aria-hidden="true" /> Auto
                </Badge>
              )}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {a.total_marks} marks{a.description ? ` · ${a.description}` : ''}
            </span>
          </div>
        )
      },
    },
    { id: 'subject', header: 'Subject', accessorFn: (a) => a.subject?.subject ?? '', cell: ({ row }) => (row.original.subject ? <Badge variant="soft">{row.original.subject.subject}</Badge> : '-') },
    { id: 'class', header: 'Class', accessorFn: (a) => a.class?.name ?? '', cell: ({ row }) => row.original.class?.name ?? <span className="text-muted-foreground">Any</span> },
    { id: 'teacher', header: 'Teacher', accessorFn: (a) => a.teacher?.name ?? '', cell: ({ row }) => row.original.teacher?.name ?? <span className="text-muted-foreground">-</span> },
    {
      id: 'date',
      header: 'Date',
      accessorFn: (a) => a.scheduled_date ?? '',
      cell: ({ row }) => (row.original.scheduled_date ? formatDate(row.original.scheduled_date) : <span className="text-muted-foreground">Not set</span>),
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (a) => a.status,
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'secondary'} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'approval',
      header: 'Approval',
      accessorFn: (a) => (a.is_admin_approved ? 'Approved' : 'Pending'),
      cell: ({ row }) => {
        const a = row.original
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={a.is_admin_approved ? 'success' : 'warning'}>{a.is_admin_approved ? 'Approved' : 'Pending'}</Badge>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setApprovalFor(a)}
                className="m-0 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-primary hover:underline"
              >
                {a.is_admin_approved ? 'Mark as pending' : 'Approve'}
              </button>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const a = row.original
        return (
          <div className="flex items-center justify-end gap-0.5">
            <IconAction label={`Assign students to ${a.title}`} onClick={() => setAssignFor(a)}>
              <UserPlus aria-hidden="true" />
            </IconAction>
            <IconAction label={`Enter results for ${a.title}`} onClick={() => setResultsFor(a)}>
              <ClipboardList aria-hidden="true" />
            </IconAction>
            <IconAction label={`Files for ${a.title}`} onClick={() => setFilesFor(a)}>
              <Paperclip aria-hidden="true" />
            </IconAction>
            {(isAdmin || isTeacher) && (
              <span className="relative">
                <IconAction label={`Question paper for ${a.title}`} onClick={() => setPaperFor(a.id)}>
                  <FileText aria-hidden="true" />
                </IconAction>
                {typeof a.paper_questions_count === 'number' && a.paper_questions_count > 0 && (
                  <span className="pointer-events-none absolute -top-1 -right-1 min-w-4 rounded-full bg-info px-1 text-center text-[10px] leading-4 font-bold text-white" aria-hidden="true">
                    {a.paper_questions_count}
                  </span>
                )}
              </span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Assessments"
        description="Create tests, assign them to students, build question papers and enter results."
        className="mb-0"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" /> Create Assessment
          </Button>
        }
      />

      {isAdmin && (
        <Card className="py-4">
          <CardContent className="flex flex-wrap items-center gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span id="auto-label" className="text-sm font-semibold">
                Auto-generate assessments
              </span>
              <span className="text-xs text-muted-foreground">
                When on, the system creates an assessment for any topic taught more than 10 days ago that has no assessment yet, drafts a question paper for the teacher to review, and notifies the
                teacher and students.
              </span>
            </div>
            <label className="m-0 flex items-center gap-2 text-sm font-medium">
              <Switch aria-labelledby="auto-label" checked={autoOn} disabled={auto.loading} onCheckedChange={(v) => setAutoConfirm(v)} />
              {autoOn ? 'On' : 'Off'}
            </label>
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <DataTable
          columns={columns}
          data={shown}
          loading={list.loading && assessments.length === 0}
          getRowId={(a) => String(a.id)}
          rowProps={(a) => ({ id: `assessment-row-${a.id}`, className: a.id === focusId ? 'bg-primary-soft/50 shadow-[inset_4px_0_0_var(--color-primary)]' : undefined })}
          searchPlaceholder="Search assessments"
          emptyIcon={ClipboardList}
          emptyTitle="No assessments found."
          emptyAction={
            <Button size="sm" variant="soft" onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" /> Create the first one
            </Button>
          }
          pageSize={focusId ? undefined : 25}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect aria-label="Subject" className="w-full sm:w-40" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="">All subjects</option>
                {(catalog.data?.subjects ?? []).map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.subject}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect aria-label="Approval" className="w-full sm:w-40" value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)}>
                <option value="">Any approval</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </NativeSelect>
            </div>
          }
        />
      </Card>

      <CreateAssessmentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        subjects={catalog.data?.subjects ?? []}
        classes={catalog.data?.classes ?? []}
        loading={catalog.loading}
        onCreated={(a) => {
          setAdded((prev) => [a, ...prev])
          toast.success(`“${a.title}” created.`, { action: { label: 'Assign students', onClick: () => setAssignFor(a) } })
        }}
      />
      <AssignStudentsDialog assessment={assignFor} students={students.data ?? []} studentsLoaded={!students.loading} onClose={() => setAssignFor(null)} />
      <ResultsDialog assessment={resultsFor} onClose={() => setResultsFor(null)} onSaved={list.reload} />
      <FilesDialog assessment={filesFor} isAdmin={isAdmin} onClose={() => setFilesFor(null)} onPreview={setPreview} />
      <QuestionPaperDialog assessmentId={paperFor} onClose={() => setPaperFor(null)} onChanged={list.reload} />

      <ConfirmDialog
        open={!!approvalFor}
        onOpenChange={(o) => !o && setApprovalFor(null)}
        title={approvalFor?.is_admin_approved ? 'Mark this assessment as pending?' : 'Approve this assessment?'}
        description={
          approvalFor?.is_admin_approved ? (
            <>
              <strong>{approvalFor.title}</strong> goes back to pending until it is approved again.
            </>
          ) : (
            <>
              <strong>{approvalFor?.title}</strong> will be approved. Assigned students who haven&apos;t been told yet will be notified.
            </>
          )
        }
        confirmLabel={approvalFor?.is_admin_approved ? 'Yes, mark pending' : 'Yes, approve'}
        cancelLabel="No"
        onConfirm={changeApproval}
      />
      <ConfirmDialog
        open={autoConfirm !== null}
        onOpenChange={(o) => !o && setAutoConfirm(null)}
        title={autoConfirm ? 'Turn on auto-generate?' : 'Turn off auto-generate?'}
        description={
          autoConfirm
            ? 'The system will start creating assessments and draft question papers on its own, and notify teachers and students.'
            : 'No new assessments will be created automatically. Existing ones are not affected.'
        }
        confirmLabel={autoConfirm ? 'Yes, turn on' : 'Yes, turn off'}
        cancelLabel="No"
        destructive={autoConfirm === false}
        onConfirm={toggleAuto}
      />

      <AttachmentPreviewModal attachment={preview} url={preview ? fileUrl(preview) : null} onHide={() => setPreview(null)} />
    </div>
  )
}
