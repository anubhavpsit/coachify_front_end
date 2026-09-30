import { Link } from 'react-router-dom'
import { CheckCircle2, PartyPopper } from 'lucide-react'
import ProgressRing from '@/components/common/ProgressRing'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import OverviewCard from './OverviewCard'
import { whenLabel, type TeacherOverview } from './overviewApi'

const ROW = 'tw:flex tw:items-start tw:justify-between tw:gap-3 tw:py-2.5'

export function TeacherUpcomingCard({ items }: { items: TeacherOverview['upcoming_assessments'] }) {
  return (
    <OverviewCard title="Upcoming Assessments" count={items.length} viewAllTo="/assessments" isEmpty={items.length === 0} empty="No assessments in the next 7 days.">
      <div className="tw:divide-y tw:divide-border">
        {items.map((a) => (
          <Link
            key={a.assessment_id}
            to={`/assessments?assessment=${a.assessment_id}`}
            className={cn(ROW, 'tw:-mx-2 tw:rounded-md tw:px-2 tw:text-inherit tw:no-underline tw:transition-colors tw:hover:bg-accent')}
            title="Open assessment"
          >
            <div className="tw:min-w-0">
              <div className="tw:text-sm tw:font-semibold tw:text-foreground">{a.title}</div>
              <div className="tw:text-xs tw:text-muted-foreground">
                {a.subject} · {formatDate(a.scheduled_date)} · {a.students_count} student{a.students_count === 1 ? '' : 's'}
              </div>
            </div>
            <Badge variant={a.days_until === 0 ? 'destructive' : 'soft'}>{whenLabel(a.days_until)}</Badge>
          </Link>
        ))}
      </div>
    </OverviewCard>
  )
}

export function TeacherPapersCard({ items }: { items: TeacherOverview['papers_to_approve'] }) {
  return (
    <OverviewCard title="Question Papers to Approve" count={items.length} countTone="danger" viewAllTo="/assessments" isEmpty={items.length === 0} empty="No papers waiting for approval.">
      <div className="tw:divide-y tw:divide-border">
        {items.map((p) => (
          <div key={p.assessment_id} className={ROW}>
            <div className="tw:min-w-0">
              <div className="tw:text-sm tw:font-semibold tw:text-foreground">{p.title}</div>
              <div className="tw:text-xs tw:text-muted-foreground">
                {p.subject} · test on {formatDate(p.scheduled_date)}
              </div>
            </div>
            {p.days_until !== null && <Badge variant={p.days_until <= 2 ? 'destructive' : 'warning'}>{whenLabel(p.days_until)}</Badge>}
          </div>
        ))}
      </div>
    </OverviewCard>
  )
}

export function TeacherGradingCard({ items }: { items: TeacherOverview['results_to_enter'] }) {
  return (
    <OverviewCard title="Results to Enter" count={items.length} countTone="danger" viewAllTo="/assessments" isEmpty={items.length === 0} empty="All results are entered.">
      <div className="tw:divide-y tw:divide-border">
        {items.map((r) => (
          <div key={r.assessment_id} className={ROW}>
            <div className="tw:min-w-0">
              <div className="tw:text-sm tw:font-semibold tw:text-foreground">{r.title}</div>
              <div className="tw:text-xs tw:text-muted-foreground">
                {r.subject} · held {formatDate(r.scheduled_date)} · {r.pending_count} pending
              </div>
            </div>
            <Badge variant="warning">{whenLabel(r.days_since !== null ? -r.days_since : null)}</Badge>
          </div>
        ))}
      </div>
    </OverviewCard>
  )
}

export function TeacherTodayCard({ data }: { data: TeacherOverview['today_activity'] }) {
  const done = data.missing_count === 0
  const pct = data.total_students > 0 ? Math.round((data.logged_count / data.total_students) * 100) : 0
  return (
    <OverviewCard title="Today's Activity Log" viewAllTo="/teachers/daily-activities" isEmpty={data.total_students === 0} empty="No students assigned to you yet.">
      {data.is_holiday ? (
        <div className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
          <PartyPopper className="tw:size-4" aria-hidden="true" />
          Today is a holiday — no activities needed.
        </div>
      ) : (
        <div className="tw:flex tw:flex-col tw:gap-3">
          <div className="tw:flex tw:items-center tw:gap-4">
            <ProgressRing value={pct} size={72} stroke={7} toneClassName={done ? 'tw:text-success' : 'tw:text-warning'} label={`${data.logged_count} of ${data.total_students} students logged today`} />
            <div>
              <div className={cn('tw:text-2xl tw:font-bold tw:tabular-nums', done ? 'tw:text-success' : 'tw:text-warning')}>
                {data.logged_count}/{data.total_students}
              </div>
              <div className="tw:text-sm tw:text-muted-foreground">students logged today</div>
            </div>
          </div>
          {done ? (
            <p className="tw:m-0 tw:flex tw:items-center tw:gap-1.5 tw:text-sm tw:text-success">
              <CheckCircle2 className="tw:size-4" aria-hidden="true" /> All done for today. 👍
            </p>
          ) : (
            <div className="tw:flex tw:flex-col tw:gap-1.5">
              <div className="tw:text-xs tw:text-muted-foreground">Still to add:</div>
              <div className="tw:flex tw:flex-wrap tw:gap-1">
                {data.missing.map((s) => (
                  <Badge key={s.id} variant="secondary">
                    {s.name}
                  </Badge>
                ))}
                {data.missing_count > data.missing.length && <span className="tw:text-xs tw:text-muted-foreground">+{data.missing_count - data.missing.length} more</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </OverviewCard>
  )
}

const REASON_LABEL = (r: TeacherOverview['students_attention'][number]['reasons'][number]) =>
  r.type === 'low_attendance' ? `Attendance ${r.value}%` : r.type === 'low_score' ? `Last score ${r.value}%${r.subject ? ` (${r.subject})` : ''}` : `${r.value} homework not done`

export function TeacherAttentionCard({ items }: { items: TeacherOverview['students_attention'] }) {
  return (
    <OverviewCard title="Students Needing Attention" count={items.length} countTone="danger" viewAllTo="/students" isEmpty={items.length === 0} empty="All your students are on track.">
      <div className="tw:divide-y tw:divide-border">
        {items.map((s) => (
          <div key={s.student_id} className="tw:flex tw:flex-col tw:gap-1.5 tw:py-2.5">
            <div className="tw:text-sm tw:font-semibold tw:text-foreground">{s.name}</div>
            <div className="tw:flex tw:flex-wrap tw:gap-1">
              {s.reasons.map((r) => (
                <Badge key={r.type} variant="destructive">
                  {REASON_LABEL(r)}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </OverviewCard>
  )
}
