import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

export type SearchUser = { id: number; name: string; email: string; tenant_id: number; profile_image?: string | null; student_profile?: { class?: string; phone?: string } | null }
export type SearchEnquiry = { id: number; name: string; contact_number: string | null; email: string | null; enquiry_type: string; status: string }
export type SearchData = {
  students: SearchUser[]
  teachers: SearchUser[]
  subjects: { id: number; subject: string }[]
  classes: { id: number; name: string }[]
  enquiries: SearchEnquiry[]
}

/** Same request as the legacy SearchResultsPage. */
export async function searchAll(q: string): Promise<SearchData> {
  const token = localStorage.getItem('authToken')
  if (!token) throw new Error('You are not authenticated.')
  const res = await axios.get<{ success: boolean; data: SearchData }>(`${API_BASE_URL}/search`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    params: { q },
  })
  if (!res.data.success) throw new Error('Unable to load search results.')
  return res.data.data
}
