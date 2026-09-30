import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

export type ActivityLog = {
  id: number
  user_id: number | null
  user_role: string | null
  action: string
  module: string
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  user?: { id: number; name: string; role: string } | null
}

export type Pagination = { current_page: number; last_page: number; total: number; per_page: number }
export type LogsResponse = { logs: ActivityLog[]; modules?: string[]; pagination: Pagination }
export type DashboardUser = { id: number; name: string; role: string; tenant_id?: number | null }

/** "daily_activities" → "Daily activities" */
export const moduleLabel = (m: string) => {
  const text = m.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export type LogFilters = {
  role: 'all' | 'coaching_admin' | 'teacher' | 'student' | 'staff'
  module: string
  userId: string
  startDate: string
  endDate: string
}

/** Query string exactly as the legacy ActivityLogCard built it (same order, same keys). */
export function buildLogParams(filters: LogFilters, page: number, perPage: number, withModules: boolean): URLSearchParams {
  const params = new URLSearchParams()
  params.append('per_page', String(perPage))
  params.append('page', String(page))
  if (filters.role !== 'all') params.append('user_role', filters.role)
  if (filters.module !== 'all') params.append('module', filters.module)
  if (withModules) params.append('with_modules', '1')
  if (filters.userId !== 'all') params.append('user_id', filters.userId)
  if (filters.startDate) params.append('start_date', filters.startDate)
  if (filters.endDate) params.append('end_date', filters.endDate)
  return params
}

export async function fetchActivityLogs(token: string, params: URLSearchParams, signal: AbortSignal) {
  const response = await axios.get<{ success: boolean; data: LogsResponse }>(`${API_BASE_URL}/activity-logs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  return response.data.data
}

export async function fetchUsers(token: string): Promise<DashboardUser[]> {
  const response = await axios.get<{ success: boolean; data: DashboardUser[] }>(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data.data || []
}
