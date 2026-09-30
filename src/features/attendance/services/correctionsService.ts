import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy CorrectionsAdminPage.
const opts = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' } })

export type CorrectionFilter = 'pending' | 'approved' | 'rejected' | ''
export type CorrectionItem = {
  id: number
  attendance_date: string
  current_status?: 'present' | 'absent' | 'leave' | 'not_marked' | null
  requested_status: 'present' | 'absent' | 'leave'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  user?: { id: number; name: string; role: string; profile_img?: string | null }
}

export async function fetchCorrections(status: CorrectionFilter): Promise<CorrectionItem[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  const res = await axios.get(`${API_BASE_URL}/admin/attendance-corrections?${params.toString()}`, opts())
  return res.data.data || []
}

export async function decideCorrection(id: number, approved: boolean, adminComment: string) {
  await axios.patch(`${API_BASE_URL}/admin/attendance-corrections/${id}`, { approved, admin_comment: adminComment }, opts())
}
