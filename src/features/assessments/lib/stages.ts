import type { AssessmentStage, AssignmentStage } from '../services/assessmentsService'

type Variant = 'secondary' | 'info' | 'success' | 'destructive' | 'warning'

/** One student's assessment — same words and colours on every screen (web + app). */
export const ASSIGNMENT_STAGE: Record<AssignmentStage, { label: string; variant: Variant }> = {
  upcoming: { label: 'Upcoming', variant: 'info' },
  today: { label: 'Today', variant: 'warning' },
  awaiting_results: { label: 'Awaiting results', variant: 'destructive' },
  result_out: { label: 'Result out', variant: 'success' },
  absent: { label: 'Absent', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}

/** A whole assessment, most urgent first. */
export const ASSESSMENT_STAGE: Record<AssessmentStage, { label: string; variant: Variant }> = {
  needs_results: { label: 'Needs results', variant: 'destructive' },
  today: { label: 'Today', variant: 'warning' },
  upcoming: { label: 'Upcoming', variant: 'info' },
  not_assigned: { label: 'No students yet', variant: 'secondary' },
  done: { label: 'Done', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}

/** Tabs on the Assessments page, in order. */
export const STAGE_TABS = ['needs_results', 'today', 'upcoming', 'done', 'all'] as const
export type StageTab = (typeof STAGE_TABS)[number]
export const STAGE_TAB_LABEL: Record<StageTab, string> = {
  needs_results: 'Needs results',
  today: 'Today',
  upcoming: 'Upcoming',
  done: 'Done',
  all: 'All',
}

/** Which tab an assessment belongs to (not-assigned → Upcoming, cancelled → Done). */
export function tabFor(stage: AssessmentStage | undefined): Exclude<StageTab, 'all'> {
  switch (stage) {
    case 'needs_results':
    case 'today':
    case 'done':
      return stage
    case 'cancelled':
      return 'done'
    default:
      return 'upcoming'
  }
}

/** Students to act on first: awaiting results, today, upcoming, then closed ones. */
export const STAGE_ORDER: Record<AssignmentStage, number> = { awaiting_results: 0, today: 1, upcoming: 2, absent: 3, result_out: 4, cancelled: 5 }
