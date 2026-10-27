import { useMemo, useState } from 'react'
import axios from 'axios'
import { Ban, CalendarClock, ClipboardList, FileCheck2, Paperclip, RotateCcw, UserX, X } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAsync } from '@/hooks/useAsync'
import { fetchUnreadCount } from '@/lib/myNotifications'
import { cn } from '@/lib/utils'
import { formatDate, toDateInputValue } from '@/utils/date'
import { ASSIGNMENT_STAGE, STAGE_ORDER } from '../lib/stages'
import { FILE_ACCEPT, resultRowErrors, toResultPayloads, type ResultRow } from '../schemas/assessmentForms'
import { bulkUpdateAssignments, fetchAssessment, saveResults, uploadAnswerSheet, type Assessment, type AssignmentStage, type BulkAction } from '../services/assessmentsService'

interface Props {
  assessment: Assessment | null
  onClose: () => void
  onSaved: () => void
}

export default function ResultsDialog(p: Props) {
  return (
    <Dialog open={!!p.assessment} onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent className="sm:max-w-4xl">{p.assessment && <ResultsBody key={p.assessment.id} {...p} assessment={p.assessment} />}</DialogContent>
    </Dialog>
  )
}

const pct = (m: string, t: string) => {
  const a = Number(m)
  const b = Number(t)
  return m !== '' && t !== '' && b > 0 && !Number.isNaN(a) ? Math.round((a / b) * 100) : null
}
const apiMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback
  const d = err.response?.data
  const first = d?.errors ? (Object.values(d.errors as Record<string, string[]>)[0]?.[0] ?? null) : null
  return first ?? d?.message ?? fallback
}

const ACTIONS: Record<BulkAction, { label: string; done: string; icon: typeof Ban }> = {
  reschedule: { label: 'Reschedule', done: 'rescheduled', icon: CalendarClock },
  absent: { label: 'Mark absent', done: 'marked absent', icon: UserX },
  cancel: { label: 'Cancel', done: 'cancelled', icon: Ban },
  reopen: { label: 'Reopen', done: 'reopened', icon: RotateCcw },
}

