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
    <Link to="/library/topics" className="tw:inline-flex tw:w-fit tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground tw:no-underline tw:hover:text-foreground">
      <ArrowLeft className="tw:size-4" aria-hidden="true" /> Back to Topics
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
      <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-4xl tw:flex-col tw:gap-4" role="status" aria-label="Loading topic">
        <Back />
        <Skeleton className="tw:h-14 tw:w-1/2" />
        <Skeleton className="tw:h-40 tw:rounded-xl" />
      </div>
    )
  if (data.error || !t)
    return (
      <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-4xl tw:flex-col tw:gap-4">
        <Back />
        <ErrorState title="You do not have access to this topic, or it does not exist." />
      </div>
    )

  return (
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-4xl tw:flex-col tw:gap-5">
      <Back />
      <div className="tw:flex tw:items-start tw:gap-3">
        <span className="tw:flex tw:size-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary-soft tw:text-primary">
          <BookOpen className="tw:size-6" aria-hidden="true" />
        </span>
        <div className="tw:flex tw:flex-col tw:gap-1">
          <h1 className="tw:m-0 tw:text-2xl! tw:font-bold tw:text-foreground">{t.name}</h1>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
            {t.chapter?.name ?? 'No chapter'}
            <Badge variant="secondary">{t.grade ? `Grade ${t.grade}` : 'All grades'}</Badge>
          </div>
        </div>
      </div>

      <Card className="tw:gap-3">
        <CardHeader>
          <CardTitle className="tw:flex tw:items-center tw:gap-2">
            <Lightbulb className="tw:size-4 tw:text-warning" aria-hidden="true" /> Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {t.explanation_html ? <RichHtml html={t.explanation_html} className="tw:text-[15px]" /> : <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No explanation has been written for this topic yet.</p>}
        </CardContent>
      </Card>

      <Card className="tw:gap-3">
        <CardHeader className="tw:flex tw:flex-row tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
          <CardTitle className="tw:flex tw:items-center tw:gap-2">
            <MessageCircleQuestion className="tw:size-4 tw:text-primary" aria-hidden="true" /> Questions ({shown.length})
          </CardTitle>
          {grades.length > 1 && (
            <NativeSelect size="sm" aria-label="Grade" className="tw:w-36" value={grade} onChange={(e) => setGrade(e.target.value)}>
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
            <EmptyState icon={MessageCircleQuestion} title="No questions have been added for this topic yet." className="tw:py-6" />
          ) : (
            <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
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
