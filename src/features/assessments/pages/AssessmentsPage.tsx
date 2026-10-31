import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, PenLine, Plus, Sparkles, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import AttachmentPreviewModal from '@/components/common/AttachmentPreviewModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import PageHeader from '@/components/common/PageHeader'
import SegmentedControl from '@/components/common/SegmentedControl'
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
import { getErrorMessage } from '@/lib/apiClient'
import AssignStudentsDialog from '../components/AssignStudentsDialog'
import CreateAssessmentDialog from '../components/CreateAssessmentDialog'
import FilesDialog from '../components/FilesDialog'
import QuestionPaperDialog from '../components/QuestionPaperDialog'
import ResultsDialog from '../components/ResultsDialog'
import TestStepsDialog from '../components/TestStepsDialog'
import AssessmentCalendar, { type CalendarEntry } from '../components/AssessmentCalendar'
import { toDateInputValue } from '@/utils/date'
import { ASSESSMENT_STAGE, STAGE_TAB_LABEL, STAGE_TABS, tabFor, type StageTab } from '../lib/stages'
import {
  deleteAssessment,
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


/** The next date a student sits it (rescheduling moves students, not the test's own date). */
const testDate = (a: Assessment) => a.progress?.next_date ?? a.scheduled_date ?? ''

/**
 * Route gate: assessments.view | .manage | .grade | role teacher (unchanged).
 * In-page gates kept exactly (Q6 — role based):
 *  - auto-generate toggle, approve / mark pending, hide or remove a file: role coaching_admin;
 *  - question paper: coaching_admin | teacher;
 *  - students list: teacher → /teachers/students, others → /students;
 *  - edit / delete: coaching_admin | teacher (the list only has their own) | staff with assessments.manage.
 */
export default function AssessmentsPage() {
  const { hasRole, canAny } = usePermission()
  const isAdmin = hasRole(ROLES.COACHING_ADMIN)
  const isTeacher = hasRole(ROLES.TEACHER)
  const canEdit = isAdmin || isTeacher || canAny(['assessments.manage'])

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [subjectFilter, setSubjectFilter] = useState('')
  // ?approval=pending from the dashboard or the morning message
  const approvalParam = searchParams.get('approval') === 'pending'
  const [approvalFilter, setApprovalFilter] = useState(approvalParam ? 'pending' : '')
  const filtered = assessments.filter(
    (a) => (!subjectFilter || String(a.subject_id) === subjectFilter) && (!approvalFilter || (approvalFilter === 'approved' ? a.is_admin_approved : !a.is_admin_approved)),
  )
  const tabCounts = useMemo(() => {
    const c: Record<StageTab, number> = { needs_results: 0, today: 0, upcoming: 0, done: 0, all: filtered.length }
    for (const a of filtered) c[tabFor(a.progress?.stage)]++
    return c
  }, [filtered])
  // ?tab= from a notification; a focused row shows in "All"; otherwise open on
  // "Needs results" when something is waiting.
  const urlTab = searchParams.get('tab') as StageTab | null
  const [tabChoice, setTabChoice] = useState<StageTab | null>(urlTab && STAGE_TABS.includes(urlTab) ? urlTab : null)
  const tab: StageTab = tabChoice ?? (focusId || approvalParam ? 'all' : tabCounts.needs_results > 0 ? 'needs_results' : 'all')
  const shown = tab === 'all' ? filtered : filtered.filter((a) => tabFor(a.progress?.stage) === tab)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const [createOpen, setCreateOpen] = useState(false)
  const [assignFor, setAssignFor] = useState<Assessment | null>(null)
  const [resultsFor, setResultsFor] = useState<Assessment | null>(null)
  const [filesFor, setFilesFor] = useState<Assessment | null>(null)
  const [paperFor, setPaperFor] = useState<number | null>(null)
  const [preview, setPreview] = useState<AssessmentFile | null>(null)
  const [approvalFor, setApprovalFor] = useState<Assessment | null>(null)
  const [editFor, setEditFor] = useState<Assessment | null>(null)
  const [deleteFor, setDeleteFor] = useState<Assessment | null>(null)
  // The test's own screen: it steps aside while one of its actions is open, then comes back.
  const [stepsId, setStepsId] = useState<number | null>(null)
  const stepsFor = assessments.find((a) => a.id === stepsId) ?? null
  const actionOpen = !!(assignFor || resultsFor || filesFor || paperFor || editFor || deleteFor || approvalFor)
  const [autoConfirm, setAutoConfirm] = useState<boolean | null>(null)

  // Calendar: one entry per (assessment, test date), coloured by what's left to do.
  const calendarEntries = useMemo<CalendarEntry[]>(() => {
    const today = toDateInputValue()
    return filtered.flatMap((a) => {
      const dates = a.progress?.dates?.length ? a.progress.dates : a.scheduled_date ? [{ date: a.scheduled_date.slice(0, 10), total: 0, open: 0 }] : []
      return dates.map((d) => ({
        key: `${a.id}-${d.date}`,
        date: d.date,
        title: a.title,
        subtitle: [a.subject?.subject, a.class?.name, d.total ? `${d.total - d.open}/${d.total} done` : 'No students yet'].filter(Boolean).join(' · '),
        tone: d.total === 0 ? 'muted' : d.open === 0 ? 'success' : d.date < today ? 'danger' : d.date === today ? 'warning' : 'info',
        onOpen: () => setStepsId(a.id),
      }))
    })
  }, [filtered])

  // "Enter results" notification → open that assessment's results straight away (once).
  const openResultsId = searchParams.get('results') === '1' ? focusId : null
  const [deepLinked, setDeepLinked] = useState<number | null>(null)
  if (openResultsId !== null && !list.loading && deepLinked !== openResultsId) {
    setDeepLinked(openResultsId)
    const target = assessments.find((a) => a.id === openResultsId)
    if (target) setResultsFor(target)
  }
  // …and drop ?results=1 so closing the dialog doesn't reopen it.
  useEffect(() => {
    if (deepLinked === null) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('results')
        return next
      },
      { replace: true },
    )
  }, [deepLinked, setSearchParams])

  const changeApproval = async () => {
    const a = approvalFor!
    try {
      const updated = await setAssessmentApproval(a.id, !a.is_admin_approved)
      if (updated) {
        setPatched((p) => ({ ...p, [a.id]: { ...a, ...updated } })) // keeps subject, progress…
        toast.success(updated.is_admin_approved ? `“${a.title}” approved.` : `“${a.title}” marked as pending.`)
      }
    } catch (err) {
      console.error('Error updating approval:', err)
      toast.error('Failed to update approval.')
      throw err
    }
  }

  const askDelete = (a: Assessment) => {
    if ((a.progress?.result_out ?? 0) > 0) {
      toast.error(`“${a.title}” has saved results, so it can't be deleted. Use Results → Cancel for students who won't sit it.`)
      return
    }
    setDeleteFor(a)
  }

  const confirmDelete = async () => {
    const a = deleteFor!
    try {
      await deleteAssessment(a.id)
      toast.success(`“${a.title}” deleted.`)
      setStepsId(null)
      list.reload()
    } catch (err) {
      console.error('Error deleting assessment:', err)
      toast.error(getErrorMessage(err, 'Failed to delete the assessment.'))
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
              <button type="button" onClick={() => setStepsId(a.id)} className="m-0 cursor-pointer border-0 bg-transparent p-0 text-left font-medium text-foreground hover:underline">
                {a.title}
              </button>
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
      accessorFn: testDate,
      cell: ({ row }) => (testDate(row.original) ? formatDate(testDate(row.original)) : <span className="text-muted-foreground">Not set</span>),
    },
    {
      id: 'progress',
      header: 'Progress',
      accessorFn: (a) => a.progress?.stage ?? '',
      cell: ({ row }) => {
        const a = row.original
        const p = a.progress
        if (!p) return <span className="text-muted-foreground">-</span>
        const stage = ASSESSMENT_STAGE[p.stage]
        const closed = p.result_out + p.absent
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={stage.variant}>{stage.label}</Badge>
            {p.total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {p.result_out}/{p.total - p.cancelled} results{p.absent ? ` · ${p.absent} absent` : ''}
              </span>
            )}
            {p.stage === 'needs_results' && p.oldest_pending_date && <span className="text-xs text-destructive">Pending since {formatDate(p.oldest_pending_date)}</span>}
            {p.stage === 'not_assigned' && canEdit && (
              <Button size="xs" variant="outline" onClick={() => setAssignFor(a)}>
                <UserPlus aria-hidden="true" /> Add students
              </Button>
            )}
            {(p.stage === 'needs_results' || p.stage === 'today') && (
              <Button size="xs" variant={p.stage === 'needs_results' ? 'destructive' : 'outline'} onClick={() => setResultsFor(a)}>
                <PenLine aria-hidden="true" /> Enter results{p.awaiting_results + p.today > 0 && closed > 0 ? ` (${p.awaiting_results + p.today} left)` : ''}
              </Button>
            )}
          </div>
        )
      },
    },
    {
      id: 'approval',
      header: 'Approval',
      accessorFn: (a) => (a.is_admin_approved ? 'Approved' : 'Pending'),
      cell: ({ row }) => {
        const a = row.original
        return (
          <div className="flex max-w-40 flex-col items-start gap-1">
            <Badge variant={a.is_admin_approved ? 'success' : 'warning'}>{a.is_admin_approved ? 'Approved' : isAdmin ? 'Pending' : 'Waiting for admin'}</Badge>
            {!a.is_admin_approved && <span className="text-xs text-muted-foreground">Students can&apos;t see this test yet.</span>}
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
      cell: ({ row }) => (
        <Button size="sm" variant="outline" aria-label={`Open ${row.original.title}`} onClick={() => setStepsId(row.original.id)}>
          Open
        </Button>
      ),
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<'list' | 'calendar'>
          label="View"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
      </div>

      {view === 'calendar' ? (
        <Card className="p-5">
          <AssessmentCalendar entries={calendarEntries} legend={['danger', 'warning', 'info', 'success', 'muted']} />
        </Card>
      ) : (
        <>
          <SegmentedControl<StageTab>
            label="Assessments by stage"
            className="flex-wrap self-start"
            value={tab}
            onChange={(v) => {
              setTabChoice(v)
              setSearchParams(
                (prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('tab')
                  return next
                },
                { replace: true },
              )
            }}
            options={STAGE_TABS.map((t) => ({ value: t, label: `${STAGE_TAB_LABEL[t]} (${tabCounts[t]})` }))}
          />

          <Card className="gap-0 overflow-hidden py-0">
            <DataTable
              columns={columns}
              data={shown}
              loading={list.loading && assessments.length === 0}
              getRowId={(a) => String(a.id)}
              rowProps={(a) => ({ id: `assessment-row-${a.id}`, className: a.id === focusId ? 'bg-primary-soft/50 shadow-[inset_4px_0_0_var(--color-primary)]' : undefined })}
              searchPlaceholder="Search assessments"
              emptyIcon={ClipboardList}
              emptyTitle={tab === 'needs_results' ? 'No results waiting — all caught up. 🎉' : 'No assessments found.'}
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
        </>
      )}

      <CreateAssessmentDialog
        open={createOpen || !!editFor}
        onClose={() => {
          setCreateOpen(false)
          setEditFor(null)
        }}
        assessment={editFor}
        subjects={catalog.data?.subjects ?? []}
        classes={catalog.data?.classes ?? []}
        loading={catalog.loading}
        students={students.data ?? []}
        studentsLoaded={!students.loading}
        onCreated={(a) => {
          setAdded((prev) => [a, ...prev])
          setStepsId(a.id) // shows what's next
          toast.success(a.is_admin_approved ? `“${a.title}” created.` : `“${a.title}” created. Students can see it once an admin approves it.`)
        }}
        onUpdated={(a) => {
          toast.success(`“${a.title}” saved.`)
          list.reload()
        }}
      />
      <AssignStudentsDialog assessment={assignFor} students={students.data ?? []} studentsLoaded={!students.loading} onClose={() => setAssignFor(null)} onAssigned={list.reload} />
      <ResultsDialog assessment={resultsFor} onClose={() => setResultsFor(null)} onSaved={list.reload} />
      <FilesDialog assessment={filesFor} isAdmin={isAdmin} onClose={() => setFilesFor(null)} onPreview={setPreview} />
      <QuestionPaperDialog assessmentId={paperFor} onClose={() => setPaperFor(null)} onChanged={list.reload} />

      <TestStepsDialog
        assessment={stepsFor}
        open={!!stepsFor && !actionOpen && !createOpen}
        onClose={() => setStepsId(null)}
        isAdmin={isAdmin}
        canEdit={canEdit}
        canBuildPaper={isAdmin || isTeacher}
        onApprove={() => setApprovalFor(stepsFor)}
        onAssign={() => setAssignFor(stepsFor)}
        onBuildPaper={() => setPaperFor(stepsId)}
        onFiles={() => setFilesFor(stepsFor)}
        onResults={() => setResultsFor(stepsFor)}
        onEdit={() => setEditFor(stepsFor)}
        onDelete={() => stepsFor && askDelete(stepsFor)}
      />

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
              <strong>{approvalFor?.title}</strong> will be approved, with any files uploaded for it. Assigned students who haven&apos;t been told yet will be notified.
            </>
          )
        }
        confirmLabel={approvalFor?.is_admin_approved ? 'Yes, mark pending' : 'Yes, approve'}
        cancelLabel="No"
        onConfirm={changeApproval}
      />
      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="Delete this assessment?"
        description={
          <>
            <strong>{deleteFor?.title}</strong> will be removed with its question paper and files. This can&apos;t be undone.
            {(deleteFor?.progress?.total ?? 0) > 0 && ' Students who were told about it will hear that it is cancelled.'}
            {deleteFor?.topic_id ? ' It won\'t be auto-generated again for this topic.' : ''}
          </>
        }
        confirmLabel="Yes, delete"
        cancelLabel="No"
        destructive
        onConfirm={confirmDelete}
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
