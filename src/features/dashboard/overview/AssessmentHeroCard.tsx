import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, ClipboardCheck, PenLine, Sparkles, TriangleAlert } from 'lucide-react'
import ProgressRing from '@/components/common/ProgressRing'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import { whenLabel, type AdminAssessmentsOverview, type StudentOverview, type TeacherOverview } from './overviewApi'

/**
 * The assessment card at the very top of the dashboard — the first thing each
 * role sees. Data comes from the same GET /dashboard/overview request.
 * Renders nothing when there's nothing to show.
 */

function Shell({ tone = 'primary', title, children }: { tone?: 'primary' | 'danger'; title: string; children: ReactNode }) {
  return (
    <Card className={cn('gap-0 overflow-hidden border-l-4 py-0', tone === 'danger' ? 'border-l-destructive' : 'border-l-primary')} aria-label={title}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <ClipboardCheck className="size-4" aria-hidden="true" /> {title}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function Tile({ to, tone, icon: Icon, value, label, hint }: { to: string; tone: 'danger' | 'warning' | 'info'; icon: typeof PenLine; value: number; label: string; hint?: ReactNode }) {
  const colors = {
    danger: 'bg-destructive-soft text-destructive',
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
  }[tone]
  return (
    <Link to={to} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-solid border-border p-3 text-inherit no-underline transition-colors hover:bg-accent">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-lg', colors)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-2xl leading-none font-bold tabular-nums">{value}</span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}

// ---------------------------------------------------------------- student

export function StudentAssessmentHero({ data }: { data: StudentOverview }) {
  const next = [...data.upcoming_assessments].filter((a) => a.days_until !== null && a.days_until >= 0).sort((a, b) => (a.days_until ?? 0) - (b.days_until ?? 0))[0]
  const last = data.recent_results[0]
  if (!next && !last) return null

  const delta = last && last.percentage !== null && last.previous_percentage !== null ? Math.round((last.percentage - last.previous_percentage) * 10) / 10 : null

  return (
    <Shell title={next ? 'Your next test' : 'Your last result'}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        {next && (
          <Link to={`/students/assessments?assessment=${next.assessment_id}`} className="flex min-w-0 flex-1 items-center gap-4 text-inherit no-underline">
            <span className={cn('flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl text-center', next.days_until === 0 ? 'bg-destructive text-white' : next.days_until! <= 2 ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary')}>
              {next.days_until === 0 ? (
                <span className="text-sm font-bold">TODAY</span>
              ) : (
                <>
                  <span className="text-2xl leading-none font-bold">{next.days_until}</span>
                  <span className="text-[11px] font-semibold uppercase">{next.days_until === 1 ? 'day' : 'days'}</span>
                </>
              )}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-lg leading-tight font-bold text-foreground">
                {next.subject} — {next.title}
              </span>
              <span className="text-sm text-muted-foreground">
                {next.days_until === 0 ? 'Today — all the best! 💪' : `${whenLabel(next.days_until)} · ${formatDate(next.scheduled_date)}`}
              </span>
              {next.last_subject_score !== null && (
                <span className="text-xs text-muted-foreground">
                  Your last {next.subject} score: <strong className="text-foreground">{next.last_subject_score}%</strong>
                </span>
              )}
            </span>
          </Link>
        )}
        {last && last.percentage !== null && (
          <Link to={`/students/assessments?assessment=${last.assessment_id}`} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 text-inherit no-underline md:w-72">
            <ProgressRing value={last.percentage} size={52} stroke={6} toneClassName={last.percentage >= 75 ? 'text-success' : last.percentage >= 40 ? 'text-warning' : 'text-destructive'} label={`Last score ${last.percentage}%`} />
            <span className="flex min-w-0 flex-col">
              <span className="text-xs text-muted-foreground">Last result</span>
              <span className="truncate text-sm font-semibold">{last.title}</span>
              {delta !== null && delta !== 0 && (
                <span className={cn('flex items-center gap-0.5 text-xs font-semibold', delta > 0 ? 'text-success' : 'text-destructive')}>
                  {delta > 0 ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
                  {delta > 0 ? '+' : ''}
                  {delta}% since your last {last.subject} test
                </span>
              )}
            </span>
          </Link>
        )}
      </div>
    </Shell>
  )
}

// ---------------------------------------------------------------- teacher

export function TeacherAssessmentHero({ data }: { data: TeacherOverview }) {
  const pending = data.results_to_enter
  const today = data.upcoming_assessments.filter((a) => a.days_until === 0)
  const week = data.upcoming_assessments.filter((a) => (a.days_until ?? -1) > 0)
  if (pending.length === 0 && today.length === 0 && week.length === 0) return null

  const pendingStudents = pending.reduce((s, p) => s + p.pending_count, 0)
  const unapproved = new Set(data.papers_to_approve.map((p) => p.assessment_id))
  const todayUnapproved = today.filter((a) => unapproved.has(a.assessment_id)).length

  return (
    <Shell title="Your assessments" tone={pending.length ? 'danger' : 'primary'}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {pending.length > 0 && (
          <Tile
            to={pending.length === 1 ? `/assessments?assessment=${pending[0].assessment_id}&results=1` : '/assessments?tab=needs_results'}
            tone="danger"
            icon={PenLine}
            value={pending.length}
            label={pending.length === 1 ? 'Results to enter' : 'Results to enter'}
            hint={pending.length === 1 ? `${pending[0].title} · ${pendingStudents} student${pendingStudents === 1 ? '' : 's'}` : `${pendingStudents} students waiting`}
          />
        )}
        {today.length > 0 && (
          <Tile
            to={today.length === 1 ? `/assessments?assessment=${today[0].assessment_id}` : '/assessments?tab=today'}
            tone="warning"
            icon={CalendarClock}
            value={today.length}
            label={today.length === 1 ? 'Test today' : 'Tests today'}
            hint={
              todayUnapproved ? (
                <span className="flex items-center gap-1 text-warning">
                  <TriangleAlert className="size-3" aria-hidden="true" /> Question paper not approved
                </span>
              ) : (
                today[0].title
              )
            }
          />
        )}
        {week.length > 0 && <Tile to="/assessments?tab=upcoming" tone="info" icon={Sparkles} value={week.length} label="This week" hint={`Next: ${formatDate(week[0].scheduled_date)}`} />}
      </div>
    </Shell>
  )
}

// ---------------------------------------------------------------- admin

export function AdminAssessmentHero({ data }: { data: AdminAssessmentsOverview }) {
  const rate = data.on_time.percentage
  if (data.needs_results === 0 && data.tests_today === 0 && data.this_week === 0 && rate === null) return null

  return (
    <Shell title="Assessments" tone={data.needs_results ? 'danger' : 'primary'}>
      <div className="grid gap-4 lg:grid-cols-[auto_1fr_1fr]">
        <div className="flex items-center gap-3">
          {rate !== null ? (
            <ProgressRing value={rate} size={64} stroke={7} toneClassName={rate >= 80 ? 'text-success' : rate >= 50 ? 'text-warning' : 'text-destructive'} label={`${rate}% on time`} />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">—</span>
          )}
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Results on time</span>
            <span className="text-xs text-muted-foreground">
              {rate !== null ? `${data.on_time.on_time} of ${data.on_time.total} tests this month` : 'No tests finished this month yet'}
            </span>
            <span className="text-xs text-muted-foreground">by the day after the test</span>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {data.needs_results > 0 ? (
            <Tile to="/assessments?tab=needs_results" tone="danger" icon={PenLine} value={data.needs_results} label="Need results" hint={`${data.pending_students} students waiting`} />
          ) : (
            <span className="flex items-center gap-2 rounded-xl border border-solid border-border p-3 text-sm text-success">
              <ClipboardCheck className="size-4" aria-hidden="true" /> All results are in
            </span>
          )}
          {data.overdue_by_teacher.length > 0 && (
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Results waiting by teacher">
              {data.overdue_by_teacher.map((t) => (
                <li key={t.teacher_id ?? 0}>
                  <Badge variant="destructive" title={`${t.students} students waiting`}>
                    {t.name} · {t.assessments}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Tile
            to="/assessments?tab=today"
            tone="warning"
            icon={CalendarClock}
            value={data.tests_today}
            label={data.tests_today === 1 ? 'Test today' : 'Tests today'}
            hint={data.today_list[0] ? `${data.today_list[0].subject} — ${data.today_list[0].title}` : undefined}
          />
          <Tile to="/assessments?tab=upcoming" tone="info" icon={Sparkles} value={data.this_week} label="This week" />
        </div>
      </div>
    </Shell>
  )
}
