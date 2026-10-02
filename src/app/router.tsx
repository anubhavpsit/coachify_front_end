import { lazy, Suspense, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ROUTES as R } from '@/constants/routes'
import { PERMISSIONS as P } from '@/permissions/keys'
import ProtectedRoute from '@/permissions/ProtectedRoute'
import RequirePermission from '@/permissions/RequirePermission'
import AppShell from './layout/AppShell'
import PageFallback from './layout/PageFallback'

// Route-level code splitting. Paths and guards are identical to the pre-refactor App.tsx
// (see PERMISSIONS_MAP.md §2); only the per-group <DashboardLayout> copies were merged
// into one shell so the sidebar no longer remounts on every section change.
const SignInPage = lazy(() => import('@/features/auth/pages/SignInPage'))
const SignUpPage = lazy(() => import('@/pages/auth/SignUpPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const DailyAttendance = lazy(() => import('@/features/attendance/pages/DailyAttendancePage'))
const CompanyPage = lazy(() => import('@/pages/settings/CompanyPage'))
const NotificationPage = lazy(() => import('@/pages/settings/NotificationPage'))
const NotificationAlertPage = lazy(() => import('@/pages/settings/NotificationAlertPage'))
const ThemePage = lazy(() => import('@/pages/settings/ThemePage'))
const SubjectsPage = lazy(() => import('@/features/academics/pages/SubjectsPage'))
const ClassesPage = lazy(() => import('@/features/academics/pages/ClassesPage'))
const FeeComponent = lazy(() => import('@/features/finance/pages/FeesPage'))
const ExpensesComponent = lazy(() => import('@/features/finance/pages/ExpensesPage'))
const EnquiriesPage = lazy(() => import('@/features/enquiries/pages/EnquiriesPage'))
const TeachersPage = lazy(() => import('@/features/teachers/pages/TeachersPage'))
const DailyActivitiesPage = lazy(() => import('@/features/daily-activities/pages/DailyActivitiesPage'))
const StaffPage = lazy(() => import('@/features/staff/pages/StaffPage'))
const StudentsPage = lazy(() => import('@/features/students/pages/StudentsPage'))
const StudentActivitiesPage = lazy(() => import('@/features/daily-activities/pages/StudentActivitiesPage'))
const StudentTopicContentPage = lazy(() => import('@/features/daily-activities/pages/StudentTopicContentPage'))
const StudentAssessmentsPage = lazy(() => import('@/features/assessments/pages/StudentAssessmentsPage'))
const AssessmentsPage = lazy(() => import('@/features/assessments/pages/AssessmentsPage'))
const SearchResultsPage = lazy(() => import('@/features/search/pages/SearchResultsPage'))
const DailyActivityApprovalsPage = lazy(() => import('@/features/approvals/pages/DailyActivityApprovalsPage'))
const GeneratedContentApprovalsPage = lazy(() => import('@/pages/approvals/GeneratedContentApprovalsPage'))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'))
const MyAttendance = lazy(() => import('@/features/attendance/pages/MyAttendancePage'))
const NoticesPage = lazy(() => import('@/features/notices/pages/NoticesPage'))
const MyNotificationsPage = lazy(() => import('@/features/notifications/pages/MyNotificationsPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'))
const CorrectionsAdminPage = lazy(() => import('@/features/attendance/pages/CorrectionsAdminPage'))
const FactsPage = lazy(() => import('@/pages/facts/FactsPage'))
const AdminFactsPage = lazy(() => import('@/pages/facts/AdminFactsPage'))
const InsightsPage = lazy(() => import('@/features/insights/pages/InsightsPage'))
const AcademicYearsPage = lazy(() => import('@/features/academics/pages/AcademicYearsPage'))
const TopicsPage = lazy(() => import('@/features/content-library/pages/TopicsPage'))
const TopicQuestionsPage = lazy(() => import('@/features/content-library/pages/TopicQuestionsPage'))
const ChaptersPage = lazy(() => import('@/features/content-library/pages/ChaptersPage'))
const ChapterDetailPage = lazy(() => import('@/features/content-library/pages/ChapterDetailPage'))
const LibraryChaptersPage = lazy(() => import('@/pages/library/LibraryChaptersPage'))
const LibraryChapterDetailPage = lazy(() => import('@/pages/library/LibraryChapterDetailPage'))
const LibraryTopicsPage = lazy(() => import('@/pages/library/LibraryTopicsPage'))
const LibraryTopicDetailPage = lazy(() => import('@/pages/library/LibraryTopicDetailPage'))

function Guard({ anyOf, orRoles, children }: { anyOf: string[]; orRoles?: string[]; children: ReactNode }) {
  return (
    <RequirePermission anyOf={anyOf} orRoles={orRoles}>
      {children}
    </RequirePermission>
  )
}

function StandaloneSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="tw:p-6"><PageFallback /></div>}>{children}</Suspense>
  )
}

