import { useEffect, useState } from 'react'
import { m } from 'motion/react'
import { CalendarClock, CheckCircle2, ClipboardList, FileText, MessageSquareQuote, Paperclip, TrendingUp, UserRound } from 'lucide-react'
import { stagger } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import ProgressRing from '@/components/common/ProgressRing'
import StatCard from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import { useFocusRow } from '@/utils/useFocusRow'
import ReleasedPaperDialog from '../components/ReleasedPaperDialog'
import { fetchMyAssessmentFiles, fetchMyAssessments, studentFileUrl, type StudentAssignment, type StudentFile, type StudentFiles } from '../services/assessmentsService'

const tone = (p: number) => (p >= 75 ? 'text-success' : p >= 40 ? 'text-warning' : 'text-destructive')

function whenLabel(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const days = Math.round((d.getTime() - t.getTime()) / 86_400_000)
  if (Number.isNaN(days)) return null
  if (days === 0) return { text: 'Today', urgent: true }
  if (days === 1) return { text: 'Tomorrow', urgent: true }
  if (days > 1) return { text: `In ${days} days`, urgent: days <= 3 }
  return { text: `${-days} ${days === -1 ? 'day' : 'days'} ago`, urgent: false }
}

function DateTile({ iso }: { iso: string }) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return (
    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary" aria-hidden="true">
      <span className="text-xs font-semibold uppercase">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
      <span className="text-xl leading-none font-bold">{d.getDate()}</span>
    </div>
  )
}

function FileLinks({ label, files }: { label: string; files: StudentFile[] }) {
  if (!files.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}:</span>
      {files.map((f) => (
        <a
          key={f.id}
          href={studentFileUrl(f)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-solid border-border px-2.5 py-0.5 text-xs text-foreground no-underline hover:bg-muted"
        >
          <Paperclip className="size-3" aria-hidden="true" /> {f.original_name}
        </a>
      ))}
    </div>
  )
}

