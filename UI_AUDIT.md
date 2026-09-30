# UI_AUDIT.md — Coachify Web (coachify_front_end)

> Phase 1 of the UI modernisation. Audit only; **no source files were changed**.
> Branch `phase_4`, audited 2026-09-30. Companion file: [`PERMISSIONS_MAP.md`](./PERMISSIONS_MAP.md).
> Layer tags: **[Web]** = this repo, **[Backend]** = coachify_back_end, **[Mobile]** = coachify_react_native.

---

## 0. Executive summary

- **Stack:** Vite 7, React 19, TS 5.9, React Router 6, axios. No global state or data-fetching layer. The styling comes from the **WowDash admin template**: Bootstrap 5 plus a 312 KB `style.css`, loaded as static CSS from `public/`. `react-bootstrap` is used for Modal and Button. Tailwind 4 is installed but **not wired up**.
- **Dynamic UI settings are thinner than the brief assumes.** The backend exposes only `tenant.theme_color` (hex), `name`, and three logo URLs. There is **no font family, font size, secondary color, or background color setting** anywhere in the backend. The web app applies `theme_color` to one CSS variable (`--primary-600`), so the other nine primary shades stay template blue. See §2.
- **Permissions:** there is one clean core (`can` / `canAny` / `RequirePermission`), but in-page checks mix it with raw role-string comparisons. There are 10 route-vs-page inconsistencies (Q1–Q11 in PERMISSIONS_MAP), which will be preserved as they are.
- **Code health:** 109 files, 25.5k LOC. 11 files are over 600 lines; the biggest is 1,306. 58 duplicate `API_BASE_URL` definitions, ~250 inline axios calls, 91 `alert()` calls, no code-splitting (one **1.30 MB / 361 KB gz** JS chunk), 85 existing lint problems (62 errors). `tsc` passes.
- **Two security issues found during the audit** (outside the UI brief; flagged for you, not fixed): see §9.
- **There is no quiz-taking feature on web.** Students *view* question papers and results that teachers enter. Most of the brief's "quiz" animations (option select, correct/wrong, timer ring, flashcards) therefore have no host feature. Per the "don't invent features" rule, I propose only the education moments that map to real screens (§7).

---

## 1. Project overview

### 1.1 Build and runtime

| Item | Value |
|---|---|
| Build | Vite 7.2 (`vite.config.ts`: react plugin, dev `allowedHosts` for `*.coachify.local`) |
| React | 19.2 (StrictMode) |
| Language | TypeScript 5.9 (`tsc -b` passes) |
| Router | react-router-dom 6.30, `<BrowserRouter>` + nested `<Routes>`, all routes imported eagerly |
| State | Local `useState` only. Auth and tenant live in `localStorage` (`authUser`, `authToken`, `tenant`, `tenant_id`, `templateColor`, `coachify-theme`) |
| API client | Raw `axios` / `fetch` per component. `API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'` is re-declared in **58 places**. There's no interceptor: the Bearer header is hand-built in every call, and nothing handles 401 globally except `ProtectedRoute` on load |
| Multi-tenant | Subdomain → `GET /tenants/{subdomain}` on sign-in. The tenant is cached in `localStorage.tenant`. `tenant_id` is sent on login |
| Lint | ESLint 9 flat config: 62 errors / 23 warnings (39 `no-explicit-any`, 20 `exhaustive-deps`, 11 unused vars, 9 empty blocks, …) |
| Build output (baseline) | `index.js` 1,300.75 kB (360.96 kB gz), `index.css` 14.41 kB, plus render-blocking static CSS in `index.html` (below) |

### 1.2 Styling, UI, form, animation, and icon libraries in use

| Concern | Current |
|---|---|
| CSS framework | **WowDash template** `public/assets/css/style.css` (312 KB; Bootstrap-style utility classes like `mb-24`, `radius-12`, `text-primary-light`, `bg-primary-50`) + `public/assets/css/lib/bootstrap.min.css` (228 KB). Both are loaded from `index.html`, not bundled |
| Unused CSS in `index.html` | apexcharts, dataTables, katex, atom-one-dark, quill, flatpickr, full-calendar, jvectormap, magnific-popup, prism, file-upload, audioplayer (**~170 KB render-blocking, none of it used by React code**) |
| Component lib | `react-bootstrap` in 28 files: Button (26), Modal (20), Spinner (3), Table/Form/Dropdown (1 each). Everything else is raw Bootstrap class markup |
| Tailwind | `tailwindcss@4` + `postcss` + `autoprefixer` in devDeps, **no config and no import**, so it's inactive |
| Forms | Uncontrolled/controlled inputs with hand-rolled `if (!x.trim()) return` checks. No form library |
| Rich text | TipTap 3 (`RichTextEditor.tsx`), DOMPurify for rendering |
| Carousel | `react-slick` + `slick-carousel` (TodayBirthdayCard only) |
| Icons | `<iconify-icon>` web component (runtime script `public/assets/js/lib/iconify-icon.min.js`). **Each of the ~61 distinct icons is fetched from the Iconify API at runtime.** Remixicon font (`ri-*`) is also used in 26 places |
| Animations | None, beyond template CSS transitions |
| Charts | None. InsightsPage has per-subject `series[]` data but only renders text/bars |
| Toasts | None: 91 `alert()` + 2 `window.confirm()` |
| Dark mode | **Exists.** `hooks/useTheme.ts` toggles `html[data-theme]`, persisted as `coachify-theme`, with a toggle in the Topbar. The template ships dark styles. This has to be preserved; see §10 D5 |

