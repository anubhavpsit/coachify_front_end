import type { PendingAction } from '../services/widgetsService'

// Pure ports of the legacy PendingActionsCard filter logic (unit-tested).

export type RoleFilter = 'all' | 'teacher' | 'student'
export type PendingFilters = { type: string; date: string; role: RoleFilter; userId: string }
export const EMPTY_FILTERS: PendingFilters = { type: 'all', date: '', role: 'all', userId: '' }

/** Pending-action types that name a responsible teacher and can be nudged. */
export const NOTIFIABLE_REASONS = ['assessment_overdue', 'subject_not_covered', 'subject_gap']

export const TYPE_LABELS: Record<string, string> = {
  attendance_missing: 'Attendance',
  expense_missing: 'Expenses',
  daily_activity_missing: 'Daily Activities',
}

export const isNotifiable = (action: PendingAction, canNotify: boolean) =>
  canNotify && !!action.for_teacher_id && NOTIFIABLE_REASONS.includes(action.type)

export const rowKey = (action: PendingAction, index: number) =>
  `${action.type}-${action.for_teacher_id ?? ''}-${action.student_name ?? ''}-${action.subject_name ?? ''}-${index}`

export function buildFilterOptions(actions: PendingAction[]) {
  const types = Array.from(new Set(actions.map((a) => a.type)))
  const teachers = Array.from(
    new Map(actions.filter((a) => !!a.for_teacher_id).map((a) => [a.for_teacher_id!, a.for_teacher_name || `Teacher #${a.for_teacher_id}`])),
  ).map(([id, name]) => ({ id, name }))
  const students = Array.from(
    new Map(actions.filter((a) => !!a.student_id).map((a) => [a.student_id!, a.student_name || `Student #${a.student_id}`])),
  ).map(([id, name]) => ({ id, name }))
  return { types, teachers, students, hasUserAttribution: teachers.length > 0 || students.length > 0 }
}

export function filterPendingActions(actions: PendingAction[], f: PendingFilters): PendingAction[] {
  return actions.filter((action) => {
    if (f.type !== 'all' && action.type !== f.type) return false
    if (f.date && action.date && action.date !== f.date) return false
    if (f.date && !action.date) return false
    if (f.role === 'teacher') {
      if (!action.for_teacher_id) return false
      if (f.userId && String(action.for_teacher_id) !== f.userId) return false
    }
    if (f.role === 'student') {
      if (!action.student_id) return false
      if (f.userId && String(action.student_id) !== f.userId) return false
    }
    return true
  })
}
