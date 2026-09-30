export type DashboardStats = {
  role: string
  total_students?: number
  total_teachers?: number
  total_expenses?: number
  total_earnings?: number
  total_activities?: number
  total_classes?: number
  total_subjects?: number
  home_not_done_count?: number
  total_fees_paid?: number
}

export type TopStudent = {
  student_id: number
  student_name: string | null
  student_status?: string | null
  average_percentage: number
  last_percentage: number
  last_graded_at: string
}
