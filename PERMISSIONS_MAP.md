# PERMISSIONS_MAP.md — Coachify Web (coachify_front_end)

> Phase 1 audit snapshot, branch `phase_4`, 2026-09-30. **Nothing has been changed yet.**
> Every row below documents *current* behaviour. The refactor must reproduce each row exactly.
> The `Verified` column gets filled in at the end of Phase 9. Until then it reads `☐`.

## 1. How permissions work today

| Aspect | Current implementation |
|---|---|
| Source of truth | `POST /auth/login` → `{ user, token }`. `user` includes `role` and `permissions: string[]`. Admins get the full catalog from the backend. |
| Refresh | `ProtectedRoute` calls `refreshAuthUser()` → `GET /auth/me` **once per app load**. 401 clears `authToken` + `authUser` and redirects to `/`. Network errors keep the cached user. |
| Storage | `localStorage.authUser` (JSON), `localStorage.authToken`. No React context or Redux. Every consumer reads localStorage **synchronously at render**. |
| Core helpers (`src/lib/auth.ts`) | `getAuthUser()`, `can(key)`, `canAny(keys[])`. `ADMIN_ROLES = ['coaching_admin','super_admin']` always pass `can`/`canAny`. `canAny([])` returns `true`. |
| Route guard (auth) | `src/components/ProtectedRoute.tsx`: checks that a token exists, then redirects to `/`. |
| Route guard (perm) | `src/components/RequirePermission.tsx`: `props anyOf[]`, `orRoles[]`, `redirectTo='/dashboard'`. Passes if `orRoles.includes(user.role) OR canAny(anyOf)`. Fails with `<Navigate replace>`, so there's **no "no access" page**. |
| Role constants | `src/constants/roles.ts`: `COACHING_ADMIN, STUDENT, TEACHER, STAFF`. `super_admin` is **not** in `ROLES`; it's only in `ADMIN_ROLES`. |
| In-page checks | A mix of (a) `can()`/`canAny()`, (b) raw `user.role === 'coaching_admin'` string checks, and (c) **server-driven flags** such as `meta.can_manage` (notices) and `tenant_id === ownTenantId` ownership. |
| Roles in the system | `super_admin`, `coaching_admin`, `staff` (permission-driven), `teacher`, `student`. |

### Known quirks that must be preserved (not fixed) unless you approve a change

| # | Quirk | Where | Effect today |
|---|---|---|---|
| Q1 | Route allows `enquiries.view`/`enquiries.manage`, but the page only renders for `role === 'coaching_admin'`. | `App.tsx` + `EnquiriesPage.tsx:104,149` | A **staff** user with `enquiries.view` sees the menu link but gets "You are not authorized to view this page." A `super_admin` also fails the page check. |
| Q2 | Route requires `generated_content.approve`, but the page requires `role === coaching_admin`. | `GeneratedContentApprovalsPage.tsx:160,267` | Staff with that permission see the menu link, then "not authorized". |
| Q3 | Fee edit is role-based (`coaching_admin`), not `fees.manage`. | `FeeComponent.tsx:84` | Staff with `fees.manage` can't edit fees. |
| Q4 | Students page admin actions (Add, Bulk Promote, status filter, Phone/Status columns, row actions) are role-based. | `StudentsPage.tsx` | Staff with `students.manage` get the read-only "View" view. |
| Q5 | Teachers page edit/delete and `canEditImage` are role-based. | `TeachersPage.tsx:325,527` | Staff with `teachers.manage` can't edit. |
| Q6 | Assessments admin controls (`isAdmin`) are role-based. | `AssessmentsPage.tsx:139` | Staff with `assessments.manage` can't approve or remove files. |
| Q7 | The `ADMIN_ROLES` bypass includes `super_admin`, but many role checks compare only to `'coaching_admin'`. | Many files | `super_admin` passes route guards but sees the non-admin in-page UI. |
| Q8 | Guards read localStorage at render and don't re-render after `/auth/me` refreshes. | `RequirePermission`, `Sidebar` | Permission changes appear only after the next navigation or re-render. |
| Q9 | Some routes have **no permission guard** and rely on the backend: `/teachers/daily-activities`, `/students/activities`, `/students/activities/:id/topic`, `/students/assessments`, `/library/*`, `/search`, `/facts`, `/notices`, `/my-notifications`, `/notifications`, `/my-attendance`, `/profile`, `/dashboard/settings/*`, `/auth/sign-up`. | `App.tsx` | Reachable by URL for any signed-in user (or anyone, for sign-up). The page, the API, or both decide what shows. |
| Q10 | `/notifications` has no route guard. The page itself blocks non-admins with an error string. The sidebar link needs `notifications.manage`. | `NotificationsPage.tsx:126` | Staff with `notifications.manage` see the link, then "Only coaching admins can view notifications." |
| Q11 | `/dashboard/settings/*` and `/auth/sign-up` are static template pages with no API calls. Their sidebar links are commented out. | `pages/settings/*`, `SignUpPage` | Dead UI. **Decision needed:** keep them as they are, or hide them. |

