import { Link } from 'react-router-dom'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import ProgressRing from '@/components/common/ProgressRing'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import OverviewCard from './OverviewCard'
import { whenLabel, type StudentOverview } from './overviewApi'

const LOW_SCORE = 40
const ROW = 'tw:flex tw:items-start tw:justify-between tw:gap-3 tw:py-2.5'
const LINK_ROW = `${ROW} tw:-mx-2 tw:rounded-md tw:px-2 tw:text-inherit tw:no-underline tw:transition-colors tw:hover:bg-accent`

function DueBadge({ days }: { days: number | null }) {
  const urgent = days !== null && days <= 1
  return <Badge variant={urgent ? 'destructive' : 'soft'}>{whenLabel(days)}</Badge>
}

export function StudentUpcomingCard({ items }: { items: StudentOverview['upcoming_assessments'] }) {
  return (
    <OverviewCard title="Upcoming Assessments" count={items.length} viewAllTo="/students/assessments" isEmpty={items.length === 0} empty="No assessments in the next 14 days.">
      <div className="tw:divide-y tw:divide-border">
        {items.map((a) => (
          <Link key={a.assignment_id} to={`/students/assessments?assessment=${a.assessment_id}`} className={LINK_ROW} title="Open assessment">
            <div className="tw:min-w-0">
              <div className="tw:text-sm tw:font-semibold tw:text-foreground">{a.title}</div>
              <div className="tw:text-xs tw:text-muted-foreground">
                {a.subject} · {formatDate(a.scheduled_date)}
                {a.last_subject_score !== null && (
                  <span className={a.last_subject_score < LOW_SCORE ? 'tw:text-destructive' : ''}>
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
      <div className="tw:divide-y tw:divide-border">
        {data.items.map((h) => (
          <div key={h.activity_id} className="tw:flex tw:flex-col tw:gap-0.5 tw:py-2.5">
            <div className="tw:flex tw:justify-between tw:gap-2">
              <span className="tw:text-sm tw:font-semibold tw:text-foreground">
                {h.subject ?? 'Homework'}
                {h.topic ? ` · ${h.topic}` : ''}
              </span>
              <Badge variant={h.status === 'partial' ? 'warning' : 'destructive'}>{h.status === 'partial' ? 'Partial' : 'Not done'}</Badge>
            </div>
            <div className="tw:text-xs tw:text-muted-foreground">
              {formatDate(h.activity_date)} · {h.homework}
            </div>
          </div>
        ))}
      </div>
      {data.count > data.items.length && <div className="tw:pt-1 tw:text-xs tw:text-muted-foreground">+{data.count - data.items.length} more</div>}
    </OverviewCard>
  )
}

const TREND = {
  up: { icon: TrendingUp, className: 'tw:text-success', label: 'Improved' },
  down: { icon: TrendingDown, className: 'tw:text-destructive', label: 'Dropped' },
  same: { icon: Minus, className: 'tw:text-muted-foreground', label: 'Same as before' },
} as const

export function StudentResultsCard({ items }: { items: StudentOverview['recent_results'] }) {
  return (
    <OverviewCard title="My Recent Results" viewAllTo="/students/assessments" isEmpty={items.length === 0} empty="No results yet.">
      <div className="tw:divide-y tw:divide-border">
        {items.map((r) => {
          const trend = r.trend ? TREND[r.trend] : null
          return (
            <div key={r.assessment_id} className={cn(ROW, 'tw:items-center')}>
              <div className="tw:min-w-0">
                <div className="tw:text-sm tw:font-semibold tw:text-foreground">{r.title}</div>
                <div className="tw:text-xs tw:text-muted-foreground">
                  {r.subject} · {formatDate(r.graded_at)}
                  {r.previous_percentage !== null && ` · previous ${r.previous_percentage}%`}
                </div>
              </div>
              <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-1.5">
                <span className={cn('tw:text-base tw:font-bold tw:tabular-nums', r.percentage !== null && r.percentage < LOW_SCORE ? 'tw:text-destructive' : 'tw:text-foreground')}>
                  {r.percentage !== null ? `${r.percentage}%` : '—'}
                </span>
                {trend && <trend.icon className={cn('tw:size-4', trend.className)} aria-label={trend.label} />}
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
      <div className="tw:flex tw:items-center tw:gap-5">
        <ProgressRing value={pct ?? 0} toneClassName={data.low ? 'tw:text-destructive' : 'tw:text-success'} label={`${pct}% present this month`} />
        <dl className="tw:m-0 tw:grid tw:grid-cols-[auto_auto] tw:gap-x-4 tw:gap-y-1 tw:text-sm">
          <dt className="tw:text-muted-foreground">Present</dt>
          <dd className="tw:m-0 tw:font-semibold tw:text-foreground">{data.present}</dd>
          <dt className="tw:text-muted-foreground">Absent</dt>
          <dd className="tw:m-0 tw:font-semibold tw:text-foreground">{data.absent}</dd>
          {data.leave > 0 && (
            <>
              <dt className="tw:text-muted-foreground">Leave</dt>
              <dd className="tw:m-0 tw:font-semibold tw:text-foreground">{data.leave}</dd>
            </>
          )}
        </dl>
      </div>
      {data.low && <p className="tw:m-0 tw:mt-3 tw:text-xs tw:text-destructive">Below 75% — try not to miss more classes.</p>}
    </OverviewCard>
  )
}

export function StudentNewContentCard({ items }: { items: StudentOverview['new_content'] }) {
  return (
    <OverviewCard title="New Study Material" count={items.length} viewAllTo="/students/activities" isEmpty={items.length === 0} empty="Nothing new this week.">
      <div className="tw:divide-y tw:divide-border">
        {items.map((c) => (
          <Link key={c.activity_id} to={`/students/activities/${c.activity_id}/topic`} className={cn(LINK_ROW, 'tw:flex-col tw:gap-0.5')}>
            <div className="tw:text-sm tw:font-semibold tw:text-foreground">
              {c.subject ?? 'Class'}
              {c.topic ? ` · ${c.topic}` : ''}
            </div>
            <div className="tw:text-xs tw:text-muted-foreground">
              Class on {formatDate(c.activity_date)}
              {c.solutions_available && <span className="tw:text-success"> · solutions available</span>}
            </div>
          </Link>
        ))}
      </div>
    </OverviewCard>
  )
}
