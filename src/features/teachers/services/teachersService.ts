import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy TeachersPage.
const opts = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' } })

export type Teacher = { id: number; name: string; email: string; phone?: string | null; tenant_id: number; dob?: string | null; gender?: string | null }
export type TeacherPayload = { name: string; email: string; phone: string | null; password?: string; dob: string; gender: string }

/** Students see their assigned teachers; everyone else the full list (unchanged). */
export async function fetchTeachersFor(role: string | undefined): Promise<Teacher[] | undefined> {
  const url = role === 'student' ? `${API_BASE_URL}/students/teachers` : `${API_BASE_URL}/teachers`
  const res = await axios.get(url, opts())
  return res.data.success ? res.data.data : undefined
}

export async function createTeacher(payload: TeacherPayload): Promise<Teacher | null> {
  const res = await axios.post(`${API_BASE_URL}/teachers`, payload, opts())
  return res.data.success ? res.data.data : null
}

export async function updateTeacher(id: number, payload: TeacherPayload): Promise<boolean> {
  const res = await axios.put(`${API_BASE_URL}/teachers/${id}`, payload, opts())
  return !!res.data.success
}

export async function deleteTeacher(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/teachers/${id}`, opts())
}
