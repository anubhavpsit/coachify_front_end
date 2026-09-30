import { z } from 'zod'
import { personFields } from '@/features/people/schemas/person'
import type { Student, StudentPayload } from '../services/studentsService'
import { normalizeSubjectIds } from '../lib/studentRows'

/**
 * StudentController: name/email/password(create min, D4 → 8)/dob/gender as
 * PersonFields; grade nullable|integer|1..12; subjects array; phone
 * nullable|string|max:20 (no pattern on the backend, so none here — the
 * field only shows an advisory hint).
 */
export const studentSchema = (mode: 'create' | 'edit') =>
  z.object({
    ...personFields(mode),
    class: z.union([z.number().int().positive(), z.literal('')]),
    grade: z.union([z.number().int().min(1, 'Grade must be between 1 and 12.').max(12, 'Grade must be between 1 and 12.'), z.literal('')]),
    subjects: z.array(z.number().int()),
    phone: z.string().trim().max(20, 'Phone must be at most 20 characters.'),
  })
export type StudentValues = z.infer<ReturnType<typeof studentSchema>>

export function studentDefaults(s: Student | null): StudentValues {
  if (!s) return { name: '', email: '', password: '', class: '', grade: '', subjects: [], phone: '', dob: '', gender: '' as StudentValues['gender'] }
  // Prefer the resolved current_class_id for the selected/current academic year (legacy).
  const cls = s.current_class_id ?? (typeof s.student_profile?.class === 'number' ? s.student_profile.class : null)
  return {
    name: s.name,
    email: s.email,
    password: '',
    class: cls || '',
    grade: typeof s.student_profile?.grade === 'number' ? s.student_profile.grade : '',
    // Normalised so saved subjects show as ticked and re-ticking can't add a duplicate.
    subjects: normalizeSubjectIds(s.student_profile?.subjects),
    phone: s.student_profile?.phone || '',
    dob: (s.dob || '').slice(0, 10),
    gender: (s.gender || '') as StudentValues['gender'],
  }
}

/** The legacy page POSTed/PUT its whole form object; same keys and value types. */
export function toStudentPayload(v: StudentValues): StudentPayload {
  return { name: v.name, email: v.email, password: v.password, class: v.class, grade: v.grade, subjects: v.subjects, phone: v.phone, dob: v.dob, gender: v.gender }
}

export const STUDENT_FIELDS = ['name', 'email', 'password', 'dob', 'gender', 'class', 'grade', 'subjects', 'phone'] as const
