import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, MessageSquareQuote, NotebookPen, UserRound } from 'lucide-react'
import AttachmentPreviewModal from '@/components/common/AttachmentPreviewModal'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import { AttachmentChips } from '../components/Attachments'
import { todayISO, yesterdayISO } from '../schemas/activityForm'
import { attachmentUrl, fetchMyActivities, type ActivityAttachment, type StudentActivity } from '../services/dailyActivitiesService'

const HW: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  done: { label: 'Done', variant: 'success' },
  partial: { label: 'Partial', variant: 'warning' },
  not_done: { label: 'Not done', variant: 'destructive' },
}

const dayHeading = (iso: string) => {
  if (iso === todayISO()) return 'Today'
  if (iso === yesterdayISO()) return 'Yesterday'
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ActivityCard({ a, onPreview }: { a: StudentActivity; onPreview: (f: ActivityAttachment) => void }) {
  const chapter = a.chapter_model?.name ?? a.chapter
  const topic = a.topic_model?.name ?? a.topic
  const hw = a.homework_status ? HW[a.homework_status] : null
  const files = a.attachments ?? []
  const hasTaught = !!(chapter || topic || a.notes || a.topic_id)
  const hasHomework = !!(a.homework || a.homework_status || files.length)

  return (
    <article aria-label={`${a.subject?.subject ?? 'Activity'} · ${formatDate(a.activity_date)}`} className="flex flex-col overflow-hidden rounded-xl border border-solid border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-solid border-border bg-muted/40 px-4 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <GraduationCap className="size-4" aria-hidden="true" />
        </span>
        <span className="font-semibold text-foreground">{a.subject?.subject ?? 'Subject not set'}</span>
        {a.teacher?.name && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <UserRound className="size-3.5" aria-hidden="true" /> {a.teacher.name}
          </span>
        )}
      </header>

      <div className="flex flex-col gap-4 p-4">
        {hasTaught && (
          <section aria-label="Taught" className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What we covered</span>
            {(chapter || topic) && (
              <p className="m-0 flex items-start gap-1.5 text-sm font-medium text-foreground">
                <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {[chapter, topic].filter(Boolean).join(' › ')}
              </p>
            )}
            {a.notes && (
              <p className="m-0 flex items-start gap-1.5 text-sm whitespace-pre-wrap text-foreground">
                <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {a.notes}
              </p>
            )}
            {a.topic_id && (
              <Button asChild size="sm" variant="soft" className="mt-1 w-fit">
                <Link to={`/students/activities/${a.id}/topic`}>
                  <BookOpen aria-hidden="true" /> View Explanation &amp; Practice Questions
                </Link>
              </Button>
            )}
          </section>
        )}

        {hasHomework && (
          <section aria-label="Homework" className={cn('flex flex-col gap-1.5', hasTaught && 'border-t border-solid border-border pt-3')}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Homework</span>
              {hw && <Badge variant={hw.variant}>{hw.label}</Badge>}
            </div>
            {a.homework && (
              <p className="m-0 flex items-start gap-1.5 text-sm whitespace-pre-wrap text-foreground">
                <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {a.homework}
              </p>
            )}
            <AttachmentChips attachments={files} onPreview={onPreview} />
          </section>
        )}

        {a.remarks && (
          <div className="flex items-start gap-2 rounded-lg border border-solid border-warning/30 bg-warning-soft px-3 py-2">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-warning">Teacher&apos;s remarks</span>
              <p className="m-0 text-sm text-foreground">{a.remarks}</p>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

/** Route: no guard (Q9) — the endpoint returns only the signed-in student's approved activities. */
export default function StudentActivitiesPage() {
  const [date, setDate] = useState('')
  const list = useAsync(
    () =>
      fetchMyActivities(date || undefined).catch((e) => {
        console.error('Error loading student activities:', e)
        throw e
      }),
    [date],
  )
  const [subject, setSubject] = useState('')
  const [preview, setPreview] = useState<ActivityAttachment | null>(null)

  const all = useMemo(() => list.data ?? [], [list.data])
  const subjects = useMemo(() => [...new Map(all.filter((a) => a.subject).map((a) => [a.subject!.id, a.subject!.subject])).entries()], [all])
  const shown = subject ? all.filter((a) => String(a.subject?.id) === subject) : all
  const groups = useMemo(() => {
    const g: { day: string; items: StudentActivity[] }[] = []
    for (const a of shown) {
      const d = a.activity_date.slice(0, 10)
      if (g.at(-1)?.day === d) g.at(-1)!.items.push(a)
      else g.push({ day: d, items: [a] })
    }
    return g
  }, [shown])
  const pendingHw = all.filter((a) => a.homework && a.homework_status !== 'done').length

  const quick = [
    { label: 'All', value: '' },
    { label: 'Today', value: todayISO() },
    { label: 'Yesterday', value: yesterdayISO() },
  ]

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <PageHeader title="My Activities" description="What was taught in each class, your homework and your teachers' remarks." className="mb-0" />

      <Card className="flex-row flex-wrap items-center gap-2 p-3">
        {quick.map((q) => (
          <Button key={q.label} type="button" size="sm" variant={date === q.value ? 'soft' : 'ghost'} aria-pressed={date === q.value} onClick={() => setDate(q.value)}>
            {q.label}
          </Button>
        ))}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="date" aria-label="Pick a date" className="h-8 w-44 pl-8" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {subjects.length > 1 && (
          <div role="group" aria-label="Subject" className="flex flex-wrap gap-1.5 sm:ml-auto">
            {[['', 'All subjects'] as [string | number, string], ...subjects].map(([id, name]) => (
              <button
                key={String(id)}
                type="button"
                aria-pressed={subject === String(id)}
                onClick={() => setSubject(String(id))}
                className={cn(
                  'm-0 cursor-pointer rounded-full border border-solid px-2.5 py-1 text-xs font-medium',
                  subject === String(id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-transparent text-muted-foreground hover:bg-muted',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </Card>

      {!list.loading && pendingHw > 0 && (
        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="size-4 text-warning" aria-hidden="true" />
          {pendingHw} homework {pendingHw === 1 ? 'task is' : 'tasks are'} not marked done yet.
        </p>
      )}

      {list.loading && !list.data ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading activities">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : list.error ? (
        <ErrorState title="Couldn't load your activities." onRetry={list.reload} />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title="No activities found." description={date ? 'Nothing was logged for this day. Try another date.' : 'Your teachers’ daily notes will appear here.'} />
        </Card>
      ) : (
        <div className={cn('flex flex-col gap-6', list.loading && 'opacity-70')}>
          {groups.map((g) => (
            <section key={g.day} aria-label={dayHeading(g.day)} className="flex flex-col gap-3">
              <h2 className="m-0 flex items-baseline gap-2 text-sm! font-semibold text-muted-foreground">
                {dayHeading(g.day)}
                <span className="text-xs font-normal">{formatDate(g.day)}</span>
              </h2>
              {g.items.map((a) => (
                <ActivityCard key={a.id} a={a} onPreview={setPreview} />
              ))}
            </section>
          ))}
        </div>
      )}

      <AttachmentPreviewModal attachment={preview} url={preview ? attachmentUrl(preview) : null} onHide={() => setPreview(null)} />
    </div>
  )
}
