import { Link } from 'react-router-dom'
import { formatDate } from '../../utils/date'
import OverviewCard from './OverviewCard'
import { whenLabel, type TeacherOverview } from './overviewApi'

export function TeacherUpcomingCard({ items }: { items: TeacherOverview['upcoming_assessments'] }) {
  return (
    <OverviewCard title="Upcoming Assessments" count={items.length} viewAllTo="/assessments"
      isEmpty={items.length === 0} empty="No assessments in the next 7 days.">
      {items.map(a => (
        <Link
          key={a.assessment_id}
          to={`/assessments?assessment=${a.assessment_id}`}
          className="d-flex justify-content-between align-items-start gap-2 mb-12 text-decoration-none"
          title="Open assessment"
        >
          <div>
            <div className="fw-semibold text-sm text-primary-light">{a.title}</div>
            <div className="text-xs text-secondary-light">
              {a.subject} · {formatDate(a.scheduled_date)} · {a.students_count} student{a.students_count === 1 ? '' : 's'}
            </div>
          </div>
          <span className={`badge text-xs ${a.days_until === 0 ? 'bg-danger-100 text-danger-600' : 'bg-primary-100 text-primary-600'}`}>
            {whenLabel(a.days_until)}
          </span>
        </Link>
      ))}
    </OverviewCard>
  )
}

export function TeacherPapersCard({ items }: { items: TeacherOverview['papers_to_approve'] }) {
  return (
    <OverviewCard title="Question Papers to Approve" count={items.length} countTone="danger" viewAllTo="/assessments"
      isEmpty={items.length === 0} empty="No papers waiting for approval.">
      {items.map(p => (
        <div key={p.assessment_id} className="d-flex justify-content-between align-items-start gap-2 mb-12">
          <div>
            <div className="fw-semibold text-sm">{p.title}</div>
            <div className="text-xs text-secondary-light">{p.subject} · test on {formatDate(p.scheduled_date)}</div>
          </div>
          {p.days_until !== null && (
            <span className={`badge text-xs ${p.days_until <= 2 ? 'bg-danger-100 text-danger-600' : 'bg-warning-100 text-warning-600'}`}>
              {whenLabel(p.days_until)}
            </span>
          )}
        </div>
      ))}
    </OverviewCard>
  )
}

export function TeacherGradingCard({ items }: { items: TeacherOverview['results_to_enter'] }) {
  return (
    <OverviewCard title="Results to Enter" count={items.length} countTone="danger" viewAllTo="/assessments"
      isEmpty={items.length === 0} empty="All results are entered.">
      {items.map(r => (
        <div key={r.assessment_id} className="d-flex justify-content-between align-items-start gap-2 mb-12">
          <div>
            <div className="fw-semibold text-sm">{r.title}</div>
            <div className="text-xs text-secondary-light">
              {r.subject} · held {formatDate(r.scheduled_date)} · {r.pending_count} pending
            </div>
          </div>
          <span className="badge text-xs bg-warning-100 text-warning-600">{whenLabel(r.days_since !== null ? -r.days_since : null)}</span>
        </div>
      ))}
    </OverviewCard>
  )
}

export function TeacherTodayCard({ data }: { data: TeacherOverview['today_activity'] }) {
  const done = data.missing_count === 0
  return (
    <OverviewCard title="Today's Activity Log" viewAllTo="/teachers/daily-activities"
      isEmpty={data.total_students === 0} empty="No students assigned to you yet.">
      {data.is_holiday ? (
        <p className="text-sm text-secondary-light mb-0">Today is a holiday — no activities needed.</p>
      ) : (
        <>
          <div className="d-flex align-items-baseline gap-2 mb-8">
            <span className={`fw-bold text-2xl ${done ? 'text-success-600' : 'text-warning-600'}`}>
              {data.logged_count}/{data.total_students}
            </span>
            <span className="text-sm text-secondary-light">students logged today</span>
          </div>
          {done ? (
            <p className="text-sm text-success-600 mb-0">All done for today. 👍</p>
          ) : (
            <>
              <div className="text-xs text-secondary-light mb-4">Still to add:</div>
              <div className="d-flex flex-wrap gap-1">
                {data.missing.map(s => (
                  <span key={s.id} className="badge bg-neutral-200 text-secondary-light text-xs">{s.name}</span>
                ))}
                {data.missing_count > data.missing.length && (
                  <span className="text-xs text-secondary-light">+{data.missing_count - data.missing.length} more</span>
                )}
              </div>
            </>
          )}
        </>
      )}
    </OverviewCard>
  )
}

const REASON_LABEL = (r: TeacherOverview['students_attention'][number]['reasons'][number]) =>
  r.type === 'low_attendance'
    ? `Attendance ${r.value}%`
    : r.type === 'low_score'
      ? `Last score ${r.value}%${r.subject ? ` (${r.subject})` : ''}`
      : `${r.value} homework not done`

export function TeacherAttentionCard({ items }: { items: TeacherOverview['students_attention'] }) {
  return (
    <OverviewCard title="Students Needing Attention" count={items.length} countTone="danger" viewAllTo="/students"
      isEmpty={items.length === 0} empty="All your students are on track.">
      {items.map(s => (
        <div key={s.student_id} className="mb-12">
          <div className="fw-semibold text-sm">{s.name}</div>
          <div className="d-flex flex-wrap gap-1 mt-2">
            {s.reasons.map(r => (
              <span key={r.type} className="badge bg-danger-100 text-danger-600 text-xs">{REASON_LABEL(r)}</span>
            ))}
          </div>
        </div>
      ))}
    </OverviewCard>
  )
}
