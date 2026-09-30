import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy FeeComponent / FeeEditModal.
const opts = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' } })

export type FeeStudent = { id: number; name: string; email: string; tenant_id: number; student_profile?: { class?: string | number; subjects?: (string | number)[]; phone?: string } | null }
export type StudentFee = {
  id: number
  student_id: number
  tenant_id: number
  from_date: string
  to_date: string
  amount: string | number
  payment_mode: string
  notes?: string | null
  submitted_on: string
  created_at: string
  student?: FeeStudent
}
export type FeesMeta = { count: number; total_amount: number; students_count: number }
export type FeeHistoryRow = { id: number; from_date: string; to_date: string; paid_at?: string | null; amount: number; status?: string; payment_mode?: string; notes?: string | null }
export type FeePayload = { student_id: number; from_date: string; to_date: string; amount: number; payment_mode: string; submitted_on: string; notes: string | null }

export async function fetchFeeStudents(): Promise<FeeStudent[]> {
  const res = await axios.get(`${API_BASE_URL}/students`, opts())
  return res.data.success ? res.data.data || [] : []
}

/** Fees *submitted* in the month; all students unless one is selected. */
export async function fetchFees(month: string, studentId: number | ''): Promise<{ fees: StudentFee[]; meta: FeesMeta | null } | undefined> {
  const params: Record<string, string> = {}
  if (month) params.month = month
  if (studentId) params.student_id = String(studentId)
  const res = await axios.get(`${API_BASE_URL}/student-fees`, { params, ...opts() })
  return res.data.success ? { fees: res.data.data || [], meta: res.data.meta ?? null } : undefined
}

export async function suggestFeePeriod(studentId: number): Promise<{ from: string; to: string } | null> {
  const res = await axios.get(`${API_BASE_URL}/students/${studentId}/fees/suggest-period`, opts())
  return res.data?.success ? { from: res.data.from_date || '', to: res.data.to_date || '' } : null
}

/** Legacy: a 403 just shows the empty state. */
export async function fetchStudentFeeHistory(studentId: number): Promise<{ items: FeeHistoryRow[]; error: string | null }> {
  try {
    const res = await axios.get(`${API_BASE_URL}/students/${studentId}/fees?limit=10`, opts())
    return res.data?.success && Array.isArray(res.data.items) ? { items: res.data.items, error: null } : { items: [], error: 'Unable to load fees history.' }
  } catch (e) {
    return { items: [], error: axios.isAxiosError(e) && e.response?.status === 403 ? null : 'Unable to load fees history.' }
  }
}

export async function createFee(payload: FeePayload): Promise<boolean> {
  const res = await axios.post(`${API_BASE_URL}/student-fees`, payload, opts())
  return !!res.data.success
}

export async function updateFee(id: number, payload: FeePayload): Promise<void> {
  await axios.put(`${API_BASE_URL}/student-fees/${id}`, payload, opts())
}
