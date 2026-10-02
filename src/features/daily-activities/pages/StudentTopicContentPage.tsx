import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import DOMPurify from 'dompurify'
import { ArrowLeft, BookOpen, ChevronDown, Info, Lightbulb, LockKeyhole, MessageCircleQuestion } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { formatCountdown } from '../lib/countdown'
import { fetchTopicContent, type TopicContent } from '../services/dailyActivitiesService'

const DIFF: Record<string, 'success' | 'warning' | 'destructive'> = { easy: 'success', medium: 'warning', hard: 'destructive' }

/** Teacher-authored HTML — always sanitised (as before). */
function Rich({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        'tw:text-sm tw:leading-relaxed tw:text-foreground tw:[&_h3]:mt-3 tw:[&_h3]:mb-1 tw:[&_h3]:text-base! tw:[&_img]:my-2 tw:[&_img]:max-h-72 tw:[&_img]:rounded-md tw:[&_li]:my-0.5 tw:[&_ol]:list-decimal tw:[&_ol]:pl-5 tw:[&_ul]:list-disc tw:[&_p]:my-1.5 tw:[&_ul]:pl-5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  )
}

function QuestionItem({ q, n, solutionsVisible }: { q: TopicContent['questions'][number]; n: number; solutionsVisible: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:p-4">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
        <span className="tw:flex tw:size-7 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary-soft tw:text-xs tw:font-bold tw:text-primary">{n}</span>
        <Badge variant="soft">Grade {q.grade}</Badge>
        {q.difficulty && (
          <Badge variant={DIFF[q.difficulty] ?? 'secondary'} className="tw:capitalize">
            {q.difficulty}
          </Badge>
        )}
      </div>
      <Rich html={q.question_html} />
      {solutionsVisible && q.solution_html && (
        <div>
          <Button type="button" size="sm" variant={open ? 'soft' : 'outline'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Lightbulb aria-hidden="true" /> {open ? 'Hide solution' : 'Show solution'}
            <ChevronDown className={cn('tw:transition-transform', open && 'tw:rotate-180')} aria-hidden="true" />
          </Button>
          {open && (
            <div className="tw:mt-2 tw:rounded-lg tw:border-l-4 tw:border-solid tw:border-y-0 tw:border-r-0 tw:border-success tw:bg-success-soft/60 tw:px-3 tw:py-2">
              <span className="tw:text-xs tw:font-semibold tw:text-success">Solution</span>
              <Rich html={q.solution_html} />
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function BackLink() {
  return (
    <Link to="/students/activities" className="tw:inline-flex tw:w-fit tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground tw:no-underline tw:hover:text-foreground">
      <ArrowLeft className="tw:size-4" aria-hidden="true" /> Back to My Activities
    </Link>
  )
}

/** Route: no guard (Q9) — the endpoint only serves the signed-in student's approved activities. */
export default function StudentTopicContentPage() {
  const { activityId } = useParams<{ activityId: string }>()
  const content = useAsync(() => fetchTopicContent(activityId!), [activityId])
  const c = content.data
  const [now, setNow] = useState(() => Date.now())

  // Tick the countdown every 30 s while solutions are locked (legacy cadence).
  useEffect(() => {
    if (!c || c.solutions_visible || !c.solution_unlock_at) return
    const t = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(t)
  }, [c])

  if (content.loading && !c)
    return (
      <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-4xl tw:flex-col tw:gap-4" role="status" aria-label="Loading topic">
        <BackLink />
        <Skeleton className="tw:h-10 tw:w-2/3" />
        <Skeleton className="tw:h-48 tw:rounded-xl" />
        <Skeleton className="tw:h-40 tw:rounded-xl" />
      </div>
    )

  if (content.error || !c) {
    const message =
      content.error instanceof Error && !axios.isAxiosError(content.error) ? content.error.message : 'Could not load this topic. It may not be linked to your account.'
    if (content.error) console.error('Error fetching topic content:', content.error)
    return (
      <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-4xl tw:flex-col tw:gap-4">
        <BackLink />
        <ErrorState title={message} onRetry={axios.isAxiosError(content.error) ? content.reload : undefined} />
      </div>
    )
  }

  const unlockAt = c.solution_unlock_at ? new Date(c.solution_unlock_at).getTime() : null
  const remaining = unlockAt !== null ? unlockAt - now : null
  const chapterLabel = c.chapter?.name ?? (c.chapter_number ? `Chapter ${c.chapter_number}` : null)

  return (
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-4xl tw:flex-col tw:gap-5">
      <BackLink />

      <div className="tw:flex tw:items-start tw:gap-3">
        <span className="tw:flex tw:size-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary-soft tw:text-primary">
          <BookOpen className="tw:size-6" aria-hidden="true" />
        </span>
        <div className="tw:flex tw:flex-col tw:gap-0.5">
          <h1 className="tw:m-0 tw:text-2xl! tw:font-bold tw:text-foreground">{c.topic.name}</h1>
          {chapterLabel && <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{chapterLabel}</p>}
        </div>
      </div>

      {c.grade_unknown && (
        <Alert variant="warning">
          <Info aria-hidden="true" />
          <AlertDescription>
            Your class/grade isn&apos;t set yet, so you&apos;re seeing questions for all grades on this topic. Ask your coaching admin to set your grade for a tailored set.
          </AlertDescription>
        </Alert>
      )}

      <Card className="tw:gap-3">
        <CardHeader>
          <CardTitle className="tw:flex tw:items-center tw:gap-2">
            <Lightbulb className="tw:size-4 tw:text-warning" aria-hidden="true" /> Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c.topic.explanation_html ? (
            <Rich html={c.topic.explanation_html} className="tw:text-[15px]" />
          ) : (
            <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No explanation has been added for this topic yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="tw:gap-3">
        <CardHeader>
          <CardTitle className="tw:flex tw:items-center tw:gap-2">
            <MessageCircleQuestion className="tw:size-4 tw:text-primary" aria-hidden="true" /> Practice questions ({c.questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="tw:flex tw:flex-col tw:gap-3">
          {c.questions.length === 0 ? (
            <EmptyState icon={MessageCircleQuestion} title="No practice questions are available for this topic yet." className="tw:py-6" />
          ) : (
            <>
              {!c.solutions_visible ? (
                <Alert>
                  <LockKeyhole aria-hidden="true" />
                  <AlertDescription>
                    Solutions unlock {remaining !== null ? <strong className="tw:tabular-nums">in {formatCountdown(remaining)}</strong> : 'once this activity is approved'}. Try the questions first!
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">Have a go at each question before opening its solution.</p>
              )}
              <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
                {c.questions.map((q, i) => (
                  <QuestionItem key={q.id} q={q} n={i + 1} solutionsVisible={c.solutions_visible} />
                ))}
              </ol>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