> Q1–Q7 and Q10 are **inconsistencies between the route/menu layer and the in-page layer**. Phase 4 must keep them as they are. I recommend we fix them deliberately in a separate, reviewed change once the backend policy is confirmed. For each one, tell me: preserve, or align to permissions.

## 2. Route guards (`src/App.tsx`)

| Route | Page | Guard | Requirement | On failure | Verified |
|---|---|---|---|---|---|
| `/` | SignInPage | none (redirects to `/dashboard` if a token exists) | — | — | ☐ |
| `/auth/sign-up` | SignUpPage (static) | none | — | — | ☐ |
| all below | — | `ProtectedRoute` | `authToken` present; `/auth/me` not 401 | `Navigate('/')` | ☐ |
| `/dashboard` | DashboardPage | auth only | — | — | ☑ |
| `/dashboard/attendance` | DailyAttendance | RequirePermission | `attendance.mark` | → `/dashboard` | ☐ |
| `/dashboard/settings/company` / `notification` / `notification-alert` / `theme` | static settings pages | auth only | — | — | ☐ |
| `/subjects` | SubjectsPage | RequirePermission | `subjects.manage` | → `/dashboard` | ☐ |
| `/classes` | ClassesPage | RequirePermission | `classes.manage` | → `/dashboard` | ☐ |
| `/fees` | FeeComponent | RequirePermission | `fees.view` \| `fees.manage` | → `/dashboard` | ☐ |
| `/expenses` | ExpensesComponent | RequirePermission | `expenses.view` \| `expenses.manage` | → `/dashboard` | ☐ |
| `/enquiries` | EnquiriesPage | RequirePermission | `enquiries.view` \| `enquiries.manage` (+Q1) | → `/dashboard` | ☐ |
| `/teachers` | TeachersPage | RequirePermission | `teachers.view` \| `teachers.manage` \| role `student` | → `/dashboard` | ☐ |
| `/teachers/daily-activities` | DailyActivitiesPage | auth only | — | — | ☐ |
| `/staff` | StaffPage | RequirePermission | `staff.manage` | → `/dashboard` | ☐ |
| `/students` | StudentsPage | RequirePermission | `students.view` \| `students.manage` \| role `teacher` | → `/dashboard` | ☐ |
| `/students/activities` | StudentActivitiesPage | auth only | — | — | ☐ |
| `/students/activities/:activityId/topic` | StudentTopicContentPage | auth only | — | — | ☐ |
| `/students/assessments` | StudentAssessmentsPage | auth only | — | — | ☐ |
| `/assessments` | AssessmentsPage | RequirePermission | `assessments.view` \| `.manage` \| `.grade` \| role `teacher` | → `/dashboard` | ☐ |
| `/search` | SearchResultsPage | auth only | — | — | ☐ |
| `/approvals` | DailyActivityApprovalsPage | RequirePermission | `daily_activities.approve` \| role `teacher` | → `/dashboard` | ☐ |
| `/approvals/generated-content` | GeneratedContentApprovalsPage | RequirePermission | `generated_content.approve` (+Q2) | → `/dashboard` | ☐ |
| `/profile` | ProfilePage | auth only | — | — | ☐ |
| `/my-attendance` | MyAttendance | auth only | — | — | ☐ |
| `/notices` | NoticesPage | auth only | — | — | ☐ |
| `/my-notifications` | MyNotificationsPage | auth only | — | — | ☐ |
| `/notifications` | NotificationsPage | auth only (+Q10, in-page) | — | — | ☐ |
| `/admin/attendance-corrections` | CorrectionsAdminPage | RequirePermission | `attendance.corrections` | → `/dashboard` | ☐ |
| `/facts` | FactsPage | auth only | — | — | ☐ |
| `/insights` | InsightsPage | RequirePermission | `insights.view` \| role `teacher` \| `student` | → `/dashboard` | ☐ |
| `/academic-years` | AcademicYearsPage | RequirePermission | `academic_years.manage` | → `/dashboard` | ☐ |
| `/admin/facts` | AdminFactsPage | RequirePermission | `facts.manage` | → `/dashboard` | ☐ |
| `/topics`, `/topics/:topicId/questions` | TopicsPage, TopicQuestionsPage | RequirePermission | `content_library.manage` \| role `teacher` | → `/dashboard` | ☐ |
| `/chapters`, `/chapters/:chapterId` | ChaptersPage, ChapterDetailPage | RequirePermission | `content_library.manage` \| role `teacher` | → `/dashboard` | ☐ |
| `/library/chapters[/:id]`, `/library/topics[/:id]` | Library* pages | auth only | — | — | ☐ |
| `*` | NotFoundPage | none | — | — | ☐ |

