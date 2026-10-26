import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ArrowDown, ArrowUp, CircleAlert, Plus, Printer, RefreshCw, Search, Settings2, Sparkles, Trash2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import QuestionBody, { stripHtml } from '@/features/assessments/components/QuestionBody'
import { autoPickQuestions, fetchAvailable, fetchWorksheet, QUESTION_TYPES, saveWorksheetQuestions, type Difficulty, type Worksheet, type WorksheetQuestion } from '../services/worksheetsService'

const apiMessage = (err: unknown, fallback: string) => (axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : fallback)
const marksProblem = (v: string) => (v.trim() === '' ? null : !/^\d+$/.test(v.trim()) || Number(v) < 1 || Number(v) > 20 ? '1–20' : null)

/** "a,c" → "(a) Heat; (c) Sound"; true/false and written answers as stored. */
function answerText(q: WorksheetQuestion): string | null {
  const letters = (q.correct_answer ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  const opts = letters.filter((l) => ['a', 'b', 'c', 'd'].includes(l)).map((l) => `(${l}) ${stripHtml(String(q[`option_${l as 'a'}`] ?? ''))}`)
  if (opts.length) return opts.join('; ')
  if (q.question_type === 'true_false' && q.correct_answer) return q.correct_answer === 'true' ? 'True' : 'False'
  return q.answer_key ? stripHtml(q.answer_key) : null
}

interface Props {
  worksheetId: number | null
  onClose: () => void
  onChanged?: (w: Worksheet) => void
  onEditDetails: (w: Worksheet) => void
  onPrint: (w: Worksheet) => void
}

export default function WorksheetEditorDialog({ worksheetId, onClose, onChanged, onEditDetails, onPrint }: Props) {
  return (
    <Dialog open={worksheetId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {worksheetId !== null && <EditorBody key={worksheetId} id={worksheetId} onClose={onClose} onChanged={onChanged} onEditDetails={onEditDetails} onPrint={onPrint} />}
      </DialogContent>
    </Dialog>
  )
}

function EditorBody({ id, onClose, onChanged, onEditDetails, onPrint }: { id: number } & Omit<Props, 'worksheetId'>) {
  const [ws, setWs] = useState<Worksheet | null>(null)
  const [items, setItems] = useState<WorksheetQuestion[]>([])
  const [marks, setMarks] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [confirm, setConfirm] = useState<'discard' | 'replace' | null>(null)
  const [pick, setPick] = useState<{ count: number; difficulty: Difficulty; type: string }>({ count: 5, difficulty: 'mix', type: '' })

  const adopt = useCallback(
    (w: Worksheet) => {
      setWs(w)
      setItems(w.questions)
      setMarks(Object.fromEntries(w.questions.map((q) => [q.id, String(q.marks ?? '')])))
      onChanged?.(w)
    },
    [onChanged],
  )

  useEffect(() => {
    let alive = true
    fetchWorksheet(id)
      .then((w) => alive && (setWs(w), setItems(w.questions), setMarks(Object.fromEntries(w.questions.map((q) => [q.id, String(q.marks ?? '')])))))
      .catch((err) => alive && setError(apiMessage(err, 'Failed to load the worksheet.')))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  const dirty = !!ws && (items.map((q) => q.id).join(',') !== ws.questions.map((q) => q.id).join(',') || ws.questions.some((q) => (marks[q.id] ?? '') !== String(q.marks ?? '')))
  const marksInvalid = items.some((q) => marksProblem(marks[q.id] ?? ''))
  const total = items.reduce((s, q) => s + (Number(marks[q.id]) || 0), 0)
  const full = !!ws && items.length >= ws.max_questions

  const move = (i: number, by: -1 | 1) =>
    setItems((list) => {
      const next = [...list]
      const j = i + by
      if (j < 0 || j >= next.length) return list
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const save = async () => {
    setBusy(true)
    try {
      adopt(await saveWorksheetQuestions(id, items.map((q) => ({ question_id: q.id, marks: marks[q.id] ? Number(marks[q.id]) : null }))))
      toast.success('Worksheet saved.')
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to save the worksheet.'))
    } finally {
      setBusy(false)
    }
  }

  const autoPick = async (replace = false) => {
    setBusy(true)
    try {
      const count = replace ? Math.max(ws?.min_questions ?? 50, items.length) : pick.count
      const { data, note } = await autoPickQuestions(id, { count, difficulty: pick.difficulty, types: pick.type ? [pick.type] : [] }, replace)
      const added = replace ? data.questions.length : data.questions.length - items.length
      adopt(data)
      if (note) toast.warning(note)
      else toast.success(replace ? `Replaced with ${added} new ${added === 1 ? 'question' : 'questions'}.` : `${added} ${added === 1 ? 'question' : 'questions'} added.`)
    } catch (err) {
      toast.error(apiMessage(err, 'Failed to pick questions.'))
    } finally {
      setBusy(false)
    }
  }

  const close = () => (dirty ? setConfirm('discard') : onClose())

  return (
    <>
      <DialogHeader>
        <DialogTitle>{ws?.title ?? 'Worksheet'}</DialogTitle>
        <DialogDescription>
          {ws ? (
            <>
              {[ws.subject?.subject, ws.class?.name, ws.topics.map((t) => t.name).join(', ')].filter(Boolean).join(' · ')} · {items.length}/{ws.max_questions} questions
              {ws.show_marks ? ` · ${total} marks` : ''}
            </>
          ) : (
            'Loading…'
          )}
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading worksheet">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : ws ? (
        <div className="flex max-h-[62vh] flex-col gap-3 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="m-0 flex items-center gap-2 text-sm">
              <Switch checked={showAnswers} onCheckedChange={setShowAnswers} /> Show answers
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onEditDetails(ws)} disabled={busy}>
                <Settings2 aria-hidden="true" /> Details
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)} aria-expanded={adding} disabled={full && !adding}>
                <Plus aria-hidden="true" /> {adding ? 'Close' : 'Add from the bank'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-solid border-border bg-muted/30 p-3">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-primary" aria-hidden="true" /> Auto-pick more
            </span>
            <Input type="number" min={1} max={100} aria-label="How many" className="h-8 w-20" value={pick.count} onChange={(e) => setPick((p) => ({ ...p, count: Math.max(1, Number(e.target.value) || 1) }))} />
            <NativeSelect size="sm" aria-label="Difficulty" className="w-36" value={pick.difficulty} onChange={(e) => setPick((p) => ({ ...p, difficulty: e.target.value as Difficulty }))}>
              <option value="mix">Mixed difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </NativeSelect>
            <NativeSelect size="sm" aria-label="Type" className="w-40" value={pick.type} onChange={(e) => setPick((p) => ({ ...p, type: e.target.value }))}>
              <option value="">Any type</option>
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
            <Button size="sm" onClick={() => autoPick(false)} disabled={busy || dirty || full} title={dirty ? 'Save your changes first' : undefined}>
              Pick
            </Button>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setConfirm('replace')} disabled={busy || dirty} title={dirty ? 'Save your changes first' : 'Swap every question for new ones'}>
              <RefreshCw aria-hidden="true" /> Replace all with new questions
            </Button>
          </div>

          {items.length < ws.min_questions && (
            <Alert>
              <CircleAlert aria-hidden="true" />
              <AlertDescription>
                This worksheet has {items.length} {items.length === 1 ? 'question' : 'questions'} — worksheets should have at least {ws.min_questions}. Add more topics (Details) or questions.
              </AlertDescription>
            </Alert>
          )}

          {adding && (
            <AddFromBank
              worksheet={ws}
              excluded={new Set(items.map((q) => q.id))}
              room={ws.max_questions - items.length}
              onAdd={(qs) => {
                setItems((list) => [...list, ...qs])
                setMarks((m) => ({ ...m, ...Object.fromEntries(qs.map((q) => [q.id, ''])) }))
                toast.success(`${qs.length} added — remember to save.`)
              }}
            />
          )}

          {items.length === 0 ? (
            <EmptyState icon={Plus} title="No questions yet." description="Auto-pick some, or add them from the question bank." className="py-6" />
          ) : (
            <ol className="m-0 flex list-none flex-col divide-y divide-border rounded-lg border border-solid border-border p-0">
              {items.map((q, i) => {
                const problem = marksProblem(marks[q.id] ?? '')
                const answer = showAnswers ? answerText(q) : null
                return (
                  <li key={q.id} className="flex gap-3 p-3">
                    <span className="w-6 shrink-0 pt-0.5 text-right text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <QuestionBody q={q} />
                      {answer && <span className="text-xs font-medium text-success">Answer: {answer}</span>}
                      <div className="flex flex-wrap items-center gap-2">
                        {q.difficulty && (
                          <Badge variant="secondary" className="capitalize">
                            {q.difficulty}
                          </Badge>
                        )}
                        {ws.show_marks && (
                          <label className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground">
                            Marks
                            <Input type="number" min={1} max={20} className="h-8 w-16" value={marks[q.id] ?? ''} aria-invalid={!!problem || undefined} onChange={(e) => setMarks((m) => ({ ...m, [q.id]: e.target.value }))} />
                          </label>
                        )}
                        {problem && <span className="text-xs text-destructive">Marks must be 1–20.</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <Button size="icon-sm" variant="ghost" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Move question ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-destructive hover:bg-destructive-soft" aria-label={`Remove question ${i + 1}`} onClick={() => setItems((list) => list.filter((x) => x.id !== q.id))}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      ) : null}

      <DialogFooter className="flex-wrap">
        {ws && (
          <Button variant="outline" onClick={() => onPrint(ws)} disabled={busy || dirty || ws.questions.length === 0} title={dirty ? 'Save your changes first' : undefined}>
            <Printer aria-hidden="true" /> Print…
          </Button>
        )}
        <Button variant="outline" onClick={close}>
          Close
        </Button>
        {ws && (
          <Button onClick={save} disabled={busy || !dirty || marksInvalid}>
            Save
          </Button>
        )}
      </DialogFooter>

      <ConfirmDialog
        open={confirm === 'discard'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Discard unsaved changes?"
        description="Your changes to the questions, their order or marks will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={onClose}
      />
      <ConfirmDialog
        open={confirm === 'replace'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Replace all questions?"
        description={`Every question on this worksheet is swapped for ${Math.max(ws?.min_questions ?? 50, items.length)} different ones from the question bank (difficulty and type from the Auto-pick settings).`}
        confirmLabel="Yes, replace"
        cancelLabel="No"
        onConfirm={() => autoPick(true)}
      />
    </>
  )
}

function AddFromBank({ worksheet, excluded, room, onAdd }: { worksheet: Worksheet; excluded: Set<number>; room: number; onAdd: (qs: WorksheetQuestion[]) => void }) {
  const [draft, setDraft] = useState({ q: '', difficulty: '', topic_id: '', type: '' })
  const [query, setQuery] = useState(draft)
  const [items, setItems] = useState<WorksheetQuestion[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    let alive = true
    fetchAvailable(worksheet.id, query)
      .then((r) => alive && setItems(r))
      .catch(() => alive && setItems([]))
    return () => {
      alive = false
    }
  }, [worksheet.id, query])

  const visible = useMemo(() => (items ?? []).filter((x) => !excluded.has(x.id)), [items, excluded])
  const chosen = visible.filter((x) => selected.has(x.id))

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-solid border-primary/30 bg-primary-soft/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input className="h-9 pl-9" placeholder="Search question text…" aria-label="Search questions" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && setQuery(draft)} />
        </div>
        {worksheet.topics.length > 1 && (
          <NativeSelect size="sm" aria-label="Topic" className="w-40" value={draft.topic_id} onChange={(e) => setDraft((d) => ({ ...d, topic_id: e.target.value }))}>
            <option value="">All topics</option>
            {worksheet.topics.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect size="sm" aria-label="Filter by difficulty" className="w-32" value={draft.difficulty} onChange={(e) => setDraft((d) => ({ ...d, difficulty: e.target.value }))}>
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </NativeSelect>
        <NativeSelect size="sm" aria-label="Filter by type" className="w-36" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
          <option value="">Any type</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setItems(null)
            setQuery(draft)
          }}
        >
          Search
        </Button>
        <Button
          size="sm"
          disabled={chosen.length === 0 || chosen.length > room}
          title={chosen.length > room ? `Only ${room} more fit on this worksheet` : undefined}
          onClick={() => {
            onAdd(chosen)
            setSelected(new Set())
          }}
        >
          <Plus aria-hidden="true" /> Add{chosen.length ? ` (${chosen.length})` : ''}
        </Button>
      </div>
      {items === null ? (
        <Skeleton className="h-16" />
      ) : visible.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">No more matching questions in the bank for these topics.</p>
      ) : (
        <ul className="m-0 max-h-60 list-none divide-y divide-border overflow-y-auto rounded-md border border-solid border-border bg-card p-0">
          {visible.map((x) => (
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
