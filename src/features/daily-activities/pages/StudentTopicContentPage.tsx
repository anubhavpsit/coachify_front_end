import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import DOMPurify from 'dompurify'
import { ArrowLeft, BookOpen, Check, ChevronDown, Info, Lightbulb, LockKeyhole, MessageCircleQuestion } from 'lucide-react'
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
        'text-sm leading-relaxed text-foreground [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-base! [&_img]:my-2 [&_img]:max-h-72 [&_img]:rounded-md [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_p]:my-1.5 [&_ul]:pl-5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  )
}

function QuestionItem({ q, n, solutionsVisible }: { q: TopicContent['questions'][number]; n: number; solutionsVisible: boolean }) {
  const [open, setOpen] = useState(false)
  const opts = (['a', 'b', 'c', 'd'] as const).map((k) => [k, q[`option_${k}`]] as const).filter((o): o is [typeof o[0], string] => !!o[1])
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-solid border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">{n}</span>
        <Badge variant="soft">Grade {q.grade}</Badge>
        {q.difficulty && (
          <Badge variant={DIFF[q.difficulty] ?? 'secondary'} className="capitalize">
            {q.difficulty}
          </Badge>
        )}
      </div>
      <Rich html={q.question_html} />
      {q.question_type === 'mcq' && opts.length > 0 && (
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {opts.map(([k, v]) => {
            const right = open && q.correct_answer === k
            return (
              <li key={k} className={cn('flex items-center gap-2 rounded-lg border border-solid px-3 py-1.5 text-sm', right ? 'border-success/50 bg-success-soft' : 'border-border')}>
                <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', right ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')}>
                  {right ? <Check className="size-3.5" aria-label="Correct" /> : k.toUpperCase()}
                </span>
                <span>{v}</span>
              </li>
            )
          })}
        </ul>
      )}
      {solutionsVisible && (q.solution_html || q.correct_answer) && (
        <div>
          <Button type="button" size="sm" variant={open ? 'soft' : 'outline'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Lightbulb aria-hidden="true" /> {`${open ? 'Hide' : 'Show'} ${q.solution_html ? 'solution' : 'answer'}`}
            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </Button>
          {open && q.solution_html && (
            <div className="mt-2 rounded-lg border-l-4 border-solid border-y-0 border-r-0 border-success bg-success-soft/60 px-3 py-2">
              <span className="text-xs font-semibold text-success">Solution</span>
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
    <Link to="/students/activities" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" /> Back to My Activities
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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4" role="status" aria-label="Loading topic">
        <BackLink />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )

  if (content.error || !c) {
    const message =
      content.error instanceof Error && !axios.isAxiosError(content.error) ? content.error.message : 'Could not load this topic. It may not be linked to your account.'
    if (content.error) console.error('Error fetching topic content:', content.error)
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <BackLink />
        <ErrorState title={message} onRetry={axios.isAxiosError(content.error) ? content.reload : undefined} />
      </div>
    )
  }

  const unlockAt = c.solution_unlock_at ? new Date(c.solution_unlock_at).getTime() : null
  const remaining = unlockAt !== null ? unlockAt - now : null
  const chapterLabel = c.chapter?.name ?? (c.chapter_number ? `Chapter ${c.chapter_number}` : null)

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <BackLink />

      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <BookOpen className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0 text-2xl! font-bold text-foreground">{c.topic.name}</h1>
          {chapterLabel && <p className="m-0 text-sm text-muted-foreground">{chapterLabel}</p>}
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

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-4 text-warning" aria-hidden="true" /> Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {c.topic.explanation_html ? (
            <Rich html={c.topic.explanation_html} className="text-[15px]" />
          ) : (
            <p className="m-0 text-sm text-muted-foreground">No explanation has been added for this topic yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="size-4 text-primary" aria-hidden="true" /> Practice questions ({c.questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {c.questions.length === 0 ? (
            <EmptyState icon={MessageCircleQuestion} title="No practice questions are available for this topic yet." className="py-6" />
          ) : (
            <>
              {!c.solutions_visible ? (
                <Alert>
                  <LockKeyhole aria-hidden="true" />
                  <AlertDescription>
                    Solutions unlock {remaining !== null ? <strong className="tabular-nums">in {formatCountdown(remaining)}</strong> : 'once this activity is approved'}. Try the questions first!
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="m-0 text-xs text-muted-foreground">Have a go at each question before opening its solution.</p>
              )}
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
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