## 3. Sidebar menu filtering (legacy `src/components/layout/Sidebar.tsx` → now `src/permissions/menu.ts`)

The same rules must apply to any new menu, command palette, quick action, or breadcrumb.

> **Phase 4 status:** The sidebar is now driven by `NAV_GROUPS` in `src/permissions/menu.ts`, where each `visible()` is a literal port of the JSX condition below. Before the old Sidebar was deleted, its output was captured for 84 role/permission combinations into `src/permissions/__fixtures__/legacy-sidebar.json`. `menu.test.ts` asserts that the new menu shows **exactly** the same set of routes for every one of them.
> The one deliberate difference: legacy rendered **Insights** twice (student with `insights.view`) and **Approvals** twice (teacher with `daily_activities.approve`). The new menu merges each pair into one link with the OR of both conditions, so the visible set is unchanged. Items are now grouped (Overview / Learning / Library / Content / People / Administration), so the order differs from legacy.

| Menu item → route | Visible when | Verified |
|---|---|---|
| Dashboard → `/dashboard` | always | ☑ (fixture) |
| Notice Board → `/notices` (+ unread badge) | always | ☑ (fixture) |
| My Notifications → `/my-notifications` (+ unread badge) | always | ☑ (fixture) |
| Facts → `/facts` | always | ☑ (fixture) |
| My Attendance → `/my-attendance` | role `student` \| `teacher` | ☑ (fixture) |
| Manage Facts → `/admin/facts` | `can('facts.manage')` | ☑ (fixture) |
| Chapters → `/chapters` | `can('content_library.manage')` | ☑ (fixture) |
| Topics → `/topics` | `can('content_library.manage')` | ☑ (fixture) |
| Library: Chapters → `/library/chapters`, Topics → `/library/topics` | role `teacher` | ☑ (fixture) |
| Insights → `/insights` | role `teacher` \| `can('insights.view')` | ☑ (fixture) |
| Students → `/students` | role `teacher` \| `students.view` \| `students.manage` | ☑ (fixture) |
| Assessments → `/assessments` | role `teacher` \| `assessments.view` \| `.manage` \| `.grade` | ☑ (fixture) |
| Teachers → `/teachers` | role `student` \| `teachers.view` \| `teachers.manage` | ☑ (fixture) |
| Staff → `/staff` | `can('staff.manage')` | ☑ (fixture) |
| Expenses → `/expenses` | `expenses.view` \| `expenses.manage` | ☑ (fixture) |
| Daily Attendance → `/dashboard/attendance` | `can('attendance.mark')` | ☑ (fixture) |
| (student block) Insights, My Activities → `/students/activities`, My Assessments → `/students/assessments` | role `student` | ☑ (fixture) |
| (teacher block) Daily Activities → `/teachers/daily-activities`, Approvals → `/approvals` | role `teacher` | ☑ (fixture) |
| Approvals → `/approvals` | `can('daily_activities.approve')` | ☑ (fixture) |
| AI Content → `/approvals/generated-content` | `can('generated_content.approve')` | ☑ (fixture) |
| Subjects → `/subjects` | `can('subjects.manage')` | ☑ (fixture) |
| Classes → `/classes` | `can('classes.manage')` | ☑ (fixture) |
| Academic Years → `/academic-years` | `can('academic_years.manage')` | ☑ (fixture) |
| Fees → `/fees` | `fees.view` \| `fees.manage` | ☑ (fixture) |
| Enquiries → `/enquiries` | `enquiries.view` \| `enquiries.manage` | ☑ (fixture) |
| Attendance Corrections → `/admin/attendance-corrections` | `can('attendance.corrections')` | ☑ (fixture) |
| Notifications → `/notifications` | `can('notifications.manage')` | ☑ (fixture) |
| Settings (Company / Notification / Notification Alert / Theme), Sign Up | **commented out**, never shown | ☑ (fixture) |

