import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircleQuestion, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import QuestionFormDialog from '../components/QuestionFormDialog'
import QuestionView from '../components/QuestionView'
import { ReadOnlyMark, ScopeBadge } from '../components/ScopeBadge'
import { GRADES, htmlText, QUESTION_TYPES } from '../schemas/questionForm'
import { deleteQuestion, fetchQuestions, fetchTopic, ownTenantId, type Question } from '../services/contentLibraryService'

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
    <div className="flex flex-col gap-5">
      <Link to="/topics" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Back to Topics
      </Link>
      <PageHeader
        title={topic.data ? `Questions — ${topic.data.name}` : 'Questions'}
        description={topic.data ? [topic.data.subject?.subject, topic.data.chapter?.name, topic.data.grade ? `Grade ${topic.data.grade}` : null].filter(Boolean).join(' · ') : 'Question bank for this topic.'}
        className="mb-0"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" /> Add Question
          </Button>
        }
      />

      <Card className="flex-row flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" className="pl-9" placeholder="Search question text" aria-label="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect aria-label="Grade" className="w-full sm:w-36" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">All grades</option>
          {GRADES.map((g) => (
            <option key={g} value={String(g)}>
              Grade {g}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Question type" className="w-full sm:w-44" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {QUESTION_TYPES.filter((t) => t.value).map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </NativeSelect>
        {!list.loading && (
          <span className="text-xs text-muted-foreground">
            {shown.length} of {all.length} questions{flagged ? ` · ${flagged} need an image` : ''}
          </span>
        )}
      </Card>

      {list.loading && !list.data ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading questions">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
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
        <ol className={cn('m-0 flex list-none flex-col gap-3 p-0', list.loading && 'opacity-70')}>
          {shown.map((x, i) => (
            <QuestionView
              key={x.id}
              q={x}
              n={i + 1}
              answers="always"
              headerEnd={
                <>
                  <ScopeBadge base={x.tenant_id === 0} />
                  <div className="ml-auto flex items-center gap-0.5">
                    {x.tenant_id === tenantId ? (
                      <>
                        <IconAction label={`Edit question ${i + 1}`} onClick={() => openForm(x)}>
                          <Pencil aria-hidden="true" />
                        </IconAction>
                        <IconAction label={`Delete question ${i + 1}`} onClick={() => setDeleting({ q: x, n: i + 1 })} destructive>
                          <Trash2 aria-hidden="true" />
                        </IconAction>
                      </>
                    ) : (
                      <ReadOnlyMark what="question" />
                    )}
                  </div>
                </>
              }
            />
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
            <span className="line-clamp-2">“{deleting ? htmlText(deleting.q.question_html) : ''}”</span> will be deleted. This can&apos;t be undone.
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
