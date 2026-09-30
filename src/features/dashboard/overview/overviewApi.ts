import axios from 'axios'

import { API_BASE_URL } from '@/lib/apiClient'

export type Severity = 'high' | 'medium' | 'info'
export type OverviewTarget =
  | 'assessments' | 'homework' | 'results' | 'attendance' | 'content'
  | 'papers' | 'grading' | 'daily_activities' | 'students'

export type OverviewAlert = {
  key: string
  severity: Severity
  icon: string
  title: string
  message: string
  target: OverviewTarget
}

export type StudentOverview = {
  upcoming_assessments: {
    assignment_id: number; assessment_id: number; title: string; subject: string
    scheduled_date: string | null; days_until: number | null; last_subject_score: number | null
  }[]
  homework_pending: {
    count: number
    items: { activity_id: number; activity_date: string | null; subject: string | null; topic: string | null; homework: string; status: string }[]
  }
  recent_results: {
    assessment_id: number; title: string; subject: string; marks_obtained: number | null; total_marks: number | null
    percentage: number | null; graded_at: string | null; previous_percentage: number | null; trend: 'up' | 'down' | 'same' | null
  }[]
  attendance: { month: string; present: number; absent: number; leave: number; percentage: number | null; low: boolean }
  new_content: { activity_id: number; activity_date: string | null; subject: string | null; topic: string | null; approved_at: string | null; solutions_available: boolean }[]
}

export type TeacherOverview = {
  upcoming_assessments: {
    assessment_id: number; title: string; subject: string; scheduled_date: string | null
    days_until: number | null; students_count: number; paper_status: 'approved' | 'released' | null
  }[]
  papers_to_approve: { assessment_id: number; title: string; subject: string; scheduled_date: string | null; days_until: number | null }[]
  results_to_enter: { assessment_id: number; title: string; subject: string; scheduled_date: string | null; days_since: number | null; pending_count: number }[]
  today_activity: { date: string; is_holiday: boolean; total_students: number; logged_count: number; missing_count: number; missing: { id: number; name: string }[] }
  students_attention: {
    student_id: number; name: string
    reasons: { type: 'low_attendance' | 'low_score' | 'homework_not_done'; value: number; subject?: string | null }[]
  }[]
}

export type Overview = {
  role: 'student' | 'teacher'
  today: string
  alerts: OverviewAlert[]
  student?: StudentOverview
  teacher?: TeacherOverview
}

/** One request for the whole smart dashboard (keeps DB connections low). */
export async function fetchOverview(): Promise<Overview> {
  const res = await axios.get<{ success: boolean; data: Overview }>(`${API_BASE_URL}/dashboard/overview`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' },
  })
  return res.data.data
}

/** Where an alert / "View all" goes in the web app, per role. */
export function targetRoute(target: OverviewTarget, role: 'student' | 'teacher'): string {
  if (role === 'student') {
    switch (target) {
      case 'assessments':
      case 'results':
        return '/students/assessments'
      case 'homework':
      case 'content':
        return '/students/activities'
      case 'attendance':
        return '/my-attendance'
      default:
        return '/dashboard'
    }
  }
  switch (target) {
    case 'assessments':
    case 'papers':
    case 'grading':
      return '/assessments'
    case 'daily_activities':
      return '/teachers/daily-activities'
    case 'students':
      return '/students'
    default:
      return '/dashboard'
  }
}

export function whenLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return ''
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} ago`
  return `In ${days} days`
}