Note: admins pass every `can()` check, so the admin sidebar is a superset. A teacher who is also granted `insights.view` does **not** get duplicate Insights links, because the teacher block has no Insights. A student sees "Insights" from the student block, and could see it twice if also granted `insights.view`. That is existing behaviour.

## 4. In-page / component-level enforcement

> DashboardPage rows are verified by `src/features/dashboard/pages/DashboardPage.test.tsx`, which renders the page with each widget mocked and asserts exactly which widgets appear for admin, super_admin, staff (none / each key individually), teacher, and student. Deliberate change: widgets no longer vanish while the stats request is loading or has failed. Each widget still has its own gate.

| Page / Component | Element | Requirement | How enforced | Verified |
|---|---|---|---|---|
| **DashboardPage** | Fetch `/dashboard` stats | `canAny(['dashboard.view', 'dashboard.stats.*'])` | skips the API call | ☑ (test) |
| DashboardPage | Admin/staff stat block | role `coaching_admin` \| `staff` | conditional render | ☑ (test) |
| DashboardPage | Students stat card | `dashboard.stats.students` | conditional render | ☑ (test) |
| DashboardPage | Teachers stat card | `dashboard.stats.teachers` | conditional render | ☑ (test) |
| DashboardPage | Activities stat card | `dashboard.stats.activities` | conditional render | ☑ (test) |
| DashboardPage | Earnings stat card | `dashboard.stats.earnings` | conditional render | ☑ (test) |
| DashboardPage | Expenses stat card | `dashboard.stats.expenses` | conditional render | ☑ (test) |
| DashboardPage | PendingActionsCard | `dashboard.pending_actions` | conditional render | ☑ (test) |
| DashboardPage | PendingFeesCard | `fees.view` | conditional render | ☑ (test) |
| DashboardPage | TeacherActivityGapsCard | `dashboard.activity_gaps` | conditional render | ☐ |
| DashboardPage | TodayBirthdayCard, BirthdayCard | `dashboard.birthdays` | conditional render | ☐ |
| DashboardPage | LowAttendanceCard | `attendance.view` | conditional render | ☐ |
| DashboardPage | EnquiriesFollowUpCard | `enquiries.view` | conditional render | ☐ |
| DashboardPage | GhostStudentsCard | `dashboard.ghost_students` | conditional render | ☐ |
| DashboardPage | UnassignedStudentsCard | `dashboard.unassigned_students` | conditional render | ☐ |
| DashboardPage | Top students table + fetch | `dashboard.top_students` | render + skips the API call | ☐ |
| DashboardPage | Teacher stats block | role `teacher` | conditional render | ☐ |
| DashboardPage | Student stats block | role `student` | conditional render | ☐ |
| DashboardPage | SmartDashboard (teacher/student widgets) | role `teacher` \| `student` | conditional render; role passed as prop | ☐ |
| DashboardPage | ActivityLogCard | role `coaching_admin` \| `activity_logs.view` | conditional render | ☐ |
| TeacherActivityGapsCard | "Notify" action | `dashboard.notify_activity_gaps` | conditional render | ☑ (test) |
| PendingActionsCard | "Notify" action | `dashboard.notify_pending_actions` | conditional render | ☑ (test) |
| ActivityLogCard | Self entry in user filter | role `coaching_admin` | list building | ☐ |
| **DailyAttendance** | Mark / Unmark Holiday button | role `coaching_admin` | conditional render | ☐ |
| **StudentsPage** | Data source | teacher → `/teachers/students`; admin → `/students` (+ status param) | endpoint choice | ☐ |
| StudentsPage | "Add New Student" button | role `coaching_admin` | conditional render | ☐ |
| StudentsPage | "Bulk Promote" button | role `coaching_admin` | conditional render | ☐ |
| StudentsPage | Status filter | role `coaching_admin` | conditional render | ☐ |
| StudentsPage | Phone column, Status column | role `coaching_admin` | conditional render (th + td) | ☐ |
| StudentsPage | Row actions dropdown (View, Edit, Assign Teachers, Promote, Reactivate if inactive, Delete) | role `coaching_admin` **and** `student.tenant_id !== 0` | conditional render; others get a "View" link | ☐ |
| StudentsPage | UserProfileModal `canEditImage` | role `coaching_admin` | prop | ☐ |
| **TeachersPage** | Data source | student → own teachers endpoint | endpoint choice | ☐ |
| TeachersPage | Edit / Delete row buttons | role `coaching_admin` | conditional render | ☐ |
| TeachersPage | UserProfileModal `canEditImage` | role `coaching_admin` | prop | ☐ |
| **StaffPage** | Edit / Delete row buttons | `staff.manage` | conditional render | ☐ |
| StaffPage | UserProfileModal `canEditImage` | `staff.manage` | prop | ☐ |
| **FeeComponent** | "Edit" column (2 tables) + FeeEditModal | role `coaching_admin` (Q3) | conditional render | ☐ |
| **EnquiriesPage** | Whole page + list fetch | role `coaching_admin` (Q1) | page returns "not authorized"; fetch skipped | ☐ |
| **AssessmentsPage** | Data source for students | teacher → `/teachers/students` | endpoint choice | ☐ |
| AssessmentsPage | Auto-generate assessments toggle card | role `coaching_admin` | conditional render | ☐ |
| AssessmentsPage | Approve / Mark pending (assessment) | role `coaching_admin` | conditional render | ☐ |
| AssessmentsPage | Question Paper button | role `coaching_admin` \| `teacher` | conditional render | ☐ |
| AssessmentsPage | Approve / Mark pending (file), Remove file | role `coaching_admin` | conditional render (otherwise a status label) | ☐ |
| QuestionPaperModal | Editing controls | `paper.status !== 'released'` (read-only mode) | disabled / hidden | ☐ |
| **DailyActivitiesPage** | Delete attachment (×) | role `coaching_admin` | conditional render | ☐ |
| **DailyActivityApprovalsPage** | `isAdmin` view | role `coaching_admin` \| (role `staff` && `daily_activities.approve`) | derived flag | ☐ |
| DailyActivityApprovalsPage | Page access | `isAdmin` \| role `teacher` | fetch gated on `canAccess` | ☐ |
| DailyActivityApprovalsPage | Students endpoint | admin → `/students`, teacher → `/teachers/students` | endpoint choice | ☐ |
| DailyActivityApprovalsPage | Bulk-approve bar, select-all checkbox, per-row checkbox, Approve/Unapprove buttons | `isAdmin` | conditional render | ☐ |
| **GeneratedContentApprovalsPage** | Whole page + fetches | role `coaching_admin` (Q2) | "not authorized" message; fetch skipped | ☐ |
| **NotificationsPage** | Whole page fetch | role `coaching_admin` \| `super_admin` (Q10) | error message; fetch skipped | ☐ |
| **SearchResultsPage** | Subjects, Classes, Enquiries result sections | role `coaching_admin` | conditional render | ☐ |
| **FactsPage** | "Featured" tab | role `coaching_admin` | `show` flag on tab | ☐ |
| FactsPage | "Manage" link → `/admin/facts` | role `coaching_admin` | conditional render | ☐ |
| **ProfilePage** | Student-only sections (fees, etc.) + student data fetch | profile role `student` | conditional render / fetch | ☐ |
| **UserProfileModal** | Subjects & assessments fetch + section | viewed user `student` && auth role `coaching_admin` \| `teacher` | fetch + render | ☐ |
| UserProfileModal | Fees summary card | viewed `student` && auth `coaching_admin` && not 403 (`feesForbidden`) | render | ☐ |
| UserProfileModal | Fees history | viewed `student` && auth `coaching_admin` | fetch + render | ☐ |
| UserProfileModal | Student-profile admin fields | viewed `student` && auth `coaching_admin` | render | ☐ |
| UserProfileModal | Insights section | viewed `student` && auth `coaching_admin` \| `teacher` | render | ☐ |
| UserProfileModal | Change profile image | `canEditImage` prop | render | ☐ |
| **NoticeBoardCard / NoticeDetailModal** | Create / Edit / Delete notice | server flag `meta.can_manage` | conditional render | ☐ |
| **ChaptersManager / TopicsManager / QuestionsManager / ChapterDetailManager** | Edit / Delete (otherwise a "global/read-only" marker) | ownership: `item.tenant_id === ownTenantId` | conditional render | ☐ |
| **NotificationBell / MyNotificationsPage** | Deep-link target | role `student` → `/students/assessments`, else `/assessments` | link builder `notificationLink()` | ☐ |
| **Topbar** | Search, profile menu, logout | auth only | — | ☐ |

