import NoticeBoardCard from '@/features/notices/components/NoticeBoardCard'
import WidgetCard from '@/components/common/WidgetCard'
import { useAsync } from '@/hooks/useAsync'
import DashboardAlerts from './DashboardAlerts'
import { fetchOverview } from './overviewApi'
import { StudentAttendanceCard, StudentHomeworkCard, StudentNewContentCard, StudentResultsCard, StudentUpcomingCard } from './StudentWidgets'
import { TeacherAttentionCard, TeacherGradingCard, TeacherPapersCard, TeacherTodayCard, TeacherUpcomingCard } from './TeacherWidgets'

const GRID = 'grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3'

/**
 * Teacher / student "smart" dashboard below the stats cards: prioritised
 * alerts + role widgets, all from ONE request (GET /dashboard/overview).
 */
export default function SmartDashboard({ role }: { role: 'student' | 'teacher' }) {
  const { data, loading, error, reload } = useAsync(fetchOverview, [])

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <WidgetCard title="Your insights" error="Unable to load your dashboard insights." onRetry={reload} maxBodyHeight={false} />
      ) : null}

      {data && <DashboardAlerts alerts={data.alerts ?? []} role={role} />}

      <div className={GRID}>
        {loading && !data && Array.from({ length: 3 }, (_, i) => <WidgetCard key={i} title=" " loading />)}
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
        <NoticeBoardCard compact bare />
      </div>
    </div>
  )
}