### 1.3 Routes and components by feature

| Feature | Routes → page (LOC) | Main components |
|---|---|---|
| Auth | `/` SignInPage (307), `/auth/sign-up` SignUpPage (153, **static, no API**) | — |
| Shell | — | DashboardLayout (98), Sidebar (507), Topbar (225), Footer, NotificationBell (205), SidebarBadge |
| Dashboard | `/dashboard` DashboardPage (581) | Stat cards (inline), PendingActionsCard (351), PendingFeesCard (283), TeacherActivityGapsCard, TodayBirthdayCard, BirthdayCard, LowAttendanceCard, EnquiriesFollowUpCard, GhostStudentsCard, UnassignedStudentsCard, ActivityLogCard (395), overview/SmartDashboard + Teacher/StudentWidgets + DashboardAlerts |
| Attendance | `/dashboard/attendance` DailyAttendance (290), `/my-attendance` MyAttendance (405), `/admin/attendance-corrections` CorrectionsAdminPage (141) | — |
| People | `/students` StudentsPage (**1201**), `/teachers` TeachersPage (531), `/staff` StaffPage (686) | UserProfileModal (**828**), AssignTeachersModal, Avatar |
| Academics setup | `/subjects` (288), `/classes` (172), `/academic-years` (192) | — |
| Content library | `/chapters[/:id]`, `/topics[/:id/questions]` (thin wrappers), `/library/chapters[/:id]`, `/library/topics[/:id]` | topics/ChaptersManager (326), TopicsManager (478), QuestionsManager (540), ChapterDetailManager (285), Topic/ChapterAutocomplete, RichTextEditor; library/* managers, StudentTopicContentView |
| Activities | `/teachers/daily-activities` DailyActivitiesPage (**1306**), `/students/activities` (202), `/students/activities/:id/topic` | AttachmentPreviewModal (218) |
| Approvals | `/approvals` DailyActivityApprovalsPage (749), `/approvals/generated-content` (428) | — |
| Assessments | `/assessments` AssessmentsPage (**1295**), `/students/assessments` (321) | QuestionPaperModal (507), StudentQuestionPaperModal |
| Finance | `/fees` FeeComponent (607) + FeeEditModal, `/expenses` ExpensesComponent (372) | PendingFeesCard |
| CRM | `/enquiries` EnquiriesPage (854) | EnquiriesFollowUpCard |
| Communication | `/notices`, `/my-notifications` (234), `/notifications` (589) | notices/NoticeBoardCard (358), NoticeFormModal (323), NoticeDetailModal, NoticeBadges; lib/myNotifications, lib/noticeUnread |
| Facts | `/facts` FactsPage (849), `/admin/facts` AdminFactsPage (290) | — |
| Insights | `/insights` InsightsPage (197) | — |
| Search / Profile | `/search` (313), `/profile` (599) | — |
| Settings | `/dashboard/settings/{company,notification,notification-alert,theme}` | **Static template pages**: no API, hidden from the sidebar. `ThemePage` is a non-functional mock. `ThemeCustomizer` is unused (commented out) |
| Misc | `*` NotFoundPage | `App.css` is leftover Vite boilerplate and is not imported (dead file) |

---

## 2. Dynamic UI settings

### 2.1 What actually exists

| Key | Source | Validation (backend) | Default |
|---|---|---|---|
| `theme_color` | `tenants.theme_color` | `nullable`, `regex:/^#([A-Fa-f0-9]{6}\|[A-Fa-f0-9]{3})$/` (**3-digit hex allowed**) | `#2563eb` (DB default) |
| `name` | `tenants.name` | string ≤255 | web fallback `'Classly'` |
| `logo_light_url` / `logo_dark_url` / `logo_icon_url` | appended accessors on `Tenant` (public disk URLs) | jpg/png/webp/svg ≤5 MB | `/assets/branding/classly-logo-*.svg` |
| `auto_assessment_enabled` | tenant flag (feature, not UI) | boolean | false |

Settings are only editable by the **super-admin panel** (Blade, `SuperAdmin/CoachingController`). There is **no tenant-admin UI settings screen and no font, size, secondary, or background setting**.

### 2.2 How they're fetched and applied today

1. `SignInPage` → `GET /tenants/{subdomain}`. This runs **only if `localStorage.tenant_id` is absent**, so settings changed later are never picked up until the user logs out, which clears `tenant`/`tenant_id`.
2. The tenant JSON goes to `localStorage.tenant`, and `theme_color` also goes to `localStorage.templateColor`.
3. `document.documentElement.style.setProperty('--primary-600', color)` runs in SignInPage (×2) and in `Topbar` on mount. So there's a flash of template blue before the Topbar effect runs.
4. Branding helpers in `utils/branding.ts` read `localStorage.tenant` for logos and name.

### 2.3 Where the setting is ignored

- The template defines `--primary-50` through `--primary-900`, and only 600 is overridden. Hover (`bg-hover-primary-700`), light backgrounds (`bg-primary-50/100`), borders, and focus rings **stay template blue (#487FFF family)**. This is the most visible theming bug.
- Bootstrap's own `--bs-primary` and `.btn-primary` colours aren't mapped, so buttons partly follow the template and partly Bootstrap.
- Hardcoded colours in TSX: ~70 hex literals (e.g. `#374151`, `#9CA3AF`, `#2563EB`, `#4f46e5`, `#dc2626`) and **~180 inline `style={{}}` blocks**, concentrated in FactsPage (48), StudentActivitiesPage (31), and UserProfileModal (21). `.sidebar-badge` in `index.css` hardcodes `#dc2626`.
- Font: the template `@import`s **Inter from Google Fonts** (render-blocking, Latin only). There's no Devanagari fallback, so Hindi content falls back to whatever the OS provides.
- Text on primary is hardcoded white. A light `theme_color` (e.g. `#facc15`) makes button text unreadable, because there's no contrast check.
- The mobile app ([Mobile]) and FCM push colour ([Backend] `FcmService`) also consume `theme_color`, so any new settings should come from the same tenant payload.

### 2.4 Recommendation for Phase 5 (needs your decision, §10 D1)

- **[Web]** Build the ThemeProvider around the **existing** tenant source (same endpoint, same localStorage keys). Generate the full 50–900 scale plus foreground from `theme_color`. Normalise 3-digit hex. Apply it from an inline `<head>` script before first paint, reading `localStorage.tenant`.
- **[Backend]** *(optional, recommended)* If you want admin-controlled fonts and colours as the brief describes, add `ui_settings` JSON to `tenants`, e.g. `{ font_family, font_size_base, secondary_color, background_color, radius }`. Validate it with an allow-list of fonts and hex regexes, and expose it through the same `/tenants/{subdomain}` and `/auth/me` payloads, so web and mobile share it. Until then, the web theme treats those keys as optional with safe defaults.
- **[Web]** Re-fetch tenant settings on app load (cheap, cacheable), not only when `tenant_id` is missing.

---

## 3. Code-structure problems

| Problem | Evidence | Impact |
|---|---|---|
| God components | DailyActivitiesPage 1306, AssessmentsPage 1295, StudentsPage 1201, EnquiriesPage 854, FactsPage 849, UserProfileModal 828, DailyActivityApprovalsPage 749, StaffPage 686 | Hard to review; permission checks buried deep inside the JSX |
| API calls inside components | ~250 axios/fetch calls across 58 files; only `overviewApi.ts`, `myNotifications.ts`, `noticeUnread.ts` are service modules | No reuse, no central auth or 401/422 handling |
| Duplicated config | `API_BASE_URL` ×58; token read from localStorage 102×; `authUser` JSON.parse 24× | Drift risk (e.g. Sidebar parses on its own instead of calling `getAuthUser`) |
| Duplicated UI | 3 near-identical people pages (Students/Teachers/Staff: search, table, add/edit modals, delete confirm); 2 birthday cards; 2 sets of chapter/topic managers (admin vs library); page-header + breadcrumb markup copy-pasted into most pages | ~30–40% of page code is repeated markup |
| Magic strings | Role strings `'coaching_admin'`, `'teacher'`, `'student'` compared literally in ~40 places despite `ROLES`; `super_admin` missing from `ROLES`; route paths as literals in Sidebar, Links, and `myNotifications.ts`; statuses (`'active'\|'inactive'`, `'released'`, `homework_status`) inline | Refactor risk; permission typos fail silently |
| Mixed patterns | `Icon` web component + `ri-*` font icons + emoji; react-bootstrap `<Button>` next to raw `<button className="btn">` | Inconsistent visuals and a11y |
| Dead code | `App.css`, `ThemeCustomizer`, static settings pages, `static_site/` (PHP mock-ups), commented sidebar blocks, `assets/react.svg`, the `build/` folder committed in the repo root | Noise; `build/` should be git-ignored |
| No code splitting | Every page imported eagerly in `App.tsx` | 1.3 MB first load for sign-in |

---

## 4. UI problems

| Area | Findings |
|---|---|
| Spacing and typography | The template's px utilities (`mb-24`, `p-40`, `px-12 py-16`) are used ad hoc with no scale discipline. Headings are mostly `<h6>` for page titles. There's no type scale and inconsistent font weights |
| Responsiveness | Wide tables sit in `table-responsive` at best. Action columns overflow at 360 px. Filter rows wrap unevenly. Modals use the default size on mobile. The Topbar search is hidden below `md` with no alternative |
| Tables | No sorting. Pagination only on NotificationsPage. Row actions vary per page (icon buttons, a dropdown, or text links). No sticky header. Empty tables render a bare "No … found" row |
| Forms | Labels aren't always linked (`htmlFor` is missing in many modals). Required markers are inconsistent. Errors show as a single `alert()` or a red `<p>` at the top. No inline field errors. **Server 422s are reduced to the first message** (only 3 places) or a generic "Error". No double-submit protection in several modals. No unsaved-changes guard. Date inputs are native with no range hints |
| Loading / empty / error | ~285 "Loading…" / Spinner occurrences, mostly text. No skeletons. Many fetch failures only reach `console.error`, so the user sees an empty table. There's no retry anywhere |
| Feedback | 91 blocking `alert()` popups for success and error. Destructive actions use a mix of custom modals and `window.confirm` |
| Accessibility | Only 33 `aria-*` attributes app-wide. Icon-only buttons (edit/delete) have no labels. `iconify-icon` isn't hidden from screen readers. Focus rings are the template default. There's no skip link. Colour-only status badges. `<html lang="en">` is fixed even for Hindi content |
| Security in rendering | `QuestionsManager.tsx:385` renders `question.question_html` **without DOMPurify** (all 10 other `dangerouslySetInnerHTML` uses sanitise). See §9 |
| Performance | ~540 KB of template and Bootstrap CSS, plus ~170 KB of unused CSS, all render-blocking. Inter is `@import`ed. Iconify fetches icons at runtime. react-slick is pulled in for one card. Everything ships in one bundle |

---

## 5. Permissions audit

This is fully documented in **[`PERMISSIONS_MAP.md`](./PERMISSIONS_MAP.md)**: the mechanism, every route guard, every sidebar rule, 70+ in-page elements, the quirks Q1–Q11, and a role test matrix.

Plan for Phase 4 (wrappers only, calling the existing `can` / `canAny` / `getAuthUser`):

- `permissions/constants.ts`: `PERMISSIONS.FEES_VIEW = 'fees.view'` etc. (string values identical to today). Add `ROLES.SUPER_ADMIN`.
- `usePermission()` → `{ user, can, canAny, hasRole }`, backed by an `AuthProvider` that seeds from localStorage **synchronously**, so there's no "render then hide", and updates after `/auth/me`. This fixes Q8 only if you approve it (D3). The default is identical semantics.
- `<PermissionGate anyOf orRoles fallback>` returns `null` (or the fallback) with the same logic as `RequirePermission`.
- `RequirePermission` keeps its props and redirect behaviour. A "You don't have access" page is **only** used where the page shows a message today (Enquiries, AI Content, Notifications).
- The menu becomes a typed config array (`{ to, label, icon, visible(user) }`). Each `visible` is a literal translation of today's JSX condition, and the same config feeds the Sidebar, breadcrumbs, and any command palette.

---

## 6. Forms audit

Legend. FE = current frontend validation, BE = Laravel rules, ⚠ = gap to close in Phase 6 (stricter only, never looser).

| # | Form (file) | Fields | FE today | BE rules | Submit error handling | Gaps |
|---|---|---|---|---|---|---|
| F1 | Sign in (SignInPage) | email, password | `required`, `type=email`, **`minLength=8`**, trim email | login: email/password | Generic "Invalid credentials or server error." | ⚠ BE allows password **min 6** for created users. A user whose password is 6–7 chars **cannot pass the browser `minLength=8`**, which is an existing bug. **Decision D4.** Show a distinct message for tenant-missing vs 401 vs network |
| F2 | Add/Edit Student (StudentsPage) | name, email, password (edit: optional), dob, gender, class, grade, subjects[], phone | only `required` on a few + trim check | name ≤255 req; email unique; password min:6 (edit nullable); dob date; gender in male/female/other; grade int 1–12; phone ≤20 | `alert()` | ⚠ password min 6, gender enum, grade 1–12, phone ≤20 (+ Indian mobile format as a *hint* only unless D4 approves strict), dob not in future, email format, 422 → field |
| F3 | Bulk / single Promote, Reactivate (StudentsPage) | from/to year, from/to class, rejoined date | none | enrollment endpoints | `alert()` | ⚠ to ≠ from, required selects |
| F4 | Add/Edit Teacher | name, email, phone (`maxLength 20`), password, dob, gender | trim + required | phone `regex:/^\+?[0-9\s\-]{7,20}$/`, password min 6, gender enum | `alert()` | ⚠ phone regex, password min, 422 mapping |
| F5 | Add/Edit Staff + permissions | name, email, password, dob, gender, permissions[] | trim + required | same as teacher (no phone), `permissions.*` string | first 422 message | ⚠ password min, gender enum |
| F6 | Assign Teachers (AssignTeachersModal) | teacher_ids[] | none | required array | `alert()` | ⚠ at least one |
| F7 | Enquiry create / edit / log communication | enquiry_type, name, contact_number, email, school_name, class_grade, subjects_interested, description, status; channel, notes, communicated_at | name + contact required | name ≤255, contact ≤50, email email ≤255, school ≤255, class_grade ≤100, subjects ≤500, status enum; channel enum | red text / `alert()` | ⚠ all max lengths, email format, contact phone pattern (hint) |
| F8 | Expense | amount, expense_date, expense_by, description, note | `required` on one field | amount numeric ≥0 req; date req; description ≤500; expense_by exists | `alert()` | ⚠ amount ≥0, date required, description ≤500 |
| F9 | Fee add (FeeComponent) / edit (FeeEditModal) | student, from, to, amount, mode, submitted_on, notes | edit: required + to ≥ from | to after_or_equal from; amount ≥0; mode ≤50; submitted_on ≤ today (req on edit); notes ≤1000 | edit: first 422; add: `alert()` | ⚠ submitted_on ≤ today, notes ≤1000, add-form parity with edit |
| F10 | Subject add/edit | subject | trim | req ≤255 | `alert()` | ⚠ max 255 |
| F11 | Class add/edit (ClassesPage) | name (prompt-style) | trim | — (check) | `alert()` | ⚠ confirm BE rule in Phase 6 |
| F12 | Academic year add/edit | name, starts_on, ends_on, is_current | none | name ≤100; ends_on **after** starts_on | `alert()` | ⚠ end > start, name ≤100 |
| F13 | Assessment create/edit + assign + results + file upload | title, subject, class, total_marks, scheduled_date, description; per-student date; marks_obtained; file | minimal | title ≤255 req; subject req; total_marks int ≥1; results marks ≥0 | `alert()` | ⚠ total_marks ≥1 int, **marks_obtained ≤ total_marks** (conditional), file type/size |
| F14 | Question paper (QuestionPaperModal) | per-question marks, order | `type=number` | 422 handled | 422 message | read-only when released: keep |
| F15 | Daily activity (teacher; batch and per-student) | date, class, subject, chapter, topic, notes, homework, attachments | minimal | class/subject req; chapter_number 1–20; attachments jpeg/jpg/png/webp/pdf **≤10 MB** | `alert()` | ⚠ file type + size + preview, required selects |
| F16 | Approvals remark (daily activity / generated content) | remark | `required` | — | `alert()` | trim, max |
| F17 | Notice create/edit (NoticeFormModal) | title, body, audience[], publish_at, expires_at, attachment, pinned, important | title/body req, ≥1 audience, expiry required and > publish, attachment ≤5 MB | (server) | first 422 message | already the best-validated form; port as is, add field mapping |
| F18 | Fact (AdminFactsPage) | title, content_type, content, image, source_url, tags, publish_at, published, audience, target classes | `required` title, URL normalise | image req (on upload) jpeg/jpg/png/webp/gif **≤4 MB** | `alert()` | ⚠ image type/size + preview, URL format |
| F19 | Chapter / Topic / Question managers | subject, chapter name / topic name, grade, explanation; question: type, options A–D, correct answer, answer_key, grade, difficulty, html, solution, image | trim + required | options `required_if:mcq` ≤255; answer_key required_if subjective; grade rule; difficulty enum; image jpeg/jpg/png/webp ≤5 MB; unique name per subject | `alert()` | ⚠ conditional MCQ rules, image limits, duplicate-name 422 → field |
| F20 | Attendance correction request (MyAttendance) | date (read-only), requested_status, reason | trim | status in present/absent/leave; **reason min 5** | `alert()` | ⚠ reason ≥5 |
| F21 | Attendance correction review (CorrectionsAdminPage) | approved, admin_comment | — | approved boolean | `alert()` | — |
| F22 | Daily attendance (DailyAttendance) | date, status per user, holiday | — | — | `alert()` | optimistic row status |
| F23 | Profile / avatar upload (ProfilePage, UserProfileModal) | image | `accept=image/*` | (check in Phase 6) | `alert()` | ⚠ type/size + preview |
| F24 | Topbar search | q | trim non-empty | — | — | — |
| F25 | Filters (many pages) | search, class, year, status, date range | — | — | — | date range start ≤ end |
| F26 | Static forms: SignUp, Company, Notification, Notification Alert, Theme | template mocks | none | **no API** | — | D2: restyle only, or hide |

The payload shapes (`FormData` vs JSON, field names, `activities[]` batching) will be kept byte-identical. Every zod schema will carry a `toPayload()` mapper covered by a unit test, to prove the same shape comes out.

---

## 7. Interaction points and proposed animation

Principles: admin and data-entry screens stay **subtle and fast** (150–250 ms, no per-row stagger on large tables). Richer motion goes only on student-facing and dashboard moments. Everything respects `prefers-reduced-motion` and falls back to a plain fade or no motion.

### 7.1 Global (every page)

| Interaction | Proposed |
|---|---|
| Route change | Content area fade + 8 px rise (200 ms). The shell doesn't animate |
| Sidebar collapse / mobile drawer | Width/drawer slide (250 ms). Active item pill slides between links (`layoutId`) |
| Topbar | Shadow appears on scroll. Profile dropdown scale-fade from its trigger |
| Notification bell | Badge "pop" when unread increases (polling already exists). One gentle bell wiggle, but only on an *increase*, never on mount |
| Sidebar unread badges | Count change pop |
| Modals / confirm dialogs | Backdrop fade + dialog scale 0.96→1 (200 ms). Destructive confirm replaces `window.confirm` |
| Toasts | Sonner slide-in/stack. Replaces the 91 `alert()` calls |
| Buttons | Press scale 0.98. Loading spinner, then a brief ✓ on success for save buttons |
| Data loading | Skeleton shimmer that cross-fades into content. Error state with Retry |
| Search submit | Topbar input focus-expand. The results page groups fade in |

### 7.2 Per page

| Page | Interaction points → proposed animation |
|---|---|
| Sign in | Card fade-up on load. Password eye toggle icon morph. Submit spinner. Error shake on the form-level alert. Logo fades in once the tenant resolves (replaces "Preparing your workspace…" text with a skeleton) |
| Dashboard | Stat numbers **count up** (first mount only). Cards stagger in (≤8 items). Alert cards slide in. PendingActions/ActivityGaps "Notify" button → spinner → ✓ and the row fades out. Birthday slider becomes a CSS scroll-snap carousel (lets us drop react-slick). ActivityLog filters cross-fade the list |
| Smart dashboard (teacher/student widgets) | Progress bar **fills when scrolled into view**. Low-score values get a warning-colour pulse, once |
| Daily attendance | Status toggle animates (segmented control with a sliding pill). Row flashes success on save. Holiday toggle animates a banner in or out. **No row stagger** (large list) |
| My attendance | Attendance % **ring fills**. Calendar day cells fade in per month switch. Longest-streak number counts up. The correction request modal becomes a Sheet on mobile |
| Students / Teachers / Staff | Filter-chip in/out. Search results cross-fade. Row actions dropdown scale-fade. Deleted row collapses out. New row gets a brief highlight (existing `useFocusRow` gets a motion variant). Bulk promote as a 2-step dialog with a step indicator |
| UserProfileModal | Tabs with a sliding indicator (Profile / Fees / Assessments / Insights, *only the tabs the role already sees*). Accuracy % ring |
| Subjects / Classes / Academic years | Inline add → the row animates in. "Set as current" badge pop |
| Chapters / Topics / Questions | Accordion expand for topic lists. Question-type switch animates the conditional MCQ option fields in or out. Image upload preview fade |
| Daily activities (teacher) | Multi-row form: add/remove activity rows animate height. Attachment chips pop in and collapse on remove. Save → ✓ |
| Student activities / topic content | Card list stagger (first load). "Solution locked until…" → unlock reveal (expand + fade) when the unlock time has passed. This is an existing feature, so it's a genuine learning moment |
| Approvals (daily / AI content) | Bulk selection bar slides up. Approve/reject → row badge morphs (Pending → Approved) with a success tint. Optimistic update with rollback and a toast on failure |
| Assessments (admin/teacher) | Auto-generate toggle switch animation. Approval badge morph. File list add/remove. Question-paper modal: drag-reorder uses `Reorder` **only if ordering already exists**; otherwise it stays a subtle layout animation |
| **Student assessments** (learning moment) | Result score **counts up** to `marks_obtained/total_marks`. Percentage ring fills. **Confetti at ≥ 80%** (lazy-loaded, skippable, fires once per result per session). Below 50%, an encouraging message ("Keep going — review the teacher notes"), never a "failed" treatment. Teacher notes expand smoothly |
| Student question paper modal | Questions fade in sequentially (≤ 20). Read-only, so there's no answer interaction to animate |
| Insights | Subject "share" bars grow on first view. Window switch (Today/3d/…) pill slides, and the bars animate to their new values. The existing `series[]` could become a sparkline (Recharts, lazy). Only with your OK, since it changes presentation |
| Fees / Expenses | Totals count up. Edit modal. Pending fees card: row "mark paid" → strike + fade |
| Enquiries | Status filter pills. Follow-up log timeline items animate in. Communication channel icons |
| Notice board | Pinned/important badges. The "new" dot fades when a notice is read. Infinite-scroll items fade in (existing sentinel). Detail modal. Form attachment preview |
| My notifications / Notifications (admin) | Mark-read → dot shrinks out. List stagger on first page only. Pagination content fade |
| Facts | Tab pill slides (existing tabs). Fact cards with hover lift. **Share** action gives an icon pop + "Copied" tooltip (the existing `share()`) |
| Profile | Avatar upload: preview crossfade + progress |
| 404 | Friendly SVG illustration (book/lightbulb) + "Back to dashboard" |

### 7.3 Brief items with no host feature today (won't be built unless you ask)

Quiz option selection, correct/wrong answer glow and shake, timer ring, question-to-question slides, streak indicator (the only "streak" is *longest present run* in MyAttendance; I propose a count-up there and nothing more), badges/level-ups, flashcards, onboarding tour, "no internet" state (I can add an offline banner; it's cheap and useful). Tell me if any of these are planned features.

---

## 8. Proposed stack and folder structure

### 8.1 Migrate or build on Bootstrap?

| Option | Pros | Cons |
|---|---|---|
| **A. Migrate to Tailwind 4 + shadcn/ui (Radix)** (recommended; your preferred stack) | Theme via CSS variables, which is exactly what dynamic tenant colours need. Accessible primitives. Tree-shaken. Removes ~700 KB of static CSS and the Iconify runtime at the end. Components are owned code | Two systems coexist during the migration. The template CSS and Tailwind preflight can clash |
| B. Keep react-bootstrap / WowDash and polish | Smallest diff | The template's colour scale is compiled SCSS, so runtime theming stays hacky. Heavy CSS stays. Weak a11y. Doesn't meet the brief |

**Coexistence plan for A (so nothing breaks mid-way):**

1. Add Tailwind with **preflight disabled** and all shadcn tokens under the shadcn names (`--primary`, …), which don't collide with the template's `--primary-600`. The ThemeProvider writes **both**: the shadcn tokens *and* the template's `--primary-50…900`. That way un-migrated pages also get the tenant colour immediately, which fixes the §2.3 bug on day one.
2. Migrate one feature at a time. react-bootstrap Modal/Button get replaced per feature.
3. Once no page uses template classes: enable preflight, delete `style.css`, `bootstrap.min.css`, the 12 unused CSS libs, the Iconify runtime and Remixicon, and uninstall `react-bootstrap`, `bootstrap`, `react-slick`, and `slick-carousel`.

The final state has one component library. During the transition two exist; that's unavoidable for an incremental, non-breaking migration.

### 8.2 Packages (awaiting approval in Phase 2; nothing installed)

| Package | Purpose | ~Size (min+gz, as shipped) |
|---|---|---|
| `@tailwindcss/vite` | Tailwind 4 Vite plugin (replaces the unused postcss/autoprefixer setup) | build-time; emitted CSS ≈ 15–30 KB |
| `tw-animate-css` | shadcn animation utilities (Tailwind 4 replacement for tailwindcss-animate) | ≈ 2 KB CSS |
| `class-variance-authority`, `clsx`, `tailwind-merge` | shadcn variant/class helpers | ≈ 1 + 0.5 + 7 KB |
| `radix-ui` (primitives used by shadcn: dialog, dropdown, select, tabs, tooltip, popover, accordion, avatar, checkbox, switch, progress, label, slot) | Accessible primitives | ≈ 3–12 KB each; ≈ 45–60 KB for the set used |
| `cmdk` (optional) | Command palette (permission-filtered) | ≈ 5 KB |
| `@tanstack/react-table` | Headless DataTable (sort/filter/paginate, permission-aware columns) | ≈ 14 KB |
| `react-hook-form` | Forms | ≈ 9 KB |
| `zod` (v4; `zod/mini` where size matters) | Schemas | ≈ 13 KB (mini ≈ 2–4 KB) |
| `@hookform/resolvers` | RHF ↔ zod | ≈ 1 KB |
| `lucide-react` | Icons (replaces Iconify runtime + Remixicon) | ≈ 0.3–0.6 KB per icon, tree-shaken (~60 icons ≈ 20 KB) |
| `motion` (Framer Motion) | Animations; use `LazyMotion` + `m` + `domAnimation` | ≈ 15–20 KB with LazyMotion (≈ 34 KB full) |
| `sonner` | Toasts | ≈ 10 KB |
| `recharts` | Charts: **only** if you approve Insights sparklines/bars; lazy-loaded with its route | ≈ 95–110 KB (lazy) |
| `canvas-confetti` | Celebration on student results; dynamic `import()` | ≈ 6 KB (lazy) |
| `@fontsource-variable/inter` + `@fontsource/noto-sans-devanagari` | Self-hosted fonts (replaces the render-blocking Google `@import`); Devanagari subset loaded via `unicode-range` only when Hindi glyphs appear | CSS ≈ 1 KB; woff2 ≈ 25–50 KB per subset, on demand |
| `lottie-react` | **Not recommended.** Pulls lottie-web (≈ 80 KB gz). I'd use small inline SVG + motion for empty/error illustrations instead | — |

Dev-only: `vitest` + `@testing-library/react` + `jsdom` (optional, recommended) to unit-test zod schemas, payload mappers, and permission helpers.

**Removed at the end:** react-bootstrap, bootstrap, react-slick, slick-carousel, iconify-icon (npm + runtime script), autoprefixer, and the ~700 KB of static CSS. I also plan to delete the unused `postcss` config dependency and to route-split (`React.lazy`) every page. **Expected first-load JS: 1.30 MB → roughly 350–450 KB before gzip.**

### 8.3 Target folder structure

```
src/
  app/                 App.tsx, providers (Auth, Theme, Query-less), router config (lazy routes), AppShell
  components/ui/       shadcn primitives (button, input, dialog, sheet, table, skeleton, …) — tokens only
  components/common/   PageHeader, PageContainer, DataTable, EmptyState, ErrorState, ConfirmDialog,
                       StatCard, FileDropzone, StatusBadge, PasswordStrength, SearchInput
  features/
    auth/ dashboard/ attendance/ people/ (students, teachers, staff — shared UserForm/UserTable)
    academics/ (subjects, classes, academic-years) content/ (chapters, topics, questions, library)
    activities/ approvals/ assessments/ finance/ (fees, expenses) enquiries/ communication/
    (notices, notifications) facts/ insights/ search/ profile/ settings/
      └─ components/ hooks/ services/ schemas/ types/ pages/ index.ts
  permissions/         constants.ts, usePermission.ts, PermissionGate.tsx, RequirePermission.tsx,
                       ProtectedRoute.tsx, menu.ts (typed, permission-filtered nav config)
  theme/               tokens.ts, color.ts (scale + WCAG contrast), ThemeProvider.tsx, useTheme.ts,
                       fonts.ts, preload-theme.ts (inline pre-paint script)
  animations/          variants.ts, transitions.ts (tokens 150/250/400), useCountUp, useInViewOnce,
                       MotionProvider (LazyMotion + reduced motion)
  lib/                 apiClient.ts (axios instance: baseURL, token, 401, 422 normaliser), formatters,
                       date.ts, branding.ts, storage.ts
  constants/           routes.ts, statuses.ts, roles.ts
```

`lib/apiClient.ts` keeps the **same URLs, headers, and bodies**. It only centralises what's copy-pasted today. Services call it; components never do.

---

## 9. Security / production issues found (outside the UI scope; not fixed)

| Sev | Layer | Issue | Recommendation |
|---|---|---|---|
| **High** | [Backend] | `GET /tenants/{subdomain}` (public, unauthenticated) returns the whole `Tenant` model, including **`fcm_server_key` and `firebase_admin_sdk_json`**. The web app then stores them in `localStorage.tenant`. Anyone can read a tenant's Firebase admin credentials by visiting that URL | Add `protected $hidden = ['fcm_server_key','firebase_admin_sdk_json']` to `Tenant`, or return an explicit public DTO (`id, name, subdomain, theme_color, logo_*_url`). **Rotate the exposed Firebase keys.** Also remove the `sleep(1)` in `getTenantBySubdomain` |
| Medium | [Web] | `QuestionsManager.tsx:385` renders `question_html` unsanitised (stored XSS vector for teacher/admin sessions; global questions come from other tenants/super-admin) | Wrap with `DOMPurify.sanitize` like the other 10 call sites. It's a one-line fix; I can do it in Phase 2 with your OK |
| Low | [Web] | Bearer token in `localStorage` (XSS-reachable) | Keep for now (mobile parity). Consider Sanctum SPA cookie auth later |
| Low | [Repo] | `build/` output folder is committed and not ignored | Add it to `.gitignore` |

---

## 10. Decisions I need from you before Phase 2

| # | Question | My recommendation |
|---|---|---|
| D1 | Only `theme_color` exists. Should I (a) theme from `theme_color` + logos only, with optional font/secondary/background keys ready for later, or (b) also add a `ui_settings` JSON column + validation on the backend now (shared with mobile)? | (a) now; (b) as a separate backend task |
| D2 | Static template pages (`/dashboard/settings/*`, `/auth/sign-up`) have no API and no menu link. Restyle as they are, or leave them untouched? | Leave untouched; they're not reachable from the UI. Don't remove routes |
| D3 | Q1–Q11 permission inconsistencies: preserve exactly (default), or align them in a separate reviewed change? And may the new `AuthProvider` re-render the menu after `/auth/me` (fixes Q8; permissions only ever become *more current*)? | Preserve Q1–Q7, Q10. Allow the Q8 re-render |
| D4 | Validation strictness vs backend: password rule for **create/edit user** forms. Backend is `min:6`. Enforce min 6 only, or add a strength policy (e.g. 8+ with letters and digits)? A stricter FE rule doesn't break the API but changes admin UX. Also the **sign-in `minLength=8` bug**: relax to 6 to match the backend? (That's technically "loosening".) Indian mobile regex `^(\+91)?[6-9]\d{9}$`: enforce, or keep the backend's looser `^\+?[0-9\s\-]{7,20}$` with a hint? | Min 6 + strength *meter* (advisory). Fix sign-in to 6. Mobile: accept the backend format and warn (not block) on non-Indian patterns |
| D5 | Dark mode **already exists** (Topbar toggle). Keep it working through the migration (the tokens get a `[data-theme=dark]` set)? | Yes, keep it; it's an existing feature |
| D6 | Charts: introduce Recharts for Insights (series data already returned), or keep text/bars? | Yes, lazy-loaded |
| D7 | Fix the backend tenant-secret leak (§9) now? It's backend work and outside this brief | Yes, urgently, as a separate commit in coachify_back_end |
| D8 | Add `vitest` for schema, payload, and permission unit tests? | Yes |

Once you approve (and answer D1–D8), I'll start Phase 2: I'll list the exact install command, and nothing gets installed without your go-ahead.

### 10.1 Decisions log

| # | Decision | Date |
|---|---|---|
| D1 | **Theme from `theme_color` only** (plus existing logos and name). No backend `ui_settings`. Font, secondary, and background use fixed design-system defaults (Inter + Noto Sans Devanagari fallback). The shades, hover states, and foreground contrast are all derived from `theme_color`. | 2026-09-30 |
| D4 | **Password minimum is 8 characters everywhere on web.** Sign-in keeps `minLength=8`, and the create/edit Student, Teacher, and Staff forms enforce min 8 (the edit forms only when the field is filled in). The backend will be raised from `min:6` to `min:8` separately (see below). The strength meter is advisory only. | 2026-09-30 |

Follow-ups for D4, outside this repo:
- **[Backend]** Change `min:6` → `min:8` in `AuthController.php:44`, `Admin/StaffController.php:86,152`, `Admin/TeacherController.php:64,129`, `Admin/StudentController.php:122,235,293`.
- Existing users with 6–7 character passwords still can't sign in on web, which is already the case today. They'll need a password reset.
- **[Mobile]** I found no client-side password-length check in coachify_react_native. Add a min-8 check there too, to stay consistent.

Still open: D2, D3, D5, D6, D7, D8. Until you answer, I'll use the recommended default for each.
