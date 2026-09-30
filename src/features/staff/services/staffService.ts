import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy StaffPage.
const opts = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' } })

export type Staff = { id: number; name: string; email: string; tenant_id: number; dob?: string | null; gender?: string | null; permissions?: string[] }
export type PermissionGroup = { group: string; permissions: { key: string; label: string }[] }
export type StaffPayload = { name: string; email: string; password?: string; dob: string; gender: string; permissions: string[] }

export async function fetchStaff(): Promise<Staff[] | undefined> {
  const res = await axios.get(`${API_BASE_URL}/staff`, opts())
  return res.data.success ? res.data.data : undefined
}

export async function fetchPermissionCatalog(): Promise<PermissionGroup[] | undefined> {
  const res = await axios.get(`${API_BASE_URL}/staff/permissions/catalog`, opts())
  return res.data.success ? res.data.data : undefined
}

export async function fetchStaffPermissions(id: number): Promise<string[] | undefined> {
  const res = await axios.get(`${API_BASE_URL}/staff/${id}/permissions`, opts())
  return res.data.success ? (res.data.data.permissions ?? []) : undefined
}

/** Returns the created member (legacy appended response.data.data), or null if !success. */
export async function createStaff(payload: StaffPayload): Promise<Staff | null> {
  const res = await axios.post(`${API_BASE_URL}/staff`, payload, opts())
  return res.data.success ? res.data.data : null
}

export async function updateStaff(id: number, payload: StaffPayload): Promise<boolean> {
  const res = await axios.put(`${API_BASE_URL}/staff/${id}`, payload, opts())
  return !!res.data.success
}

export async function deleteStaff(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/staff/${id}`, opts())
}