## 5. Role test plan (fill in credentials locally; they are not stored here)

| Role | Should see | Should NOT see |
|---|---|---|
| `coaching_admin` | Every sidebar item except the commented-out ones. All admin buttons, columns, and row actions. Enquiries, AI Content, Notifications pages work. | — |
| `super_admin` | Every sidebar item (the `can()` bypass). | In-page admin UI that is role-checked against `coaching_admin`: Students actions, Enquiries page, AI Content page, Fee edit, and the rest listed under Q7. |
| `staff` (no permissions) | Dashboard, Notice Board, My Notifications, Facts. | Everything else. The dashboard stat block shows but has no cards. |
| `staff` + e.g. `fees.view`, `enquiries.view`, `students.view` | The matching sidebar links and pages. | Fee "Edit" column, Enquiries content (Q1), student admin actions (Q4). |
| `teacher` | My Attendance, Library, Insights, Students (read-only view), Assessments (Question Paper button), Daily Activities, Approvals (teacher view). | Staff, Fees, Expenses, Subjects, Classes, Academic Years, Enquiries, Corrections, AI Content, Chapters/Topics admin (unless granted). |
| `student` | My Attendance, Insights, My Activities, My Assessments, Teachers (own). | Students, Assessments admin, all admin pages. |

For each role, also try deep-linking to a guarded URL (e.g. `/staff`). Expected: silent redirect to `/dashboard`.
