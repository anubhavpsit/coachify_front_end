import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { ArrowLeft, Check, ChevronDown, ImageOff, MessageCircleQuestion, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import QuestionFormDialog from '../components/QuestionFormDialog'
import { ReadOnlyMark, ScopeBadge } from '../components/ScopeBadge'
import { GRADES, htmlText, QUESTION_TYPES, SUBJECTIVE_TYPES, typeLabel } from '../schemas/questionForm'
import { deleteQuestion, fetchQuestions, fetchTopic, ownTenantId, type Question } from '../services/contentLibraryService'

const DIFF_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = { easy: 'success', medium: 'warning', hard: 'destructive' }

/** Rich question / solution HTML — always sanitised (the legacy table rendered it raw). */
function Html({ html, className }: { html: string; className?: string }) {
  return <div className={cn('tw:text-sm tw:text-foreground tw:[&_img]:max-h-48 tw:[&_img]:rounded-md tw:[&_ol]:pl-5 tw:[&_p]:my-1 tw:[&_ul]:pl-5', className)} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || '') }} />
}

function QuestionCard({ q, n, canManage, onEdit, onDelete }: { q: Question; n: number; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const opts = [
    ['a', q.option_a],
    ['b', q.option_b],
    ['c', q.option_c],
    ['d', q.option_d],
  ].filter(([, v]) => !!v) as [string, string][]
  const hasDetail = !!q.solution_html || (SUBJECTIVE_TYPES.includes(q.question_type ?? '') && !!q.answer_key)

  return (
    <li className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        <span className="tw:text-sm tw:font-semibold tw:text-muted-foreground">Q{n}</span>
        <Badge variant="soft">Grade {q.grade}</Badge>
        {q.difficulty && (
          <Badge variant={DIFF_VARIANT[q.difficulty] ?? 'secondary'} className="tw:capitalize">
            {q.difficulty}
          </Badge>
        )}
        {q.question_type && <Badge variant="secondary">{typeLabel(q.question_type)}</Badge>}
        {q.needs_image && (
          <Badge variant="destructive" title={q.image_note ?? undefined}>
            <ImageOff aria-hidden="true" /> Needs image
          </Badge>
        )}
        <ScopeBadge base={q.tenant_id === 0} />
        <div className="tw:ml-auto tw:flex tw:items-center tw:gap-0.5">
          {canManage ? (
            <>
              <IconAction label={`Edit question ${n}`} onClick={onEdit}>
                <Pencil aria-hidden="true" />
              </IconAction>
              <IconAction label={`Delete question ${n}`} onClick={onDelete} destructive>
                <Trash2 aria-hidden="true" />
              </IconAction>
            </>
          ) : (
            <ReadOnlyMark what="question" />
          )}
        </div>
      </div>

      <Html html={q.question_html} />

      {q.question_type === 'mcq' && opts.length > 0 && (
        <ul className="tw:m-0 tw:grid tw:list-none tw:gap-2 tw:p-0 tw:sm:grid-cols-2">
          {opts.map(([k, v]) => {
            const right = q.correct_answer === k
            return (
              <li key={k} className={cn('tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:py-1.5 tw:text-sm', right ? 'tw:border-success/50 tw:bg-success-soft' : 'tw:border-border')}>
                <span className={cn('tw:flex tw:size-6 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:text-xs tw:font-bold', right ? 'tw:bg-success tw:text-success-foreground' : 'tw:bg-muted tw:text-muted-foreground')}>
                  {right ? <Check className="tw:size-3.5" aria-label="Correct" /> : k.toUpperCase()}
                </span>
                <span>{htmlText(v)}</span>
              </li>
            )
          })}
        </ul>
      )}
      {q.question_type === 'true_false' && q.correct_answer && (
        <p className="tw:m-0 tw:text-sm">
          Answer: <strong className="tw:capitalize tw:text-success">{q.correct_answer}</strong>
        </p>
      )}

      {hasDetail && (
        <div>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="tw:m-0 tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-sm tw:font-medium tw:text-primary"
          >
            <ChevronDown className={cn('tw:size-4 tw:transition-transform', open && 'tw:rotate-180')} aria-hidden="true" /> {open ? 'Hide' : 'Show'} answer &amp; solution
          </button>
          {open && (
            <div className="tw:mt-2 tw:flex tw:flex-col tw:gap-2 tw:rounded-lg tw:bg-muted/50 tw:p-3">
              {SUBJECTIVE_TYPES.includes(q.question_type ?? '') && q.answer_key && (
                <p className="tw:m-0 tw:text-sm tw:whitespace-pre-wrap">
                  <span className="tw:font-semibold">Answer key: </span>
                  {q.answer_key}
                </p>
              )}
              {q.solution_html && (
                <div>
                  <span className="tw:text-sm tw:font-semibold">Solution</span>
                  <Html html={q.solution_html} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/** Route gate: content_library.manage | role teacher (unchanged). Edit / delete only own questions (unchanged). */
export default function TopicQuestionsPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const tenantId = ownTenantId()
  const topic = useAsync(() => fetchTopic(topicId!).catch(() => null), [topicId])
  const [grade, setGrade] = useState('')
  const list = useAsync(
    () =>
      fetchQuestions(topicId!, grade || undefined).catch((e) => {
        console.error('Error fetching questions:', e)
        throw e
      }),
    [topicId, grade],
  )
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Question | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<{ q: Question; n: number } | null>(null)

  const all = useMemo(() => list.data ?? [], [list.data])
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return all.filter((x) => (!type || (x.question_type ?? '') === type) && (!s || htmlText(x.question_html).toLowerCase().includes(s)))
  }, [all, type, q])
  const flagged = all.filter((x) => x.needs_image).length

  const remove = async () => {
    try {
      await deleteQuestion(topicId!, deleting!.q.id)
      toast.success('Question deleted.')
      list.reload()
    } catch (err) {
      console.error('Error deleting question:', err)
      toast.error('Failed to delete question.')
      throw err
    }
  }

  const openForm = (x: Question | null) => {
    setEditing(x)
    setFormOpen(true)
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <Link to="/topics" className="tw:inline-flex tw:w-fit tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground tw:no-underline tw:hover:text-foreground">
        <ArrowLeft className="tw:size-4" aria-hidden="true" /> Back to Topics
      </Link>
      <PageHeader
        title={topic.data ? `Questions — ${topic.data.name}` : 'Questions'}
        description={topic.data ? [topic.data.subject?.subject, topic.data.chapter?.name, topic.data.grade ? `Grade ${topic.data.grade}` : null].filter(Boolean).join(' · ') : 'Question bank for this topic.'}
        className="tw:mb-0"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" /> Add Question
          </Button>
        }
      />

      <Card className="tw:flex-row tw:flex-wrap tw:items-center tw:gap-3 tw:p-4">
        <div className="tw:relative tw:min-w-56 tw:flex-1">
          <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
          <Input type="search" className="tw:pl-9" placeholder="Search question text" aria-label="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect aria-label="Grade" className="tw:w-full tw:sm:w-36" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">All grades</option>
          {GRADES.map((g) => (
            <option key={g} value={String(g)}>
              Grade {g}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Question type" className="tw:w-full tw:sm:w-44" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {QUESTION_TYPES.filter((t) => t.value).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        {!list.loading && (
          <span className="tw:text-xs tw:text-muted-foreground">
            {shown.length} of {all.length} questions{flagged ? ` · ${flagged} need an image` : ''}
          </span>
        )}
      </Card>

      {list.loading && !list.data ? (
        <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading questions">
          <Skeleton className="tw:h-32 tw:rounded-xl" />
          <Skeleton className="tw:h-32 tw:rounded-xl" />
        </div>
      ) : list.error ? (
        <ErrorState title="Couldn't load the questions." onRetry={list.reload} />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageCircleQuestion}
            title={all.length ? 'No questions match these filters.' : 'No questions found for this filter.'}
            action={
              <Button size="sm" variant="soft" onClick={() => openForm(null)}>
                <Plus aria-hidden="true" /> Add a question
              </Button>
            }
          />
        </Card>
      ) : (
        <ol className={cn('tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0', list.loading && 'tw:opacity-70')}>
          {shown.map((x, i) => (
            <QuestionCard key={x.id} q={x} n={i + 1} canManage={x.tenant_id === tenantId} onEdit={() => openForm(x)} onDelete={() => setDeleting({ q: x, n: i + 1 })} />
          ))}
        </ol>
      )}

      <QuestionFormDialog open={formOpen} onClose={() => setFormOpen(false)} topicId={topicId!} question={editing} presetGrade={grade || (topic.data?.grade ? String(topic.data.grade) : '')} onSaved={list.reload} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete question ${deleting?.n ?? ''}?`}
        description={
          <>
            <span className="tw:line-clamp-2">“{deleting ? htmlText(deleting.q.question_html) : ''}”</span> will be deleted. This can&apos;t be undone.
          </>
        }
        confirmLabel="Yes, delete"
        cancelLabel="No"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}
