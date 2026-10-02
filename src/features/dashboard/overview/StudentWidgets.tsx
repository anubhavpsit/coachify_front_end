import { Link } from 'react-router-dom'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import ProgressRing from '@/components/common/ProgressRing'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import OverviewCard from './OverviewCard'
import { whenLabel, type StudentOverview } from './overviewApi'

const LOW_SCORE = 40
const ROW = 'flex items-start justify-between gap-3 py-2.5'
const LINK_ROW = `${ROW} -mx-2 rounded-md px-2 text-inherit no-underline transition-colors hover:bg-accent`

function DueBadge({ days }: { days: number | null }) {
  const urgent = days !== null && days <= 1
  return <Badge variant={urgent ? 'destructive' : 'soft'}>{whenLabel(days)}</Badge>
}

export function StudentUpcomingCard({ items }: { items: StudentOverview['upcoming_assessments'] }) {
  return (
    <OverviewCard title="Upcoming Assessments" count={items.length} viewAllTo="/students/assessments" isEmpty={items.length === 0} empty="No assessments in the next 14 days.">
      <div className="divide-y divide-border">
        {items.map((a) => (
          <Link key={a.assignment_id} to={`/students/assessments?assessment=${a.assessment_id}`} className={LINK_ROW} title="Open assessment">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{a.title}</div>
              <div className="text-xs text-muted-foreground">
                {a.subject} · {formatDate(a.scheduled_date)}
                {a.last_subject_score !== null && (
                  <span className={a.last_subject_score < LOW_SCORE ? 'text-destructive' : ''}>
                    {' '}
                    · last {a.subject} score {a.last_subject_score}%
                  </span>
                )}
              </div>
            </div>
            <DueBadge days={a.days_until} />
          </Link>
        ))}
      </div>
    </OverviewCard>
  )
}

export function StudentHomeworkCard({ data }: { data: StudentOverview['homework_pending'] }) {
  return (
    <OverviewCard title="Homework Pending" count={data.count} countTone="danger" viewAllTo="/students/activities" isEmpty={data.count === 0} empty="No pending homework. 🎉">
      <div className="divide-y divide-border">
        {data.items.map((h) => (
          <div key={h.activity_id} className="flex flex-col gap-0.5 py-2.5">
            <div className="flex justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">
                {h.subject ?? 'Homework'}
                {h.topic ? ` · ${h.topic}` : ''}
              </span>
              <Badge variant={h.status === 'partial' ? 'warning' : 'destructive'}>{h.status === 'partial' ? 'Partial' : 'Not done'}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(h.activity_date)} · {h.homework}
            </div>
          </div>
        ))}
      </div>
      {data.count > data.items.length && <div className="pt-1 text-xs text-muted-foreground">+{data.count - data.items.length} more</div>}
    </OverviewCard>
  )
}

const TREND = {
  up: { icon: TrendingUp, className: 'text-success', label: 'Improved' },
  down: { icon: TrendingDown, className: 'text-destructive', label: 'Dropped' },
  same: { icon: Minus, className: 'text-muted-foreground', label: 'Same as before' },
} as const

export function StudentResultsCard({ items }: { items: StudentOverview['recent_results'] }) {
  return (
    <OverviewCard title="My Recent Results" viewAllTo="/students/assessments" isEmpty={items.length === 0} empty="No results yet.">
      <div className="divide-y divide-border">
        {items.map((r) => {
          const trend = r.trend ? TREND[r.trend] : null
          return (
            <div key={r.assessment_id} className={cn(ROW, 'items-center')}>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {r.subject} · {formatDate(r.graded_at)}
                  {r.previous_percentage !== null && ` · previous ${r.previous_percentage}%`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={cn('text-base font-bold tabular-nums', r.percentage !== null && r.percentage < LOW_SCORE ? 'text-destructive' : 'text-foreground')}>
                  {r.percentage !== null ? `${r.percentage}%` : '—'}
                </span>
                {trend && <trend.icon className={cn('size-4', trend.className)} aria-label={trend.label} />}
              </div>
            </div>
          )
        })}
      </div>
    </OverviewCard>
  )
}

export function StudentAttendanceCard({ data }: { data: StudentOverview['attendance'] }) {
  const pct = data.percentage
  return (
    <OverviewCard title="Attendance This Month" viewAllTo="/my-attendance" isEmpty={pct === null} empty="No attendance marked this month yet.">
      <div className="flex items-center gap-5">
        <ProgressRing value={pct ?? 0} toneClassName={data.low ? 'text-destructive' : 'text-success'} label={`${pct}% present this month`} />
        <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Present</dt>
          <dd className="m-0 font-semibold text-foreground">{data.present}</dd>
          <dt className="text-muted-foreground">Absent</dt>
          <dd className="m-0 font-semibold text-foreground">{data.absent}</dd>
          {data.leave > 0 && (
            <>
              <dt className="text-muted-foreground">Leave</dt>
              <dd className="m-0 font-semibold text-foreground">{data.leave}</dd>
            </>
          )}
        </dl>
      </div>
      {data.low && <p className="m-0 mt-3 text-xs text-destructive">Below 75% — try not to miss more classes.</p>}
    </OverviewCard>
  )
}

export function StudentNewContentCard({ items }: { items: StudentOverview['new_content'] }) {
  return (
    <OverviewCard title="New Study Material" count={items.length} viewAllTo="/students/activities" isEmpty={items.length === 0} empty="Nothing new this week.">
      <div className="divide-y divide-border">
        {items.map((c) => (
          <Link key={c.activity_id} to={`/students/activities/${c.activity_id}/topic`} className={cn(LINK_ROW, 'flex-col gap-0.5')}>
            <div className="text-sm font-semibold text-foreground">
              {c.subject ?? 'Class'}
              {c.topic ? ` · ${c.topic}` : ''}
            </div>
            <div className="text-xs text-muted-foreground">
              Class on {formatDate(c.activity_date)}
              {c.solutions_available && <span className="text-success"> · solutions available</span>}
            </div>
          </Link>
        ))}
      </div>
    </OverviewCard>
  )
}
