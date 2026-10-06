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

// ---- StudentsPage ----------------------------------------------------------
const opts = () => ({ headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' } })

export type StudentProfile = { class: number | null; grade?: number | null; subjects: number[]; phone: string }
export type Student = {
  id: number
  name: string
  email: string
  tenant_id: number
  current_class_id?: number | null
  current_class_name?: string | null
  student_profile?: StudentProfile | null
  dob?: string | null
  gender?: string | null
  created_at?: string | null
  status?: string | null
  /** Day the student actually started (fee trial counts from it). */
  joined_date?: string | null
  /** Any fee recorded → joining date is locked on Edit Student. */
  fees_recorded?: boolean
}
export type YearOption = { id: number; name: string; is_current: boolean }
export type ClassOption = { id: number; name: string }
export type SubjectOption = { id: number; subject: string }
/** Exactly the legacy StudentForm object that was POSTed/PUT as-is. */
export type StudentPayload = {
  name: string
  email: string
  password: string
  class: number | ''
  grade: number | ''
  subjects: number[]
  phone: string
  dob: string
  gender: string
  joining_date: string
}

export async function fetchYearOptions(): Promise<YearOption[]> {
  const res = await axios.get(`${API_BASE_URL}/academic-years`, opts())
  return res.data?.success && Array.isArray(res.data.data) ? res.data.data : []
}

/** Legacy StudentsPage checked `status` (not `success`) here. */
export async function fetchSubjectOptions(): Promise<SubjectOption[]> {
  const res = await axios.get(`${API_BASE_URL}/subjects/${localStorage.getItem('tenant_id')}`, opts())
  return res.data.status ? res.data.data : []
}

export async function fetchClassOptions(): Promise<ClassOption[]> {
  const res = await axios.get(`${API_BASE_URL}/classes/${localStorage.getItem('tenant_id')}`, opts())
  return res.data.success ? res.data.data : []
}

/** Teachers see their own students; the status param is admin-only and only when not 'active'. */
export async function fetchStudents(args: { role: string; yearId: number | ''; status: 'active' | 'inactive' | 'all' }): Promise<Student[] | undefined> {
  const url = args.role === 'teacher' ? `${API_BASE_URL}/teachers/students` : `${API_BASE_URL}/students`
  const params: Record<string, string | number> = {}
  if (args.yearId) params.academic_year_id = args.yearId
  if (args.role === 'coaching_admin' && args.status !== 'active') params.status = args.status
  const res = await axios.get(url, { ...opts(), params })
  if (!res.data.success) return undefined
  return Array.isArray(res.data.data) ? res.data.data : []
}

export async function createStudent(payload: StudentPayload): Promise<Student | null> {
  const res = await axios.post(`${API_BASE_URL}/students`, payload, opts())
  return res.data.success ? res.data.data : null
}

export async function updateStudent(id: number, payload: StudentPayload): Promise<Student | null> {
  const res = await axios.put(`${API_BASE_URL}/students/${id}`, payload, opts())
  return res.data.success ? res.data.data : null
}

export async function deleteStudent(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/students/${id}`, opts())
}

export async function promoteStudent(id: number, toYearId: number, toClassId: number): Promise<void> {
  await axios.post(`${API_BASE_URL}/students/${id}/promote`, { to_academic_year_id: toYearId, to_class_id: toClassId }, opts())
}

/** Returns the new status reported by the API (default 'active', as before). */
export async function reactivateStudent(id: number, body: { rejoinedDate: string; yearId: number | ''; classId: number | '' }): Promise<string> {
  const res = await axios.post(
    `${API_BASE_URL}/students/${id}/reactivate`,
    { rejoined_date: body.rejoinedDate || undefined, academic_year_id: body.yearId || undefined, class_id: body.classId || undefined },
    opts(),
  )
  return res.data?.data?.student?.status ?? 'active'
}
