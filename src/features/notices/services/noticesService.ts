import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import type { Notice, NoticeListResponse } from '../types'

// Same URLs, params and headers as the legacy notice components.
export function authHeaders() {
  const token = localStorage.getItem('authToken')
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' }
}

export const NOTICE_PAGE_SIZE = 15

export async function listNotices(params: { status: 'active' | 'expired'; cursor?: string | null }) {
  const res = await axios.get<NoticeListResponse>(`${API_BASE_URL}/notices`, {
    params: params.cursor ? { limit: NOTICE_PAGE_SIZE, cursor: params.cursor, status: params.status } : { limit: NOTICE_PAGE_SIZE, status: params.status },
    headers: authHeaders(),
  })
  return res.data
}

export async function getNotice(id: number) {
  const res = await axios.get<{ success: boolean; data: Notice }>(`${API_BASE_URL}/notices/${id}`, { headers: authHeaders() })
  return res.data
}

export async function deleteNotice(id: number) {
  await axios.delete(`${API_BASE_URL}/notices/${id}`, { headers: authHeaders() })
}

/** Create (POST /notices) or update (POST /notices/{id} with _method=PUT already in the form). */
export async function saveNotice(form: FormData, id?: number) {
  const url = id ? `${API_BASE_URL}/notices/${id}` : `${API_BASE_URL}/notices`
  const res = await axios.post(url, form, { headers: authHeaders() })
  return res.data as { success?: boolean; data?: Notice; message?: string }
}
