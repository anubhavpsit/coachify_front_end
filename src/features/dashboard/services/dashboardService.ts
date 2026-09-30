import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import type { DashboardStats, TopStudent } from '../types'

// Same URLs and headers as the pre-refactor DashboardPage.

export async function fetchDashboardStats(token: string) {
  const response = await axios.get<{ success: boolean; data: DashboardStats }>(`${API_BASE_URL}/dashboard/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  return response.data
}

export async function fetchTopStudents(token: string) {
  const response = await axios.get<{ success: boolean; data: TopStudent[] }>(`${API_BASE_URL}/dashboard/assessments/top-students`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}
