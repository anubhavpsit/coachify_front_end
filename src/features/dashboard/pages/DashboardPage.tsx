import ActivityLogCard from '@/components/ActivityLogCard'
import BirthdayCard from '@/components/BirthdayCard'
import EnquiriesFollowUpCard from '@/components/EnquiriesFollowUpCard'
import GhostStudentsCard from '@/components/GhostStudentsCard'
import LowAttendanceCard from '@/components/LowAttendanceCard'
import PendingActionsCard from '@/components/PendingActionsCard'
import PendingFeesCard from '@/components/PendingFeesCard'
import TeacherActivityGapsCard from '@/components/TeacherActivityGapsCard'
import TodayBirthdayCard from '@/components/TodayBirthdayCard'
import UnassignedStudentsCard from '@/components/UnassignedStudentsCard'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import NoticeBoardCard from '@/components/notices/NoticeBoardCard'
import SmartDashboard from '@/components/overview/SmartDashboard'
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

/**
 * Every gate below is carried over from the legacy page (PERMISSIONS_MAP.md §4).
 * Legacy widgets still render Bootstrap `col-*` roots, so they sit in `.row`
 * wrappers until each is migrated.
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
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader title="Dashboard" description={user?.name ? `Welcome back, ${user.name}` : 'Overview'} className="tw:mb-0" />

      {loading && skeletonCount > 0 && <StatsSkeleton count={skeletonCount} />}
      {error && !loading && <ErrorState title="Couldn't load your stats" description={error} onRetry={() => void reload()} className="tw:py-6" />}

      {stats && !loading && !error && (
        <>
          {isAdminOrStaff && <AdminStats stats={stats} />}
          {isTeacher && <TeacherStats stats={stats} />}
          {isStudent && <StudentStats stats={stats} />}
        </>
      )}

      {isAdminOrStaff && (
        <>
          <div className="row gy-4">
            {can(P.DASHBOARD_PENDING_ACTIONS) && <PendingActionsCard />}
            {can(P.FEES_VIEW) && <PendingFeesCard />}
            {can(P.DASHBOARD_ACTIVITY_GAPS) && <TeacherActivityGapsCard />}
            {can(P.DASHBOARD_BIRTHDAYS) && <TodayBirthdayCard />}
          </div>

          <div className="row g-3">
            <NoticeBoardCard compact />
            {can(P.DASHBOARD_BIRTHDAYS) && <BirthdayCard />}
            {can(P.ATTENDANCE_VIEW) && <LowAttendanceCard />}
            {can(P.ENQUIRIES_VIEW) && <EnquiriesFollowUpCard />}
          </div>

          {(can(P.DASHBOARD_GHOST_STUDENTS) || can(P.DASHBOARD_UNASSIGNED_STUDENTS)) && (
            <div className="row g-3">
              {can(P.DASHBOARD_GHOST_STUDENTS) && <GhostStudentsCard />}
              {can(P.DASHBOARD_UNASSIGNED_STUDENTS) && <UnassignedStudentsCard />}
            </div>
          )}

          {can(P.DASHBOARD_TOP_STUDENTS) && <TopStudentsCard students={topStudents.students} loading={topStudents.loading} />}
        </>
      )}

      {/* Teacher: these two were always shown to teachers (role-only, no permission key). */}
      {isTeacher && (
        <div className="row gy-4">
          <PendingActionsCard />
          <TodayBirthdayCard />
        </div>
      )}

      {/* Teachers/students: smart alerts + widgets (+ Notice Board) below their stats cards. */}
      {(isTeacher || isStudent) && <SmartDashboard role={isTeacher ? 'teacher' : 'student'} />}

      {(role === ROLES.COACHING_ADMIN || can(P.ACTIVITY_LOGS_VIEW)) && <ActivityLogCard />}
    </div>
  )
}
