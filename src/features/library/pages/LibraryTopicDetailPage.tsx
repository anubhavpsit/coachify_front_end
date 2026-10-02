import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Lightbulb, MessageCircleQuestion } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import QuestionView, { RichHtml } from '@/features/content-library/components/QuestionView'
import { fetchLibraryTopic } from '../services/libraryService'

function Back() {
  return (
    <Link to="/library/topics" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" /> Back to Topics
    </Link>
  )
}

/** Teacher library: one topic's explanation and question bank (answers revealed on demand, as before). */
export default function LibraryTopicDetailPage() {
  const { topicId } = useParams<{ topicId: string }>()
  const data = useAsync(
    () =>
      fetchLibraryTopic(topicId!).catch((e) => {
        console.error('Error fetching topic content:', e)
        throw e
      }),
    [topicId],
  )
  const [grade, setGrade] = useState('')
  const questions = useMemo(() => data.data?.questions ?? [], [data.data])
  const grades = useMemo(() => [...new Set(questions.map((q) => q.grade))].sort((a, b) => a - b), [questions])
  const shown = grade ? questions.filter((q) => String(q.grade) === grade) : questions
  const t = data.data?.topic

  if (data.loading && !data.data)
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4" role="status" aria-label="Loading topic">
        <Back />
        <Skeleton className="h-14 w-1/2" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  if (data.error || !t)
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <Back />
        <ErrorState title="You do not have access to this topic, or it does not exist." />
      </div>
    )

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Back />
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <BookOpen className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl! font-bold text-foreground">{t.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {t.chapter?.name ?? 'No chapter'}
            <Badge variant="secondary">{t.grade ? `Grade ${t.grade}` : 'All grades'}</Badge>
          </div>
        </div>
      </div>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-4 text-warning" aria-hidden="true" /> Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {t.explanation_html ? <RichHtml html={t.explanation_html} className="text-[15px]" /> : <p className="m-0 text-sm text-muted-foreground">No explanation has been written for this topic yet.</p>}
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="size-4 text-primary" aria-hidden="true" /> Questions ({shown.length})
          </CardTitle>
          {grades.length > 1 && (
            <NativeSelect size="sm" aria-label="Grade" className="w-36" value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">All grades</option>
              {grades.map((g) => (
                <option key={g} value={String(g)}>
                  Grade {g}
                </option>
              ))}
            </NativeSelect>
          )}
        </CardHeader>
        <CardContent>
          {shown.length === 0 ? (
            <EmptyState icon={MessageCircleQuestion} title="No questions have been added for this topic yet." className="py-6" />
          ) : (
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {shown.map((q, i) => (
                <QuestionView key={q.id} q={q} n={i + 1} answers="on-demand" />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
