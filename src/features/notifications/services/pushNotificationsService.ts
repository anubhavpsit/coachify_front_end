import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

export type UserSummary = { id: number; name: string; role: string; profile_img?: string | null }
export type Option = { value: string; label: string }
export type NotificationRecord = {
  id: number
  sent_to: number
  sent_from: number
  channel: string
  type: string
  title: string
  body: string | null
  payload: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  status: string
  attempts: number
  max_attempts: number
  scheduled_for: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  last_error: string | null
  recipient?: UserSummary | null
  sender?: UserSummary | null
}
export type PaginationMeta = { current_page: number; last_page: number; per_page: number; total: number }
export type PushListData = {
  notifications: NotificationRecord[]
  pagination: PaginationMeta
  filters: { types: Option[]; statuses: Option[] }
  stats: { pending: number; failed: number; sent_today: number }
}

export type SortBy = 'created_at' | 'sent_at' | 'status' | 'type'
export type PushFilters = {
  status: string
  type: string
  search: string
  startDate: string
  endDate: string
  sortBy: SortBy
  sortDirection: 'asc' | 'desc'
  perPage: number
}

/** Query string exactly as the legacy NotificationsPage built it. */
export function buildPushParams(f: PushFilters, page: number): URLSearchParams {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('per_page', String(f.perPage))
  params.append('sort_by', f.sortBy)
  params.append('sort_direction', f.sortDirection)
  if (f.status !== 'all') params.append('status', f.status)
  if (f.type !== 'all') params.append('type', f.type)
  if (f.search.trim()) params.append('search', f.search.trim())
  if (f.startDate) params.append('start_date', f.startDate)
  if (f.endDate) params.append('end_date', f.endDate)
  return params
}

export async function fetchPushNotifications(token: string, params: URLSearchParams, signal: AbortSignal) {
  const response = await axios.get<{ success: boolean; data: PushListData }>(`${API_BASE_URL}/notifications?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  return response.data.data
}

export async function sendPushNotification(token: string, id: number) {
  await axios.post(`${API_BASE_URL}/notifications/${id}/send`, {}, { headers: { Authorization: `Bearer ${token}` } })
}

export async function cancelPushNotification(token: string, id: number) {
  await axios.post(`${API_BASE_URL}/notifications/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } })
}
