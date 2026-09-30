import { z } from 'zod'
import { personFields, todayInputValue } from '@/features/people/schemas/person'
import type { Staff, StaffPayload } from '../services/staffService'

export const staffSchema = (mode: 'create' | 'edit') => z.object({ ...personFields(mode), permissions: z.array(z.string()) })
export type StaffValues = z.infer<ReturnType<typeof staffSchema>>

export function staffDefaults(member: Staff | null): StaffValues {
  return member
    ? { name: member.name, email: member.email, password: '', dob: (member.dob || '').slice(0, 10), gender: (member.gender || '') as StaffValues['gender'], permissions: member.permissions ?? [] }
    : // Legacy: DOB pre-filled with today on create.
      { name: '', email: '', password: '', dob: todayInputValue(), gender: '' as StaffValues['gender'], permissions: [] }
}

/** Legacy body: create sends password; edit sends it only when typed (undefined → omitted). */
export function toStaffPayload(v: StaffValues, mode: 'create' | 'edit'): StaffPayload {
  return {
    name: v.name,
    email: v.email,
    password: mode === 'create' ? v.password : v.password || undefined,
    dob: v.dob,
    gender: v.gender,
    permissions: v.permissions,
  }
}
