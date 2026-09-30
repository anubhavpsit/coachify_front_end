import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy components.
const token = () => localStorage.getItem('authToken')

export type TeacherOption = { id: number; name: string; email: string }

/** AssignTeachersModal: GET /teachers */
export async function fetchTeachers(): Promise<TeacherOption[] | undefined> {
  const res = await axios.get(`${API_BASE_URL}/teachers`, {
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' },
  })
  return res.data.success ? res.data.data : undefined
}

/** AssignTeachersModal: POST /students/{id}/assign-teachers { teacher_ids } */
export async function assignTeachers(studentId: number, teacherIds: number[]): Promise<void> {
  await axios.post(
    `${API_BASE_URL}/students/${studentId}/assign-teachers`,
    { teacher_ids: teacherIds },
    { headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' } },
  )
}

/** GhostStudentsCard: POST /students/{id}/mark-inactive */
export async function markStudentInactive(studentId: number): Promise<void> {
  await axios.post(`${API_BASE_URL}/students/${studentId}/mark-inactive`, {}, { headers: { Authorization: `Bearer ${token()}` } })
}