/** Route: no guard (Q9) — the student endpoints are self-only. */
export default function StudentAssessmentsPage() {
  const data = useAsync(() => fetchMyAssessments().catch((e) => (console.error('Error loading assessments:', e), Promise.reject(e))), [])
  const upcoming = data.data?.upcoming ?? []
  const history = data.data?.history ?? []
  const focusId = useFocusRow('assessment', 'student-assessment-row-', !data.loading)
  const [files, setFiles] = useState<Record<number, StudentFiles | 'loading'>>({})
  const [paper, setPaper] = useState<{ id: number; title: string } | null>(null)

  const loadFiles = (assessmentId: number) => {
    setFiles((f) => ({ ...f, [assessmentId]: 'loading' }))
    fetchMyAssessmentFiles(assessmentId)
      .then((res) => setFiles((f) => ({ ...f, [assessmentId]: res ?? { question_papers: [], answer_sheets: [] } })))
      .catch((e) => {
        console.error('Error loading assessment files:', e)
        setFiles((f) => {
          const next = { ...f }
          delete next[assessmentId]
          return next
        })
      })
  }

  // Opened from the dashboard → show that upcoming assessment's files straight away (legacy).
  useEffect(() => {
    if (!data.loading && focusId !== null && upcoming.some((a) => a.assessment.id === focusId)) loadFiles(focusId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.loading, focusId])

  const scored = history.filter((a) => a.result)
  const average = scored.length ? scored.reduce((s, a) => s + Number(a.result!.percentage), 0) / scored.length : null

  const filesBlock = (a: StudentAssignment, includeAnswers: boolean) => {
    const f = files[a.assessment.id]
    if (f === 'loading') return <Skeleton className="h-6 w-40" />
    if (!f)
      return (
        <Button size="xs" variant="ghost" className="w-fit self-start" onClick={() => loadFiles(a.assessment.id)}>
          <Paperclip aria-hidden="true" /> Show files
        </Button>
      )
    const none = f.question_papers.length === 0 && (!includeAnswers || f.answer_sheets.length === 0)
    return none ? (
      <span className="text-xs text-muted-foreground">No files uploaded.</span>
    ) : (
      <div className="flex flex-col gap-1.5">
        <FileLinks label="Question paper" files={f.question_papers} />
        {includeAnswers && <FileLinks label="Your answer sheet" files={f.answer_sheets} />}
      </div>
    )
  }

  if (data.error) return <ErrorState title="Couldn't load your assessments." onRetry={data.reload} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Assessments" description="Your upcoming tests and how you did in the ones you've taken." className="mb-0" />

      {data.loading ? (
        <div className="grid gap-4 sm:grid-cols-3" role="status" aria-label="Loading assessments">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <m.div className="grid grid-cols-1 gap-4 sm:grid-cols-3" variants={stagger(0.05)} initial="hidden" animate="visible">
          <StatCard label="Upcoming" value={upcoming.length} icon={CalendarClock} tone="info" />
          <StatCard label="Completed" value={history.length} icon={CheckCircle2} tone="success" />
          <StatCard label="Average score" value={average === null ? 0 : Math.round(average)} icon={TrendingUp} tone="primary" format={(v) => (average === null ? '—' : `${v}%`)} />
        </m.div>
      )}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-info" aria-hidden="true" /> Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.loading ? (
            <Skeleton className="h-20" />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No upcoming assessments." description="When your teacher assigns a test, it shows up here." className="py-6" />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {upcoming.map((a) => {
                const w = whenLabel(a.scheduled_date)
                return (
                  <li
                    key={a.id}
                    id={`student-assessment-row-${a.assessment.id}`}
                    className={cn('flex flex-wrap items-center gap-4 rounded-xl border border-solid border-border p-3', a.assessment.id === focusId && 'border-primary bg-primary-soft/40')}
                  >
                    <DateTile iso={a.scheduled_date} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-semibold text-foreground">{a.assessment.title}</span>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {a.assessment.subject && <Badge variant="soft">{a.assessment.subject.subject}</Badge>}
                        <span>{a.assessment.total_marks} marks</span>
                        {a.assessment.teacher && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3" aria-hidden="true" /> {a.assessment.teacher.name}
                          </span>
                        )}
                        <span>{formatDate(a.scheduled_date)}</span>
                      </div>
                      {filesBlock(a, false)}
                    </div>
                    {w && <Badge variant={w.urgent ? 'warning' : 'secondary'}>{w.text}</Badge>}
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-success" aria-hidden="true" /> Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.loading ? (
            <Skeleton className="h-24" />
          ) : history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No completed assessments yet." className="py-6" />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {history.map((a) => {
                const pct = a.result ? Number(a.result.percentage) : null
                return (
                  <li key={a.id} className="flex flex-wrap items-start gap-4 rounded-xl border border-solid border-border p-3">
                    {pct !== null ? (
                      <ProgressRing value={pct} size={56} stroke={6} toneClassName={tone(pct)} label={`Score ${pct.toFixed(2)}%`} />
                    ) : (
                      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">—</span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-semibold text-foreground">{a.assessment.title}</span>
                        {a.result && (
                          <span className={cn('text-sm font-semibold tabular-nums', tone(pct!))}>
                            {a.result.marks_obtained}/{a.result.total_marks} · {pct!.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {a.assessment.subject && <Badge variant="soft">{a.assessment.subject.subject}</Badge>}
                        <span>{formatDate(a.attempted_at)}</span>
                      </div>
                      {a.result?.teacher_notes && (
                        <p className="m-0 flex items-start gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-sm">
                          <MessageSquareQuote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span>{a.result.teacher_notes}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {a.assessment.question_paper_released_at && (
                          <Button size="xs" variant="outline" onClick={() => setPaper({ id: a.assessment.id, title: a.assessment.title })}>
                            <FileText aria-hidden="true" /> View question paper
                          </Button>
                        )}
                        {filesBlock(a, true)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ReleasedPaperDialog paper={paper} onClose={() => setPaper(null)} />
    </div>
  )
}
