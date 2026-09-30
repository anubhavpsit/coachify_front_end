import type { ClassOption, Student, StudentProfile, SubjectOption } from '../services/studentsService'

// Pure ports of the legacy StudentsPage helpers.

const ts = (s: Student) => {
  if (!s.created_at) return 0
  const t = Date.parse(s.created_at)
  return Number.isNaN(t) ? 0 : t
}

export const sortByCreatedAtDesc = (list: Student[]) => [...list].sort((a, b) => ts(b) - ts(a))

export type StudentFallback = { classId: number | null; grade: number | null; subjects: number[]; phone: string; createdAt?: string }

/** Fill gaps in an API student with what was just submitted (the API may omit profile fields). */
export function enrichStudent(student: Student, fb: StudentFallback): Student {
  const p = student.student_profile
  return {
    ...student,
    created_at: student.created_at ?? fb.createdAt ?? new Date().toISOString(),
    student_profile: {
      ...(p ?? {}),
      class: typeof p?.class === 'number' ? p.class : fb.classId,
      grade: typeof p?.grade === 'number' ? p.grade : fb.grade,
      subjects: Array.isArray(p?.subjects) && p.subjects.length > 0 ? p.subjects : fb.subjects,
      phone: typeof p?.phone === 'string' && p.phone.trim().length > 0 ? p.phone : fb.phone,
    } as StudentProfile,
  }
}

export const studentClassId = (s: Student) => s.current_class_id ?? s.student_profile?.class ?? null

export function classLabelFor(s: Student, classes: ClassOption[]): string {
  // Legacy compared loosely (ids may arrive as strings).
  const found = classes.find((c) => c.id == studentClassId(s))
  if (found) return found.name
  return typeof s.current_class_name === 'string' && s.current_class_name.trim() !== '' ? s.current_class_name : '-'
}

export function subjectNamesFor(s: Student, subjects: SubjectOption[]): string[] {
  return (s.student_profile?.subjects ?? []).map((id) => subjects.find((x) => x.id === id)?.subject).filter((n): n is string => !!n)
}

export function filterStudents(list: Student[], search: string, classId: number | ''): Student[] {
  const q = search.trim().toLowerCase()
  return list.filter((s) => {
    if (!s) return false
    if (q && !s.name.toLowerCase().includes(q)) return false
    if (classId !== '' && studentClassId(s) !== classId) return false
    return true
  })
}
