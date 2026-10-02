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
    <article aria-label={`${a.subject?.subject ?? 'Activity'} · ${formatDate(a.activity_date)}`} className="tw:flex tw:flex-col tw:overflow-hidden tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card">
      <header className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:border-b tw:border-solid tw:border-border tw:bg-muted/40 tw:px-4 tw:py-2.5">
        <span className="tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-lg tw:bg-primary-soft tw:text-primary">
          <GraduationCap className="tw:size-4" aria-hidden="true" />
        </span>
        <span className="tw:font-semibold tw:text-foreground">{a.subject?.subject ?? 'Subject not set'}</span>
        {a.teacher?.name && (
          <span className="tw:ml-auto tw:inline-flex tw:items-center tw:gap-1 tw:text-xs tw:text-muted-foreground">
            <UserRound className="tw:size-3.5" aria-hidden="true" /> {a.teacher.name}
          </span>
        )}
      </header>

      <div className="tw:flex tw:flex-col tw:gap-4 tw:p-4">
        {hasTaught && (
          <section aria-label="Taught" className="tw:flex tw:flex-col tw:gap-1.5">
            <span className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">What we covered</span>
            {(chapter || topic) && (
              <p className="tw:m-0 tw:flex tw:items-start tw:gap-1.5 tw:text-sm tw:font-medium tw:text-foreground">
                <BookOpen className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-primary" aria-hidden="true" />
                {[chapter, topic].filter(Boolean).join(' › ')}
              </p>
            )}
            {a.notes && (
              <p className="tw:m-0 tw:flex tw:items-start tw:gap-1.5 tw:text-sm tw:whitespace-pre-wrap tw:text-foreground">
                <NotebookPen className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-muted-foreground" aria-hidden="true" />
                {a.notes}
              </p>
            )}
            {a.topic_id && (
              <Button asChild size="sm" variant="soft" className="tw:mt-1 tw:w-fit">
                <Link to={`/students/activities/${a.id}/topic`}>
                  <BookOpen aria-hidden="true" /> View Explanation &amp; Practice Questions
                </Link>
              </Button>
            )}
          </section>
        )}

        {hasHomework && (
          <section aria-label="Homework" className={cn('tw:flex tw:flex-col tw:gap-1.5', hasTaught && 'tw:border-t tw:border-solid tw:border-border tw:pt-3')}>
            <div className="tw:flex tw:items-center tw:gap-2">
              <span className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">Homework</span>
              {hw && <Badge variant={hw.variant}>{hw.label}</Badge>}
            </div>
            {a.homework && (
              <p className="tw:m-0 tw:flex tw:items-start tw:gap-1.5 tw:text-sm tw:whitespace-pre-wrap tw:text-foreground">
                <ClipboardList className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-muted-foreground" aria-hidden="true" />
                {a.homework}
              </p>
            )}
            <AttachmentChips attachments={files} onPreview={onPreview} />
          </section>
        )}

        {a.remarks && (
          <div className="tw:flex tw:items-start tw:gap-2 tw:rounded-lg tw:border tw:border-solid tw:border-warning/30 tw:bg-warning-soft tw:px-3 tw:py-2">
            <MessageSquareQuote className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-warning" aria-hidden="true" />
            <div className="tw:flex tw:flex-col">
              <span className="tw:text-xs tw:font-semibold tw:text-warning">Teacher&apos;s remarks</span>
              <p className="tw:m-0 tw:text-sm tw:text-foreground">{a.remarks}</p>
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
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-4xl tw:flex-col tw:gap-5">
      <PageHeader title="My Activities" description="What was taught in each class, your homework and your teachers' remarks." className="tw:mb-0" />

      <Card className="tw:flex-row tw:flex-wrap tw:items-center tw:gap-2 tw:p-3">
        {quick.map((q) => (
          <Button key={q.label} type="button" size="sm" variant={date === q.value ? 'soft' : 'ghost'} aria-pressed={date === q.value} onClick={() => setDate(q.value)}>
            {q.label}
          </Button>
        ))}
        <div className="tw:relative">
          <CalendarDays className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
          <Input type="date" aria-label="Pick a date" className="tw:h-8 tw:w-44 tw:pl-8" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {subjects.length > 1 && (
          <div role="group" aria-label="Subject" className="tw:flex tw:flex-wrap tw:gap-1.5 tw:sm:ml-auto">
            {[['', 'All subjects'] as [string | number, string], ...subjects].map(([id, name]) => (
              <button
                key={String(id)}
                type="button"
                aria-pressed={subject === String(id)}
                onClick={() => setSubject(String(id))}
                className={cn(
                  'tw:m-0 tw:cursor-pointer tw:rounded-full tw:border tw:border-solid tw:px-2.5 tw:py-1 tw:text-xs tw:font-medium',
                  subject === String(id) ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground' : 'tw:border-border tw:bg-transparent tw:text-muted-foreground tw:hover:bg-muted',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </Card>

      {!list.loading && pendingHw > 0 && (
        <p className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
          <ClipboardList className="tw:size-4 tw:text-warning" aria-hidden="true" />
          {pendingHw} homework {pendingHw === 1 ? 'task is' : 'tasks are'} not marked done yet.
        </p>
      )}

      {list.loading && !list.data ? (
        <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading activities">
          <Skeleton className="tw:h-40 tw:rounded-xl" />
          <Skeleton className="tw:h-40 tw:rounded-xl" />
        </div>
      ) : list.error ? (
        <ErrorState title="Couldn't load your activities." onRetry={list.reload} />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title="No activities found." description={date ? 'Nothing was logged for this day. Try another date.' : 'Your teachers’ daily notes will appear here.'} />
        </Card>
      ) : (
        <div className={cn('tw:flex tw:flex-col tw:gap-6', list.loading && 'tw:opacity-70')}>
          {groups.map((g) => (
            <section key={g.day} aria-label={dayHeading(g.day)} className="tw:flex tw:flex-col tw:gap-3">
              <h2 className="tw:m-0 tw:flex tw:items-baseline tw:gap-2 tw:text-sm! tw:font-semibold tw:text-muted-foreground">
                {dayHeading(g.day)}
                <span className="tw:text-xs tw:font-normal">{formatDate(g.day)}</span>
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