function ResultsBody({ assessment, onClose, onSaved }: Props & { assessment: Assessment }) {
  const detail = useAsync(() => fetchAssessment(assessment.id), [assessment.id])
  const [rows, setRows] = useState<ResultRow[] | null>(null)
  // Seed the editable rows whenever fresh details arrive (also after a bulk action).
  const [seededFor, setSeededFor] = useState<unknown>(null)
  if (detail.data && seededFor !== detail.data) {
    setSeededFor(detail.data)
    const d = detail.data
    setRows(
      [...(d.assignments || [])]
        .sort((a, b) => (STAGE_ORDER[a.stage as AssignmentStage] ?? 9) - (STAGE_ORDER[b.stage as AssignmentStage] ?? 9))
        .map((a) => ({
          student_id: a.student_id,
          student_name: a.student?.name || `Student #${a.student_id}`,
          marks_obtained: a.result ? String(a.result.marks_obtained) : '',
          total_marks: a.result ? String(a.result.total_marks) : d.total_marks ? String(d.total_marks) : '',
          teacher_notes: a.result?.teacher_notes || '',
          answerFile: null,
          absent: a.stage === 'absent',
          initialAbsent: a.stage === 'absent',
          scheduled_date: a.scheduled_date,
          stage: a.stage,
        })),
    )
  }
  const [tried, setTried] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulk, setBulk] = useState<BulkAction | null>(null)
  const [newDate, setNewDate] = useState(toDateInputValue())

  const list = rows ?? []
  const errors = list.map(resultRowErrors)
  const invalid = errors.some((e) => Object.keys(e).length > 0)
  const payloads = toResultPayloads(list)
  const marksCount = payloads.filter((p) => !('absent' in p)).length
  const absentCount = payloads.length - marksCount
  const withFiles = list.filter((r) => r.answerFile).length
  const nothing = payloads.length === 0 && withFiles === 0
  const pending = list.filter((r) => r.stage === 'awaiting_results' || r.stage === 'today').length
  const set = (i: number, patch: Partial<ResultRow>) => setRows((prev) => (prev ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const allSelected = list.length > 0 && selected.size === list.length
  const dirty = !nothing

  const askSave = () => {
    setTried(true)
    if (invalid || nothing) return
    setConfirming(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      // The API needs at least one result; answer sheets alone are uploaded without it.
      if (payloads.length) await saveResults(assessment.id, payloads)
      for (const r of list.filter((x) => x.answerFile)) {
        await uploadAnswerSheet(assessment.id, r.student_id, r.answerFile!)
      }
      toast.success('Results saved.')
      fetchUnreadCount().catch(() => undefined) // menu badge
      onSaved()
      onClose()
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to save results or files.'))
      throw err
    } finally {
      setSaving(false)
    }
  }

  const runBulk = async () => {
    const action = bulk!
    try {
      const { message } = await bulkUpdateAssignments(assessment.id, [...selected], action, action === 'reschedule' ? newDate : undefined)
      toast.success(message)
      setSelected(new Set())
      fetchUnreadCount().catch(() => undefined) // menu badge
      onSaved()
      detail.reload()
    } catch (err) {
      toast.error(apiMessage(err, `Failed to ${ACTIONS[action].label.toLowerCase()}.`))
      throw err
    }
  }

  const summary = useMemo(() => {
    const parts = []
    if (marksCount) parts.push(`${marksCount} ${marksCount === 1 ? 'result' : 'results'}`)
    if (absentCount) parts.push(`${absentCount} absent`)
    return parts.join(' · ')
  }, [marksCount, absentCount])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Results — {assessment.title}</DialogTitle>
        <DialogDescription>
          Out of {assessment.total_marks}. Enter marks, or switch on <strong>Absent</strong> for anyone who missed it. Leave a row empty to fill it later.
          {pending > 0 && ` ${pending} ${pending === 1 ? 'student is' : 'students are'} waiting for results.`}
        </DialogDescription>
      </DialogHeader>

      {detail.error ? (
        <EmptyState icon={ClipboardList} title="Couldn't load the students." description="Close and try again." className="py-6" />
      ) : detail.loading && !rows ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading results">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No students assigned yet." description="Assign students first, then come back to enter marks." className="py-6" />
      ) : (
        <div className="flex flex-col gap-2">
          {/* Students whose test didn't happen as planned */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-solid border-border bg-muted/40 px-3 py-2">
            <label className="m-0 flex items-center gap-2 text-sm">
              <Checkbox checked={allSelected} onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(list.map((r) => r.student_id)))} aria-label="Select all students" />
              {selected.size ? `${selected.size} selected` : 'Select students to'}
            </label>
            {(Object.keys(ACTIONS) as BulkAction[]).map((a) => {
              const Icon = ACTIONS[a].icon
              return (
                <Button key={a} size="xs" variant="outline" disabled={selected.size === 0 || saving || dirty} title={dirty ? 'Save or clear the marks you entered first' : undefined} onClick={() => setBulk(a)}>
                  <Icon aria-hidden="true" /> {ACTIONS[a].label}
                </Button>
              )
            })}
          </div>

          <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-solid border-border">
            <ul className="m-0 list-none divide-y divide-border p-0">
              {list.map((r, i) => {
                const e = errors[i]
                const percent = r.absent ? null : pct(r.marks_obtained, r.total_marks)
                const id = `res-${r.student_id}`
                const stage = r.stage ? ASSIGNMENT_STAGE[r.stage as AssignmentStage] : null
                const cancelled = r.stage === 'cancelled'
                return (
                  <li key={r.student_id} className={cn('grid gap-3 p-3 lg:grid-cols-[auto_minmax(9rem,1fr)_auto_auto_minmax(8rem,1fr)_auto] lg:items-start', r.stage === 'awaiting_results' && 'bg-destructive-soft/30')}>
                    <Checkbox
                      className="mt-2.5"
                      checked={selected.has(r.student_id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (v === true) next.add(r.student_id)
                          else next.delete(r.student_id)
                          return next
                        })
                      }
                      aria-label={`Select ${r.student_name}`}
                    />
                    <div className="flex flex-col gap-1 pt-1.5">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {r.student_name}
                        {percent !== null && !e.marks_obtained && (
                          <span className={cn('rounded-full px-1.5 text-xs font-semibold', percent >= 75 ? 'bg-success-soft text-success' : percent >= 40 ? 'bg-warning-soft text-warning' : 'bg-destructive-soft text-destructive')}>
                            {percent}%
                          </span>
                        )}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {stage && <Badge variant={stage.variant}>{stage.label}</Badge>}
                        {r.scheduled_date && formatDate(r.scheduled_date)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          id={`${id}-m`}
                          aria-label={`Marks for ${r.student_name}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          className="h-9 w-20"
                          disabled={r.absent || cancelled}
                          value={r.absent ? '' : r.marks_obtained}
                          aria-invalid={!!e.marks_obtained || undefined}
                          onChange={(ev) => set(i, { marks_obtained: ev.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">/</span>
                        <Input
                          aria-label={`Total marks for ${r.student_name}`}
                          type="number"
                          inputMode="decimal"
                          min={1}
                          className="h-9 w-20"
                          disabled={r.absent || cancelled}
                          value={r.total_marks}
                          aria-invalid={!!e.total_marks || undefined}
                          onChange={(ev) => set(i, { total_marks: ev.target.value })}
                        />
                      </div>
                      {(e.marks_obtained || e.total_marks) && <p className="m-0 text-xs text-destructive">{e.marks_obtained ?? e.total_marks}</p>}
                    </div>
                    <label className="m-0 flex h-9 items-center gap-2 text-sm">
                      <Switch checked={r.absent} disabled={cancelled} onCheckedChange={(v) => set(i, { absent: v, ...(v ? { marks_obtained: '' } : {}) })} aria-label={`${r.student_name} was absent`} />
                      Absent
                    </label>
                    <Input aria-label={`Notes for ${r.student_name}`} className="h-9" placeholder="Notes (optional)" disabled={r.absent || cancelled} value={r.teacher_notes} onChange={(ev) => set(i, { teacher_notes: ev.target.value })} />
                    <div className="flex flex-col gap-1">
                      {r.answerFile ? (
                        <span className="flex h-9 max-w-44 items-center gap-1.5 rounded-md border border-solid border-border pr-1 pl-2 text-xs">
                          <FileCheck2 className="size-3.5 shrink-0 text-success" aria-hidden="true" />
                          <span className="truncate">{r.answerFile.name}</span>
                          <button type="button" aria-label={`Remove answer sheet for ${r.student_name}`} onClick={() => set(i, { answerFile: null })} className="m-0 ml-auto flex size-6 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted">
                            <X className="size-3" aria-hidden="true" />
                          </button>
                        </span>
                      ) : (
                        <label className={cn('m-0 flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground', (r.absent || cancelled) && 'pointer-events-none opacity-50')}>
                          <Paperclip className="size-3.5" aria-hidden="true" /> Answer sheet
                          <input type="file" accept={FILE_ACCEPT} className="sr-only" aria-label={`Answer sheet for ${r.student_name}`} disabled={r.absent || cancelled} onChange={(ev) => set(i, { answerFile: ev.target.files?.[0] ?? null })} />
                        </label>
                      )}
                      {e.answerFile && <p className="m-0 text-xs text-destructive">{e.answerFile}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
      {tried && nothing && list.length > 0 && <p className="m-0 text-sm text-destructive">Enter marks or mark at least one student absent.</p>}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={askSave} disabled={saving || list.length === 0}>
          Save{summary ? ` (${summary})` : ' results'}
        </Button>
      </DialogFooter>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Save ${summary || `${withFiles} answer ${withFiles === 1 ? 'sheet' : 'sheets'}`}?`}
        description={
          marksCount
            ? 'Students with marks are told their result is out (the score isn’t in the message). Once every student has a result or is marked absent, the assessment is marked done.'
            : absentCount
              ? 'These students are marked absent.'
              : `Only ${withFiles} answer ${withFiles === 1 ? 'sheet' : 'sheets'} will be uploaded.`
        }
        confirmLabel="Yes, save"
        cancelLabel="No"
        onConfirm={save}
      />

      <ConfirmDialog
        open={bulk !== null}
        onOpenChange={(o) => !o && setBulk(null)}
        title={bulk ? `${ACTIONS[bulk].label} ${selected.size} ${selected.size === 1 ? 'student' : 'students'}?` : ''}
        description={
          bulk === 'reschedule' ? (
            <span className="flex flex-col gap-2">
              <span>Pick the new date. Students are told about the new date; anyone who already has a result is left as they are.</span>
              <Input type="date" aria-label="New date" min={toDateInputValue()} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </span>
          ) : bulk === 'cancel' ? (
            'Their test is called off and they are told. Students with a result are left as they are. You can reopen it later.'
          ) : bulk === 'absent' ? (
            'They are marked absent (no result). Students with a result are left as they are.'
          ) : (
            'Absent or cancelled students go back to waiting for their test.'
          )
        }
        confirmLabel={bulk ? `Yes, ${ACTIONS[bulk].label.toLowerCase()}` : 'Yes'}
        cancelLabel="No"
        destructive={bulk === 'cancel'}
        onConfirm={runBulk}
      />
    </>
  )
}
