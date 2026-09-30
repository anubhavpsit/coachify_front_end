import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  BellRing,
  BookMarked,
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarCheck2,
  CalendarRange,
  ChartSpline,
  ClipboardCheck,
  ClipboardPen,
  FilePenLine,
  GraduationCap,
  House,
  IndianRupee,
  Layers,
  Lightbulb,
  MessageCircleQuestion,
  NotebookText,
  Presentation,
  ReceiptIndianRupee,
  SquareLibrary,
  UserCog,
  ImagePlus,
  ListChecks,
} from 'lucide-react'
import { ROLES } from '@/constants/roles'
import { ROUTES } from '@/constants/routes'
import { PERMISSIONS as P } from './keys'
import type { PermissionApi } from './usePermission'

export type NavBadge = 'notices' | 'inbox'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** NavLink `end` — kept identical to the legacy sidebar for active-state parity. */
  end?: boolean
  badge?: NavBadge
  /** Literal translation of the legacy Sidebar.tsx JSX condition. */
  visible: (p: PermissionApi) => boolean
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const always = () => true

/**
 * Single source for every navigation surface (sidebar, mobile drawer,
 * breadcrumbs, command palette). Visibility is checked against
 * src/permissions/__fixtures__/legacy-sidebar.json by menu.test.tsx.
 *
 * Notice Board and My Notifications (both always visible) moved to the top
 * bar: the megaphone button and the bell's "View all notifications".
 *
 * Legacy duplicates are merged into one item with OR-ed conditions:
 *  - Insights: (teacher || insights.view) OR student
 *  - Approvals: teacher OR daily_activities.approve
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: House, end: true, visible: always },
      { to: ROUTES.FACTS, label: 'Facts', icon: Lightbulb, visible: always },
      {
        to: ROUTES.MY_ATTENDANCE,
        label: 'My Attendance',
        icon: CalendarCheck,
        visible: (p) => p.hasRole(ROLES.STUDENT, ROLES.TEACHER),
      },
      {
        to: ROUTES.INSIGHTS,
        label: 'Insights',
        icon: ChartSpline,
        visible: (p) => p.hasRole(ROLES.TEACHER) || p.can(P.INSIGHTS_VIEW) || p.hasRole(ROLES.STUDENT),
      },
    ],
  },
  {
    id: 'learning',
    label: 'Learning',
    items: [
      { to: ROUTES.STUDENT_ACTIVITIES, label: 'My Activities', icon: CalendarCheck2, visible: (p) => p.hasRole(ROLES.STUDENT) },
      { to: ROUTES.STUDENT_ASSESSMENTS, label: 'My Assessments', icon: FilePenLine, visible: (p) => p.hasRole(ROLES.STUDENT) },
      {
        to: ROUTES.TEACHER_DAILY_ACTIVITIES,
        label: 'Daily Activities',
        icon: CalendarCheck2,
        visible: (p) => p.hasRole(ROLES.TEACHER),
      },
      {
        to: ROUTES.ASSESSMENTS,
        label: 'Assessments',
        icon: FilePenLine,
        visible: (p) =>
          p.hasRole(ROLES.TEACHER) || p.can(P.ASSESSMENTS_VIEW) || p.can(P.ASSESSMENTS_MANAGE) || p.can(P.ASSESSMENTS_GRADE),
      },
      {
        to: ROUTES.APPROVALS,
        label: 'Approvals',
        icon: BadgeCheck,
        end: true,
        visible: (p) => p.hasRole(ROLES.TEACHER) || p.can(P.DAILY_ACTIVITIES_APPROVE),
      },
      {
        to: ROUTES.APPROVALS_GENERATED_CONTENT,
        label: 'AI Content',
        icon: Bot,
        visible: (p) => p.can(P.GENERATED_CONTENT_APPROVE),
      },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    items: [
      { to: ROUTES.LIBRARY_CHAPTERS, label: 'Chapters', icon: BookOpen, visible: (p) => p.hasRole(ROLES.TEACHER) },
      { to: ROUTES.LIBRARY_TOPICS, label: 'Topics', icon: NotebookText, visible: (p) => p.hasRole(ROLES.TEACHER) },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { to: ROUTES.CHAPTERS, label: 'Chapters', icon: BookMarked, visible: (p) => p.can(P.CONTENT_LIBRARY_MANAGE) },
      { to: ROUTES.TOPICS, label: 'Topics', icon: ListChecks, visible: (p) => p.can(P.CONTENT_LIBRARY_MANAGE) },
      { to: ROUTES.ADMIN_FACTS, label: 'Manage Facts', icon: ImagePlus, visible: (p) => p.can(P.FACTS_MANAGE) },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [
      {
        to: ROUTES.STUDENTS,
        label: 'Students',
        icon: GraduationCap,
        end: true,
        visible: (p) => p.hasRole(ROLES.TEACHER) || p.can(P.STUDENTS_VIEW) || p.can(P.STUDENTS_MANAGE),
      },
      {
        to: ROUTES.TEACHERS,
        label: 'Teachers',
        icon: Presentation,
        end: true,
        visible: (p) => p.hasRole(ROLES.STUDENT) || p.can(P.TEACHERS_VIEW) || p.can(P.TEACHERS_MANAGE),
      },
      { to: ROUTES.STAFF, label: 'Staff', icon: UserCog, visible: (p) => p.can(P.STAFF_MANAGE) },
      { to: ROUTES.DAILY_ATTENDANCE, label: 'Daily Attendance', icon: ClipboardCheck, visible: (p) => p.can(P.ATTENDANCE_MARK) },
      {
        to: ROUTES.ATTENDANCE_CORRECTIONS,
        label: 'Attendance Corrections',
        icon: ClipboardPen,
        visible: (p) => p.can(P.ATTENDANCE_CORRECTIONS),
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      { to: ROUTES.SUBJECTS, label: 'Subjects', icon: SquareLibrary, visible: (p) => p.can(P.SUBJECTS_MANAGE) },
      { to: ROUTES.CLASSES, label: 'Classes', icon: Layers, visible: (p) => p.can(P.CLASSES_MANAGE) },
      { to: ROUTES.ACADEMIC_YEARS, label: 'Academic Years', icon: CalendarRange, visible: (p) => p.can(P.ACADEMIC_YEARS_MANAGE) },
      { to: ROUTES.FEES, label: 'Fees', icon: IndianRupee, visible: (p) => p.can(P.FEES_VIEW) || p.can(P.FEES_MANAGE) },
      {
        to: ROUTES.EXPENSES,
        label: 'Expenses',
        icon: ReceiptIndianRupee,
        visible: (p) => p.can(P.EXPENSES_VIEW) || p.can(P.EXPENSES_MANAGE),
      },
      {
        to: ROUTES.ENQUIRIES,
        label: 'Enquiries',
        icon: MessageCircleQuestion,
        visible: (p) => p.can(P.ENQUIRIES_VIEW) || p.can(P.ENQUIRIES_MANAGE),
      },
      { to: ROUTES.NOTIFICATIONS, label: 'Notifications', icon: BellRing, visible: (p) => p.can(P.NOTIFICATIONS_MANAGE) },
    ],
  },
]

/** Groups with only the items this user may see; empty groups are dropped. */
export function visibleNavGroups(p: PermissionApi): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.visible(p)) })).filter((g) => g.items.length > 0)
}
