import { z } from 'zod'
import { personFields, todayInputValue } from '@/features/people/schemas/person'
import { optionalPhone } from '@/lib/validation'
import type { Teacher, TeacherPayload } from '../services/teachersService'

export const teacherSchema = (mode: 'create' | 'edit') => z.object({ ...personFields(mode), phone: optionalPhone() })
export type TeacherValues = z.infer<ReturnType<typeof teacherSchema>>

export function teacherDefaults(t: Teacher | null): TeacherValues {
  return t
    ? { name: t.name, email: t.email, phone: t.phone ?? '', password: '', dob: (t.dob || '').slice(0, 10), gender: (t.gender || '') as TeacherValues['gender'] }
    : // Legacy: DOB pre-filled with today on create.
      { name: '', email: '', phone: '', password: '', dob: todayInputValue(), gender: '' as TeacherValues['gender'] }
}

/** Legacy body: phone trimmed or null; edit omits a blank password. */
export function toTeacherPayload(v: TeacherValues, mode: 'create' | 'edit'): TeacherPayload {
  return {
    name: v.name,
    email: v.email,
    phone: v.phone.trim() || null,
    password: mode === 'create' ? v.password : v.password || undefined,
    dob: v.dob,
    gender: v.gender,
  }
}
