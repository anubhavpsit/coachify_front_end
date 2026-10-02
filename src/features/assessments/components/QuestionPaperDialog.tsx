import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { BadgeCheck, CircleAlert, Info, Plus, Printer, Search, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import QuestionBody, { stripHtml } from './QuestionBody'
import { fetchAvailableQuestions, fetchPaper, fetchPaperPdf, removePaperQuestion, replacePaper, setPaperApproval, type Paper, type PaperQuestion } from '../services/assessmentsService'

const apiMessage = (err: unknown, fallback: string) => (axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback)
const STATUS: Record<Paper['status'], { label: string; variant: 'secondary' | 'warning' | 'success' | 'info' }> = {
  none: { label: 'No paper', variant: 'secondary' },
  pending: { label: 'Pending approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  released: { label: 'Released to students', variant: 'info' },
}

/** Backend: marks nullable|integer|min:1|max:100. */
const marksProblem = (v: string) => (v.trim() === '' ? null : !/^\d+$/.test(v.trim()) || Number(v) < 1 || Number(v) > 100 ? '1–100' : null)

interface Props {
  assessmentId: number | null
  onClose: () => void
  onChanged?: () => void
}

export default function QuestionPaperDialog({ assessmentId, onClose, onChanged }: Props) {
  return (
    <Dialog open={assessmentId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">{assessmentId !== null && <PaperBody key={assessmentId} id={assessmentId} onClose={onClose} onChanged={onChanged} />}</DialogContent>
    </Dialog>
  )
}

type Confirm = { kind: 'remove'; q: PaperQuestion; n: number } | { kind: 'approve' } | { kind: 'unapprove' } | { kind: 'discard' }

function PaperBody({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged?: () => void }) {
  const [paper, setPaper] = useState<Paper | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [marks, setMarks] = useState<Record<number, string>>({})
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const p = await fetchPaper(id)
      setPaper(p)
      setMarks(Object.fromEntries(p.questions.map((q) => [q.id, String(q.marks ?? '')])))
    } catch (err) {
      setError(apiMessage(err, 'Failed to load the question paper.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const after = async () => {
    await load()
    onChanged?.()
  }

  const readOnly = paper?.status === 'released'
  const dirty = !!paper && paper.questions.some((q) => (marks[q.id] ?? '') !== String(q.marks ?? ''))
  const marksInvalid = !!paper && paper.questions.some((q) => marksProblem(marks[q.id] ?? ''))
  const sum = paper ? paper.questions.reduce((s, q) => s + (Number(marks[q.id]) || 0), 0) : 0

  const run = async (fn: () => Promise<unknown>, fail: string, ok?: string) => {
    setBusy(true)
    try {
      await fn()
      if (ok) toast.success(ok)
      await after()
    } catch (err) {
      toast.error(apiMessage(err, fail))
      throw err
    } finally {
      setBusy(false)
    }
  }

  const saveMarks = () =>
    run(
      () => replacePaper(id, paper!.questions.map((q) => ({ question_id: q.id, marks: Number(marks[q.id]) || undefined }))),
      'Failed to save marks.',
      'Marks saved.',
    ).catch(() => {})

  const print = async () => {
    setBusy(true)
    try {
      const url = URL.createObjectURL(await fetchPaperPdf(id))
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      toast.error(axios.isAxiosError(err) && err.response?.status === 422 ? 'Add at least one question before printing.' : 'Failed to generate the PDF.')
    } finally {
      setBusy(false)
    }
  }

  const close = () => (dirty ? setConfirm({ kind: 'discard' }) : onClose())

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          Question paper {paper && <Badge variant={STATUS[paper.status].variant}>{STATUS[paper.status].label}</Badge>}
        </DialogTitle>
        <DialogDescription>
          {paper ? (
            <>
              {paper.title}
              {paper.topic ? ` — ${paper.topic.name}` : ''} · {paper.questions.length} {paper.questions.length === 1 ? 'question' : 'questions'}
            </>
          ) : (
            'Loading…'
          )}
        </DialogDescription>
      </DialogHeader>

      {loading && !paper ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading question paper">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : paper ? (
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
          {readOnly && (
            <Alert>
              <Info aria-hidden="true" />
              <AlertDescription>Results are in — this paper is now visible to students and can no longer be edited.</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', sum === paper.total_marks ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
              {sum}/{paper.total_marks} marks
            </span>
            {sum !== paper.total_marks && paper.questions.length > 0 && <span className="text-xs text-muted-foreground">Question marks don&apos;t add up to the total yet.</span>}
            <div className="ml-auto flex flex-wrap gap-2">
              {!readOnly && (
                <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
                  <Plus aria-hidden="true" /> {adding ? 'Close' : 'Add questions'}
                </Button>
              )}
              {paper.status === 'pending' && (
                <Button size="sm" variant="success" disabled={busy || dirty} title={dirty ? 'Save marks first' : undefined} onClick={() => setConfirm({ kind: 'approve' })}>
                  <BadgeCheck aria-hidden="true" /> Approve paper
                </Button>
              )}
              {paper.status === 'approved' && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm({ kind: 'unapprove' })}>
                  <Undo2 aria-hidden="true" /> Un-approve
                </Button>
              )}
            </div>
          </div>

          {adding && !readOnly && (
            <AddQuestionsPanel
              id={id}
              busy={busy}
              onAdd={async (ids) => {
                const merged = [...paper.questions.map((q) => ({ question_id: q.id, marks: q.marks ?? undefined })), ...ids.map((qid) => ({ question_id: qid }))]
                await run(() => replacePaper(id, merged), 'Failed to add questions.', `${ids.length} ${ids.length === 1 ? 'question' : 'questions'} added.`)
                setAdding(false)
              }}
            />
          )}

          {paper.questions.length === 0 ? (
            <EmptyState icon={Plus} title="No questions on this paper yet." description="Use “Add questions” to build it." className="py-6" />
          ) : (
            <ol className="m-0 flex list-none flex-col divide-y divide-border rounded-lg border border-solid border-border p-0">
              {paper.questions.map((q, i) => {
                const problem = marksProblem(marks[q.id] ?? '')
                return (
                  <li key={q.id} className="flex gap-3 p-3">
                    <span className="w-6 shrink-0 pt-0.5 text-right text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <QuestionBody q={q} />
                      <div className="flex flex-wrap items-center gap-2">
                        {q.difficulty && (
                          <Badge variant="secondary" className="capitalize">
                            {q.difficulty}
                          </Badge>
                        )}
                        <label className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                          Marks
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            className="h-8 w-20"
                            disabled={readOnly}
                            value={marks[q.id] ?? ''}
                            aria-invalid={!!problem || undefined}
                            onChange={(e) => setMarks((m) => ({ ...m, [q.id]: e.target.value }))}
                          />
                        </label>
                        {problem && <span className="text-xs text-destructive">Marks must be a whole number from 1 to 100.</span>}
                      </div>
                    </div>
                    {!readOnly && (
                      <Button size="icon-sm" variant="ghost" className="text-destructive hover:bg-destructive-soft" disabled={busy} aria-label={`Remove question ${i + 1}`} onClick={() => setConfirm({ kind: 'remove', q, n: i + 1 })}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      ) : null}

      <DialogFooter className="flex-wrap">
        {paper && paper.questions.length > 0 && (
          <Button variant="outline" onClick={print} disabled={busy}>
            <Printer aria-hidden="true" /> Print / Download PDF
          </Button>
        )}
        <Button variant="outline" onClick={close}>
          Close
        </Button>
        {paper && !readOnly && paper.questions.length > 0 && (
          <Button onClick={saveMarks} disabled={busy || !dirty || marksInvalid}>
            Save marks
          </Button>
        )}
      </DialogFooter>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === 'remove'
            ? `Remove question ${confirm.n}?`
            : confirm?.kind === 'approve'
              ? 'Approve this question paper?'
              : confirm?.kind === 'unapprove'
                ? 'Un-approve this question paper?'
                : 'Discard unsaved marks?'
        }
        description={
          confirm?.kind === 'remove'
            ? 'It is taken off this paper. The question stays in the question bank.'
            : confirm?.kind === 'approve'
              ? 'The paper is marked ready. It stays hidden from students until results are published.'
              : confirm?.kind === 'unapprove'
                ? 'It goes back to pending so it can be edited and approved again.'
                : 'Your changes to the question marks will be lost.'
        }
        confirmLabel={confirm?.kind === 'remove' ? 'Yes, remove' : confirm?.kind === 'discard' ? 'Discard' : 'Yes'}
        cancelLabel="No"
        destructive={confirm?.kind === 'remove' || confirm?.kind === 'discard'}
        onConfirm={async () => {
          const c = confirm!
          if (c.kind === 'discard') return onClose()
          if (c.kind === 'remove') return run(() => removePaperQuestion(id, c.q.id), 'Failed to remove the question.', 'Question removed.')
          return run(() => setPaperApproval(id, c.kind === 'approve'), 'Failed to update approval.', c.kind === 'approve' ? 'Paper approved.' : 'Paper moved back to pending.')
        }}
      />
    </>
  )
}

function AddQuestionsPanel({ id, busy, onAdd }: { id: number; busy: boolean; onAdd: (ids: number[]) => Promise<void> }) {
  const [q, setQ] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [query, setQuery] = useState({ q: '', difficulty: '' })
  const [items, setItems] = useState<PaperQuestion[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    let alive = true
    fetchAvailableQuestions(id, query.q, query.difficulty)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setItems([]))
    return () => {
      alive = false
    }
  }, [id, query])

  const search = () => {
    setItems(null)
    setQuery({ q, difficulty })
  }
  const chosen = useMemo(() => (items ?? []).filter((x) => selected.has(x.id)).map((x) => x.id), [items, selected])

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-solid border-primary/30 bg-primary-soft/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input className="h-9 pl-9" placeholder="Search question text…" aria-label="Search questions" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        </div>
        <NativeSelect size="sm" aria-label="Difficulty" className="w-36" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </NativeSelect>
        <Button size="sm" variant="outline" onClick={search}>
          Search
        </Button>
        <Button size="sm" disabled={busy || chosen.length === 0} onClick={() => onAdd(chosen).catch(() => {})}>
          <Plus aria-hidden="true" /> Add{chosen.length ? ` (${chosen.length})` : ''}
        </Button>
      </div>
      {items === null ? (
        <Skeleton className="h-16" />
      ) : items.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">No more questions available for this topic.</p>
      ) : (
        <ul className="m-0 max-h-60 list-none divide-y divide-border overflow-y-auto rounded-md border border-solid border-border bg-card p-0">
          {items.map((x) => (
            <li key={x.id}>
              <label className="m-0 flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-muted/50">
                <Checkbox
                  className="mt-0.5"
                  checked={selected.has(x.id)}
                  onCheckedChange={(v) =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (v === true) next.add(x.id)
                      else next.delete(x.id)
                      return next
                    })
                  }
                  aria-label={`Select question: ${stripHtml(x.question_html).slice(0, 60)}`}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <QuestionBody q={x} />
                  {x.difficulty && (
                    <Badge variant="secondary" className="w-fit capitalize">
                      {x.difficulty}
                    </Badge>
                  )}
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
