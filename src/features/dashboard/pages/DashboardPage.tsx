import ActivityLogCard from '../widgets/activity-log/ActivityLogCard'
import BirthdayCard from '../widgets/BirthdayCard'
import EnquiriesFollowUpCard from '../widgets/EnquiriesFollowUpCard'
import GhostStudentsCard from '../widgets/GhostStudentsCard'
import LowAttendanceCard from '../widgets/LowAttendanceCard'
import PendingActionsCard from '../widgets/PendingActionsCard'
import PendingFeesCard from '../widgets/PendingFeesCard'
import TeacherActivityGapsCard from '../widgets/TeacherActivityGapsCard'
import TodayBirthdayCard from '../widgets/TodayBirthdayCard'
import UnassignedStudentsCard from '../widgets/UnassignedStudentsCard'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import NoticeBoardCard from '@/features/notices/components/NoticeBoardCard'
import SmartDashboard from '../overview/SmartDashboard'
import { ROLES } from '@/constants/roles'
import { PERMISSIONS as P, usePermission } from '@/permissions'
import { AdminStats, StatsSkeleton, StudentStats, TeacherStats } from '../components/StatSections'
import TopStudentsCard from '../components/TopStudentsCard'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useTopStudents } from '../hooks/useTopStudents'

// One key per admin summary card (staff); coaching_admin holds all of them.
const DASHBOARD_STAT_KEYS = [
  P.DASHBOARD_STATS_STUDENTS,
  P.DASHBOARD_STATS_TEACHERS,
  P.DASHBOARD_STATS_ACTIVITIES,
  P.DASHBOARD_STATS_EARNINGS,
  P.DASHBOARD_STATS_EXPENSES,
]

const WIDGET_GRID = 'grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3'

/**
 * Every gate below is carried over from the legacy page (PERMISSIONS_MAP.md §4).
 * Un-migrated legacy widgets render a Bootstrap `col-12` root, which fills the
 * flex column like a full-width block.
 *
 * Deliberate change: widgets no longer disappear while the stats request is
 * loading or has failed — each widget keeps its own gate and its own request.
 */
export default function DashboardPage() {
  const { user, can, canAny } = usePermission()
  // teacher/student use dashboard.view; staff need at least one card key.
  const { stats, loading, error, reload } = useDashboardStats(canAny([P.DASHBOARD_VIEW, ...DASHBOARD_STAT_KEYS]))
  const topStudents = useTopStudents(can(P.DASHBOARD_TOP_STUDENTS))

  const role = user?.role ?? stats?.role
  const isAdminOrStaff = role === ROLES.COACHING_ADMIN || role === ROLES.STAFF
  const isTeacher = role === ROLES.TEACHER
  const isStudent = role === ROLES.STUDENT

  const skeletonCount = isTeacher ? 3 : isStudent ? 4 : isAdminOrStaff ? DASHBOARD_STAT_KEYS.filter((k) => can(k)).length : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description={user?.name ? `Welcome back, ${user.name}` : 'Overview'} className="mb-0" />

      {loading && skeletonCount > 0 && <StatsSkeleton count={skeletonCount} />}
      {error && !loading && <ErrorState title="Couldn't load your stats" description={error} onRetry={() => void reload()} className="py-6" />}

      {stats && !loading && !error && (
        <>
          {isAdminOrStaff && <AdminStats stats={stats} />}
          {isTeacher && <TeacherStats stats={stats} />}
          {isStudent && <StudentStats stats={stats} />}
        </>
      )}

      {isAdminOrStaff && (
        <>
          {/* Legacy full-width cards (Bootstrap col-12 roots) */}
          {can(P.DASHBOARD_PENDING_ACTIONS) && <PendingActionsCard />}
          {can(P.FEES_VIEW) && <PendingFeesCard />}
          {can(P.DASHBOARD_ACTIVITY_GAPS) && <TeacherActivityGapsCard />}

          <div className={WIDGET_GRID}>
            {can(P.DASHBOARD_BIRTHDAYS) && <TodayBirthdayCard />}
            <NoticeBoardCard compact bare />
            {can(P.DASHBOARD_BIRTHDAYS) && <BirthdayCard />}
            {can(P.ATTENDANCE_VIEW) && <LowAttendanceCard />}
            {can(P.ENQUIRIES_VIEW) && <EnquiriesFollowUpCard />}
          </div>

          {can(P.DASHBOARD_GHOST_STUDENTS) && <GhostStudentsCard />}
          {can(P.DASHBOARD_UNASSIGNED_STUDENTS) && <UnassignedStudentsCard />}

          {can(P.DASHBOARD_TOP_STUDENTS) && <TopStudentsCard students={topStudents.students} loading={topStudents.loading} />}
        </>
      )}

      {/* Teacher: these two were always shown to teachers (role-only, no permission key). */}
      {isTeacher && (
        <>
          <PendingActionsCard />
          <div className={WIDGET_GRID}>
            <TodayBirthdayCard />
          </div>
        </>
      )}

      {/* Teachers/students: smart alerts + widgets (+ Notice Board) below their stats cards. */}
      {(isTeacher || isStudent) && <SmartDashboard role={isTeacher ? 'teacher' : 'student'} />}

      {(role === ROLES.COACHING_ADMIN || can(P.ACTIVITY_LOGS_VIEW)) && <ActivityLogCard />}
    </div>
  )
}
