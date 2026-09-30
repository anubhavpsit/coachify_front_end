import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy Subjects / Classes / Academic Years pages.
const token = () => localStorage.getItem('authToken')
const tenantId = () => localStorage.getItem('tenant_id')
const withAccept = () => ({ headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' } })
const authOnly = () => ({ headers: { Authorization: `Bearer ${token()}` } })

// ---- Subjects ---------------------------------------------------------------
export type Subject = { id: number; subject: string; tenant_id: number }

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await axios.get(`${API_BASE_URL}/subjects/${tenantId()}`, withAccept())
  return res.data.success || res.data.status ? res.data.data || res.data.subjects || [] : []
}

/** Returns the created subject, or null if the API didn't report success. */
export async function createSubject(subject: string): Promise<Subject | null> {
  const res = await axios.post(`${API_BASE_URL}/subjects`, { subject }, withAccept())
  return res.data.success || res.data.status ? res.data.data : null
}

export async function updateSubject(id: number, subject: string): Promise<boolean> {
  const res = await axios.put(`${API_BASE_URL}/subjects/${id}`, { subject }, withAccept())
  return !!(res.data.success || res.data.status)
}

export async function deleteSubject(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/subjects/${id}`, withAccept())
}

// ---- Classes ----------------------------------------------------------------
export type CoachingClass = { id: number; name: string; tenant_id: number }

export async function fetchClassList(): Promise<CoachingClass[]> {
  const res = await axios.get(`${API_BASE_URL}/classes/${tenantId()}`, authOnly())
  return res.data.data || []
}

export async function createClass(name: string): Promise<void> {
  // Legacy sent tenant_id straight from localStorage (a string); kept as-is.
  await axios.post(`${API_BASE_URL}/classes`, { name, tenant_id: tenantId() }, authOnly())
}

export async function updateClass(id: number, name: string): Promise<void> {
  await axios.put(`${API_BASE_URL}/classes/${id}`, { name }, authOnly())
}

export async function deleteClass(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/classes/${id}`, authOnly())
}

// ---- Academic years ---------------------------------------------------------
export type AcademicYear = { id: number; name: string; starts_on: string; ends_on: string; is_current: boolean }
export type AcademicYearPayload = { name: string; starts_on: string; ends_on: string; is_current: boolean }

export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  const res = await axios.get(`${API_BASE_URL}/academic-years`, withAccept())
  return res.data?.success && Array.isArray(res.data?.data) ? res.data.data : []
}

export async function createAcademicYear(payload: AcademicYearPayload): Promise<void> {
  await axios.post(`${API_BASE_URL}/academic-years`, payload, withAccept())
}

export async function updateAcademicYear(id: number, payload: AcademicYearPayload): Promise<void> {
  await axios.put(`${API_BASE_URL}/academic-years/${id}`, payload, withAccept())
}

export async function setCurrentAcademicYear(id: number): Promise<void> {
  await axios.patch(`${API_BASE_URL}/academic-years/${id}/current`, {}, withAccept())
}
