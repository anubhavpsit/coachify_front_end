import { Link } from 'react-router-dom'
import { formatDate } from '../../utils/date'
import OverviewCard from './OverviewCard'
import { whenLabel, type StudentOverview } from './overviewApi'

const LOW_SCORE = 40

function dueBadge(days: number | null) {
  const urgent = days !== null && days <= 1
  return (
    <span className={`badge text-xs ${urgent ? 'bg-danger-100 text-danger-600' : 'bg-primary-100 text-primary-600'}`}>
      {whenLabel(days)}
    </span>
  )
}

export function StudentUpcomingCard({ items }: { items: StudentOverview['upcoming_assessments'] }) {
  return (
    <OverviewCard title="Upcoming Assessments" count={items.length} viewAllTo="/students/assessments"
      isEmpty={items.length === 0} empty="No assessments in the next 14 days.">
      {items.map(a => (
        <Link
          key={a.assignment_id}
          to={`/students/assessments?assessment=${a.assessment_id}`}
          className="d-flex justify-content-between align-items-start gap-2 mb-12 text-decoration-none"
          title="Open assessment"
        >
          <div>
            <div className="fw-semibold text-sm text-primary-light">{a.title}</div>
            <div className="text-xs text-secondary-light">
              {a.subject} · {formatDate(a.scheduled_date)}
              {a.last_subject_score !== null && (
                <span className={a.last_subject_score < LOW_SCORE ? 'text-danger-600' : ''}>
                  {' '}· last {a.subject} score {a.last_subject_score}%
                </span>
              )}
            </div>
          </div>
          {dueBadge(a.days_until)}
        </Link>
      ))}
    </OverviewCard>
  )
}

export function StudentHomeworkCard({ data }: { data: StudentOverview['homework_pending'] }) {
  return (
    <OverviewCard title="Homework Pending" count={data.count} countTone="danger" viewAllTo="/students/activities"
      isEmpty={data.count === 0} empty="No pending homework. 🎉">
      {data.items.map(h => (
        <div key={h.activity_id} className="mb-12">
          <div className="d-flex justify-content-between gap-2">
            <span className="fw-semibold text-sm">{h.subject ?? 'Homework'}{h.topic ? ` · ${h.topic}` : ''}</span>
            <span className={`badge text-xs ${h.status === 'partial' ? 'bg-warning-100 text-warning-600' : 'bg-danger-100 text-danger-600'}`}>
              {h.status === 'partial' ? 'Partial' : 'Not done'}
            </span>
          </div>
          <div className="text-xs text-secondary-light">{formatDate(h.activity_date)} · {h.homework}</div>
        </div>
      ))}
      {data.count > data.items.length && (
        <div className="text-xs text-secondary-light">+{data.count - data.items.length} more</div>
      )}
    </OverviewCard>
  )
}

export function StudentResultsCard({ items }: { items: StudentOverview['recent_results'] }) {
  const arrow = (t: string | null) => (t === 'up' ? '▲' : t === 'down' ? '▼' : t === 'same' ? '■' : '')
  const arrowTone = (t: string | null) => (t === 'up' ? 'text-success-600' : t === 'down' ? 'text-danger-600' : 'text-secondary-light')
  return (
    <OverviewCard title="My Recent Results" viewAllTo="/students/assessments"
      isEmpty={items.length === 0} empty="No results yet.">
      {items.map(r => (
        <div key={r.assessment_id} className="d-flex justify-content-between align-items-center gap-2 mb-12">
          <div>
            <div className="fw-semibold text-sm">{r.title}</div>
            <div className="text-xs text-secondary-light">
              {r.subject} · {formatDate(r.graded_at)}
              {r.previous_percentage !== null && ` · previous ${r.previous_percentage}%`}
            </div>
          </div>
          <div className="text-end flex-shrink-0">
            <span className={`fw-bold ${r.percentage !== null && r.percentage < LOW_SCORE ? 'text-danger-600' : 'text-primary-light'}`}>
              {r.percentage !== null ? `${r.percentage}%` : '—'}
            </span>{' '}
            <span className={`text-xs ${arrowTone(r.trend)}`} title={r.trend ?? ''}>{arrow(r.trend)}</span>
          </div>
        </div>
      ))}
    </OverviewCard>
  )
}

export function StudentAttendanceCard({ data }: { data: StudentOverview['attendance'] }) {
  const pct = data.percentage
  const tone = pct === null ? 'bg-neutral-300' : data.low ? 'bg-danger-600' : 'bg-success-600'
  return (
    <OverviewCard title="Attendance This Month" viewAllTo="/my-attendance"
      isEmpty={pct === null} empty="No attendance marked this month yet.">
      <div className="d-flex align-items-baseline gap-2 mb-8">
        <span className={`fw-bold text-2xl ${data.low ? 'text-danger-600' : 'text-success-600'}`}>{pct}%</span>
        <span className="text-sm text-secondary-light">present</span>
      </div>
      <div className="progress mb-12" style={{ height: 8 }} role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
        <div className={`progress-bar ${tone}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
      <div className="d-flex gap-3 text-sm">
        <span>Present: <strong>{data.present}</strong></span>
        <span>Absent: <strong>{data.absent}</strong></span>
        {data.leave > 0 && <span>Leave: <strong>{data.leave}</strong></span>}
      </div>
      {data.low && <p className="text-xs text-danger-600 mt-8 mb-0">Below 75% — try not to miss more classes.</p>}
    </OverviewCard>
  )
}

export function StudentNewContentCard({ items }: { items: StudentOverview['new_content'] }) {
  return (
    <OverviewCard title="New Study Material" count={items.length} viewAllTo="/students/activities"
      isEmpty={items.length === 0} empty="Nothing new this week.">
      {items.map(c => (
        <Link key={c.activity_id} to={`/students/activities/${c.activity_id}/topic`} className="d-block mb-12">
          <div className="fw-semibold text-sm text-primary-light">{c.subject ?? 'Class'}{c.topic ? ` · ${c.topic}` : ''}</div>
          <div className="text-xs text-secondary-light">
            Class on {formatDate(c.activity_date)}
            {c.solutions_available && <span className="text-success-600"> · solutions available</span>}
          </div>
        </Link>
      ))}
    </OverviewCard>
  )
}
