import { useEffect, useState } from 'react'
import NoticeBoardCard from '../notices/NoticeBoardCard'
import DashboardAlerts from './DashboardAlerts'
import { fetchOverview, type Overview } from './overviewApi'
import {
  StudentAttendanceCard,
  StudentHomeworkCard,
  StudentNewContentCard,
  StudentResultsCard,
  StudentUpcomingCard,
} from './StudentWidgets'
import {
  TeacherAttentionCard,
  TeacherGradingCard,
  TeacherPapersCard,
  TeacherTodayCard,
  TeacherUpcomingCard,
} from './TeacherWidgets'

/**
 * Teacher / student "smart" dashboard below the stats cards: prioritised
 * alerts + role widgets, all from ONE request (GET /dashboard/overview).
 */
export default function SmartDashboard({ role }: { role: 'student' | 'teacher' }) {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchOverview()
      .then(d => !cancelled && setData(d))
      .catch(() => !cancelled && setError('Unable to load your dashboard insights.'))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {error && <p className="text-danger-600 text-sm mb-16">{error}</p>}
      {!data && !error && <p className="text-sm text-secondary-light mb-16">Loading your insights…</p>}

      {data && <DashboardAlerts alerts={data.alerts} role={role} />}

      <div className="row g-3 mb-24">
        {data?.student && (
          <>
            <StudentUpcomingCard items={data.student.upcoming_assessments} />
            <StudentHomeworkCard data={data.student.homework_pending} />
            <StudentResultsCard items={data.student.recent_results} />
            <StudentAttendanceCard data={data.student.attendance} />
            <StudentNewContentCard items={data.student.new_content} />
          </>
        )}
        {data?.teacher && (
          <>
            <TeacherTodayCard data={data.teacher.today_activity} />
            <TeacherUpcomingCard items={data.teacher.upcoming_assessments} />
            <TeacherPapersCard items={data.teacher.papers_to_approve} />
            <TeacherGradingCard items={data.teacher.results_to_enter} />
            <TeacherAttentionCard items={data.teacher.students_attention} />
          </>
        )}
        {/* Notice Board sits with the widgets (independent of the overview request) */}
        <NoticeBoardCard compact />
      </div>
    </>
  )
}
