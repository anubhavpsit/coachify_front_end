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

const tone = (p: number) => (p >= 75 ? 'tw:text-success' : p >= 40 ? 'tw:text-warning' : 'tw:text-destructive')

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
    <div className="tw:flex tw:size-14 tw:shrink-0 tw:flex-col tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary-soft tw:text-primary" aria-hidden="true">
      <span className="tw:text-xs tw:font-semibold tw:uppercase">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
      <span className="tw:text-xl tw:leading-none tw:font-bold">{d.getDate()}</span>
    </div>
  )
}

function FileLinks({ label, files }: { label: string; files: StudentFile[] }) {
  if (!files.length) return null
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <span className="tw:text-xs tw:text-muted-foreground">{label}:</span>
      {files.map((f) => (
        <a
          key={f.id}
          href={studentFileUrl(f)}
          target="_blank"
          rel="noreferrer"
          className="tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-full tw:border tw:border-solid tw:border-border tw:px-2.5 tw:py-0.5 tw:text-xs tw:text-foreground tw:no-underline tw:hover:bg-muted"
        >
          <Paperclip className="tw:size-3" aria-hidden="true" /> {f.original_name}
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
    if (f === 'loading') return <Skeleton className="tw:h-6 tw:w-40" />
    if (!f)
      return (
        <Button size="xs" variant="ghost" className="tw:w-fit tw:self-start" onClick={() => loadFiles(a.assessment.id)}>
          <Paperclip aria-hidden="true" /> Show files
        </Button>
      )
    const none = f.question_papers.length === 0 && (!includeAnswers || f.answer_sheets.length === 0)
    return none ? (
      <span className="tw:text-xs tw:text-muted-foreground">No files uploaded.</span>
    ) : (
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <FileLinks label="Question paper" files={f.question_papers} />
        {includeAnswers && <FileLinks label="Your answer sheet" files={f.answer_sheets} />}
      </div>
    )
  }

  if (data.error) return <ErrorState title="Couldn't load your assessments." onRetry={data.reload} />

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader title="My Assessments" description="Your upcoming tests and how you did in the ones you've taken." className="tw:mb-0" />

      {data.loading ? (
        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-3" role="status" aria-label="Loading assessments">
          <Skeleton className="tw:h-24 tw:rounded-xl" />
          <Skeleton className="tw:h-24 tw:rounded-xl" />
          <Skeleton className="tw:h-24 tw:rounded-xl" />
        </div>
      ) : (
        <m.div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-3" variants={stagger(0.05)} initial="hidden" animate="visible">
          <StatCard label="Upcoming" value={upcoming.length} icon={CalendarClock} tone="info" />
          <StatCard label="Completed" value={history.length} icon={CheckCircle2} tone="success" />
          <StatCard label="Average score" value={average === null ? 0 : Math.round(average)} icon={TrendingUp} tone="primary" format={(v) => (average === null ? '—' : `${v}%`)} />
        </m.div>
      )}

      <Card className="tw:gap-4">
        <CardHeader>
          <CardTitle className="tw:flex tw:items-center tw:gap-2">
            <CalendarClock className="tw:size-4 tw:text-info" aria-hidden="true" /> Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.loading ? (
            <Skeleton className="tw:h-20" />
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No upcoming assessments." description="When your teacher assigns a test, it shows up here." className="tw:py-6" />
          ) : (
            <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
              {upcoming.map((a) => {
                const w = whenLabel(a.scheduled_date)
                return (
                  <li
                    key={a.id}
                    id={`student-assessment-row-${a.assessment.id}`}
                    className={cn('tw:flex tw:flex-wrap tw:items-center tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:p-3', a.assessment.id === focusId && 'tw:border-primary tw:bg-primary-soft/40')}
                  >
                    <DateTile iso={a.scheduled_date} />
                    <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1">
                      <span className="tw:font-semibold tw:text-foreground">{a.assessment.title}</span>
                      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-xs tw:text-muted-foreground">
                        {a.assessment.subject && <Badge variant="soft">{a.assessment.subject.subject}</Badge>}
                        <span>{a.assessment.total_marks} marks</span>
                        {a.assessment.teacher && (
                          <span className="tw:inline-flex tw:items-center tw:gap-1">
                            <UserRound className="tw:size-3" aria-hidden="true" /> {a.assessment.teacher.name}
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

      <Card className="tw:gap-4">
        <CardHeader>
          <CardTitle className="tw:flex tw:items-center tw:gap-2">
            <ClipboardList className="tw:size-4 tw:text-success" aria-hidden="true" /> Completed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.loading ? (
            <Skeleton className="tw:h-24" />
          ) : history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No completed assessments yet." className="tw:py-6" />
          ) : (
            <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
              {history.map((a) => {
                const pct = a.result ? Number(a.result.percentage) : null
                return (
                  <li key={a.id} className="tw:flex tw:flex-wrap tw:items-start tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:p-3">
                    {pct !== null ? (
                      <ProgressRing value={pct} size={56} stroke={6} toneClassName={tone(pct)} label={`Score ${pct.toFixed(2)}%`} />
                    ) : (
                      <span className="tw:flex tw:size-14 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted tw:text-xs tw:text-muted-foreground">—</span>
                    )}
                    <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1.5">
                      <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-3 tw:gap-y-1">
                        <span className="tw:font-semibold tw:text-foreground">{a.assessment.title}</span>
                        {a.result && (
                          <span className={cn('tw:text-sm tw:font-semibold tw:tabular-nums', tone(pct!))}>
                            {a.result.marks_obtained}/{a.result.total_marks} · {pct!.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-xs tw:text-muted-foreground">
                        {a.assessment.subject && <Badge variant="soft">{a.assessment.subject.subject}</Badge>}
                        <span>{formatDate(a.attempted_at)}</span>
                      </div>
                      {a.result?.teacher_notes && (
                        <p className="tw:m-0 tw:flex tw:items-start tw:gap-1.5 tw:rounded-md tw:bg-muted/60 tw:px-2.5 tw:py-1.5 tw:text-sm">
                          <MessageSquareQuote className="tw:mt-0.5 tw:size-3.5 tw:shrink-0 tw:text-muted-foreground" aria-hidden="true" />
                          <span>{a.result.teacher_notes}</span>
                        </p>
                      )}
                      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
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
