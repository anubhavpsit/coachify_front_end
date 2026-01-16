import { BrowserRouter, Route, Routes } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout.tsx'
import DashboardPage from './pages/dashboard/DashboardPage.tsx'
import DailyAttendance from './pages/dashboard/DailyAttendance.tsx'
import SubjectsPage from './pages/subjects/SubjectsPage.tsx'
import ClassesPage from './pages/classes/ClassesPage.tsx'
import TeachersPage from './pages/teachers/TeachersPage.tsx'
import DailyActivitiesPage from './pages/teachers/DailyActivitiesPage.tsx'
import StudentsPage from './pages/students/StudentsPage.tsx'
import StudentActivitiesPage from './pages/students/StudentActivitiesPage.tsx'
import StudentAssessmentsPage from './pages/students/StudentAssessmentsPage.tsx'
import FeeComponent from './pages/fees/FeeComponent.tsx'
import ExpensesComponent from './pages/expenses/ExpensesComponent.tsx'
import EnquiriesPage from './pages/enquiries/EnquiriesPage.tsx'
import CompanyPage from './pages/settings/CompanyPage.tsx'
import NotificationPage from './pages/settings/NotificationPage.tsx'
import NotificationAlertPage from './pages/settings/NotificationAlertPage.tsx'
import ThemePage from './pages/settings/ThemePage.tsx'
import SignInPage from './pages/auth/SignInPage.tsx'
import SignUpPage from './pages/auth/SignUpPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import AssessmentsPage from './pages/assessments/AssessmentsPage.tsx'
import ProfilePage from './pages/profile/ProfilePage.tsx'
import SearchResultsPage from './pages/search/SearchResultsPage.tsx'
import NotificationsPage from './pages/notifications/NotificationsPage.tsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignInPage />} />
        <Route path="/auth/sign-up" element={<SignUpPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="attendance" element={<DailyAttendance />} />
          <Route path="settings/company" element={<CompanyPage />} />
          <Route path="settings/notification" element={<NotificationPage />} />
          <Route
            path="settings/notification-alert"
            element={<NotificationAlertPage />}
          />
          <Route path="settings/theme" element={<ThemePage />} />
        </Route>
        <Route path="/subjects" element={<DashboardLayout />}>
          <Route index element={<SubjectsPage />} />
        </Route>
        <Route path="/classes" element={<DashboardLayout />}>
          <Route index element={<ClassesPage />} />
        </Route>
        <Route path="/fees" element={<DashboardLayout />}>
          <Route index element={<FeeComponent />} />
        </Route>
        <Route path="/expenses" element={<DashboardLayout />}>
          <Route index element={<ExpensesComponent />} />
        </Route>
        <Route path="/enquiries" element={<DashboardLayout />}>
          <Route index element={<EnquiriesPage />} />
        </Route>
        <Route path="/teachers" element={<DashboardLayout />}>
          <Route index element={<TeachersPage />} />
          <Route path="daily-activities" element={<DailyActivitiesPage />} />
        </Route>
        <Route path="/students" element={<DashboardLayout />}>
          <Route index element={<StudentsPage />} />
          <Route path="activities" element={<StudentActivitiesPage />} />
          <Route path="assessments" element={<StudentAssessmentsPage />} />
        </Route>
        <Route path="/assessments" element={<DashboardLayout />}>
          <Route index element={<AssessmentsPage />} />
        </Route>
        <Route path="/search" element={<DashboardLayout />}>
          <Route index element={<SearchResultsPage />} />
        </Route>
        <Route path="/profile" element={<DashboardLayout />}>
          <Route index element={<ProfilePage />} />
        </Route>
        <Route path="/notifications" element={<DashboardLayout />}>
          <Route index element={<NotificationsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
