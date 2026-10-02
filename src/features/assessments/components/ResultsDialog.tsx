import { useState } from 'react'
import { ClipboardList, FileCheck2, Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { FILE_ACCEPT, resultRowErrors, toResultPayloads, type ResultRow } from '../schemas/assessmentForms'
import { fetchAssessment, saveResults, uploadAnswerSheet, type Assessment } from '../services/assessmentsService'

interface Props {
  assessment: Assessment | null
  onClose: () => void
  onSaved: () => void
}

export default function ResultsDialog(p: Props) {
  return (
    <Dialog open={!!p.assessment} onOpenChange={(o) => !o && p.onClose()}>
      <DialogContent className="sm:max-w-3xl">{p.assessment && <ResultsBody key={p.assessment.id} {...p} assessment={p.assessment} />}</DialogContent>
    </Dialog>
  )
}

const pct = (m: string, t: string) => {
  const a = Number(m)
  const b = Number(t)
  return m !== '' && t !== '' && b > 0 && !Number.isNaN(a) ? Math.round((a / b) * 100) : null
}

function ResultsBody({ assessment, onClose, onSaved }: Props & { assessment: Assessment }) {
  const detail = useAsync(() => fetchAssessment(assessment.id).catch((e) => (console.error('Error loading assessment details:', e), null)), [assessment.id])
  const [rows, setRows] = useState<ResultRow[] | null>(null)
  // Seed the editable rows once the details arrive (legacy shape).
  const [seededFor, setSeededFor] = useState<unknown>(null)
  if (detail.data && seededFor !== detail.data) {
    setSeededFor(detail.data)
    const d = detail.data
    setRows(
      (d.assignments || []).map((a) => ({
        student_id: a.student_id,
        student_name: a.student?.name || `Student #${a.student_id}`,
        marks_obtained: a.result ? String(a.result.marks_obtained) : '',
        total_marks: a.result ? String(a.result.total_marks) : d.total_marks ? String(d.total_marks) : '',
        teacher_notes: a.result?.teacher_notes || '',
        answerFile: null,
      })),
    )
  }
  const [tried, setTried] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const list = rows ?? []
  const errors = list.map(resultRowErrors)
  const invalid = errors.some((e) => Object.keys(e).length > 0)
  const withMarks = toResultPayloads(list).length
  const withFiles = list.filter((r) => r.answerFile).length
  const nothing = withMarks === 0 && withFiles === 0
  const set = (i: number, patch: Partial<ResultRow>) => setRows((prev) => (prev ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const askSave = () => {
    setTried(true)
    if (invalid || nothing) return
    setConfirming(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const results = toResultPayloads(list)
      // The API needs at least one result; answer sheets alone are uploaded without it.
      if (results.length) await saveResults(assessment.id, results)
      for (const r of list.filter((x) => x.answerFile)) {
        await uploadAnswerSheet(assessment.id, r.student_id, r.answerFile!)
      }
      toast.success('Results and files saved successfully')
      onSaved()
      onClose()
    } catch (err) {
      console.error('Error saving results or files:', err)
      toast.error('Failed to save results or files')
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Enter results</DialogTitle>
        <DialogDescription>
          {assessment.title} · out of {assessment.total_marks}. Leave marks empty to skip a student.
        </DialogDescription>
      </DialogHeader>

      {detail.loading || !rows ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading results">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No students assigned yet." description="Assign students first, then come back to enter marks." className="py-6" />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-solid border-border">
          <ul className="m-0 list-none divide-y divide-border p-0">
            {rows.map((r, i) => {
              const e = errors[i]
              const percent = pct(r.marks_obtained, r.total_marks)
              const id = `res-${r.student_id}`
              return (
                <li key={r.student_id} className="grid gap-3 p-3 sm:grid-cols-[minmax(8rem,1fr)_auto_minmax(10rem,1.2fr)_auto] sm:items-start">
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm font-medium">{r.student_name}</span>
                    {percent !== null && !e.marks_obtained && (
                      <span className={cn('rounded-full px-1.5 text-xs font-semibold', percent >= 75 ? 'bg-success-soft text-success' : percent >= 40 ? 'bg-warning-soft text-warning' : 'bg-destructive-soft text-destructive')}>
                        {percent}%
                      </span>
                    )}
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
                        value={r.marks_obtained}
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
                        value={r.total_marks}
                        aria-invalid={!!e.total_marks || undefined}
                        onChange={(ev) => set(i, { total_marks: ev.target.value })}
                      />
                    </div>
                    {(e.marks_obtained || e.total_marks) && <p className="m-0 text-xs text-destructive">{e.marks_obtained ?? e.total_marks}</p>}
                  </div>
                  <Input aria-label={`Notes for ${r.student_name}`} className="h-9" placeholder="Notes (optional)" value={r.teacher_notes} onChange={(ev) => set(i, { teacher_notes: ev.target.value })} />
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
                      <label className="m-0 flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-input px-2.5 text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground">
                        <Paperclip className="size-3.5" aria-hidden="true" /> Answer sheet
                        <input type="file" accept={FILE_ACCEPT} className="sr-only" aria-label={`Answer sheet for ${r.student_name}`} onChange={(ev) => set(i, { answerFile: ev.target.files?.[0] ?? null })} />
                      </label>
                    )}
                    {e.answerFile && <p className="m-0 text-xs text-destructive">{e.answerFile}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {tried && nothing && rows && rows.length > 0 && <p className="m-0 text-sm text-destructive">Enter marks for at least one student.</p>}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={askSave} disabled={saving || !rows || rows.length === 0}>
          Save results{withMarks ? ` (${withMarks})` : ''}
        </Button>
      </DialogFooter>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Save results for ${withMarks} ${withMarks === 1 ? 'student' : 'students'}?`}
        description={
          withMarks
            ? 'The assessment is marked completed, students are notified that results are out, and the question paper becomes visible to them (it can no longer be edited).'
            : `Only ${withFiles} answer ${withFiles === 1 ? 'sheet' : 'sheets'} will be uploaded.`
        }
        confirmLabel="Yes, save"
        cancelLabel="No"
        onConfirm={save}
      />
    </>
  )
}