const CONTENT_LIBRARY = { anyOf: [P.CONTENT_LIBRARY_MANAGE], orRoles: ['teacher'] }

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={R.SIGN_IN} element={<StandaloneSuspense><SignInPage /></StandaloneSuspense>} />
      <Route path={R.SIGN_UP} element={<StandaloneSuspense><SignUpPage /></StandaloneSuspense>} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path={R.DASHBOARD} element={<DashboardPage />} />
          <Route path={R.DAILY_ATTENDANCE} element={<Guard anyOf={[P.ATTENDANCE_MARK]}><DailyAttendance /></Guard>} />
          <Route path={R.SETTINGS_COMPANY} element={<CompanyPage />} />
          <Route path={R.SETTINGS_NOTIFICATION} element={<NotificationPage />} />
          <Route path={R.SETTINGS_NOTIFICATION_ALERT} element={<NotificationAlertPage />} />
          <Route path={R.SETTINGS_THEME} element={<ThemePage />} />

          <Route path={R.SUBJECTS} element={<Guard anyOf={[P.SUBJECTS_MANAGE]}><SubjectsPage /></Guard>} />
          <Route path={R.CLASSES} element={<Guard anyOf={[P.CLASSES_MANAGE]}><ClassesPage /></Guard>} />
          <Route path={R.FEES} element={<Guard anyOf={[P.FEES_VIEW, P.FEES_MANAGE]}><FeeComponent /></Guard>} />
          <Route path={R.EXPENSES} element={<Guard anyOf={[P.EXPENSES_VIEW, P.EXPENSES_MANAGE]}><ExpensesComponent /></Guard>} />
          <Route path={R.ENQUIRIES} element={<Guard anyOf={[P.ENQUIRIES_VIEW, P.ENQUIRIES_MANAGE]}><EnquiriesPage /></Guard>} />

          <Route path={R.TEACHERS} element={<Guard anyOf={[P.TEACHERS_VIEW, P.TEACHERS_MANAGE]} orRoles={['student']}><TeachersPage /></Guard>} />
          <Route path={R.TEACHER_DAILY_ACTIVITIES} element={<DailyActivitiesPage />} />
          <Route path={R.STAFF} element={<Guard anyOf={[P.STAFF_MANAGE]}><StaffPage /></Guard>} />

          <Route path={R.STUDENTS} element={<Guard anyOf={[P.STUDENTS_VIEW, P.STUDENTS_MANAGE]} orRoles={['teacher']}><StudentsPage /></Guard>} />
          <Route path={R.STUDENT_ACTIVITIES} element={<StudentActivitiesPage />} />
          <Route path={R.STUDENT_ACTIVITY_TOPIC} element={<StudentTopicContentPage />} />
          <Route path={R.STUDENT_ASSESSMENTS} element={<StudentAssessmentsPage />} />

          <Route
            path={R.ASSESSMENTS}
            element={<Guard anyOf={[P.ASSESSMENTS_VIEW, P.ASSESSMENTS_MANAGE, P.ASSESSMENTS_GRADE]} orRoles={['teacher']}><AssessmentsPage /></Guard>}
          />
          <Route path={R.SEARCH} element={<SearchResultsPage />} />
          <Route path={R.APPROVALS} element={<Guard anyOf={[P.DAILY_ACTIVITIES_APPROVE]} orRoles={['teacher']}><DailyActivityApprovalsPage /></Guard>} />
          <Route path={R.APPROVALS_GENERATED_CONTENT} element={<Guard anyOf={[P.GENERATED_CONTENT_APPROVE]}><GeneratedContentApprovalsPage /></Guard>} />
          <Route path={R.PROFILE} element={<ProfilePage />} />
          <Route path={R.MY_ATTENDANCE} element={<MyAttendance />} />
          {/* Every role: full-page Notice Board */}
          <Route path={R.NOTICES} element={<NoticesPage />} />
          {/* Every role: the signed-in user's own notification history */}
          <Route path={R.MY_NOTIFICATIONS} element={<MyNotificationsPage />} />
          <Route path={R.NOTIFICATIONS} element={<NotificationsPage />} />
          <Route path={R.ATTENDANCE_CORRECTIONS} element={<Guard anyOf={[P.ATTENDANCE_CORRECTIONS]}><CorrectionsAdminPage /></Guard>} />
          <Route path={R.FACTS} element={<FactsPage />} />
          <Route path={R.INSIGHTS} element={<Guard anyOf={[P.INSIGHTS_VIEW]} orRoles={['teacher', 'student']}><InsightsPage /></Guard>} />
          <Route path={R.ACADEMIC_YEARS} element={<Guard anyOf={[P.ACADEMIC_YEARS_MANAGE]}><AcademicYearsPage /></Guard>} />
          <Route path={R.ADMIN_FACTS} element={<Guard anyOf={[P.FACTS_MANAGE]}><AdminFactsPage /></Guard>} />

          <Route path={R.TOPICS} element={<Guard {...CONTENT_LIBRARY}><TopicsPage /></Guard>} />
          <Route path={R.TOPIC_QUESTIONS} element={<Guard {...CONTENT_LIBRARY}><TopicQuestionsPage /></Guard>} />
          <Route path={R.CHAPTERS} element={<Guard {...CONTENT_LIBRARY}><ChaptersPage /></Guard>} />
          <Route path={R.CHAPTER_DETAIL} element={<Guard {...CONTENT_LIBRARY}><ChapterDetailPage /></Guard>} />

          <Route path={R.LIBRARY_CHAPTERS} element={<LibraryChaptersPage />} />
          <Route path={R.LIBRARY_CHAPTER_DETAIL} element={<LibraryChapterDetailPage />} />
          <Route path={R.LIBRARY_TOPICS} element={<LibraryTopicsPage />} />
          <Route path={R.LIBRARY_TOPIC_DETAIL} element={<LibraryTopicDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<StandaloneSuspense><NotFoundPage /></StandaloneSuspense>} />
    </Routes>
  )
}
