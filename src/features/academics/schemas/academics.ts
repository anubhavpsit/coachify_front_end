import { z } from 'zod'
import { requiredText } from '@/lib/validation'
import type { AcademicYear, AcademicYearPayload } from '../services/academicsService'

// Mirrors the Laravel rules (UI_AUDIT §6, F10–F12).

/** SubjectController: subject required|string|max:255 */
export const subjectSchema = z.object({ subject: requiredText('Subject name', 255) })
export type SubjectValues = z.infer<typeof subjectSchema>

/** CoachingClassController: name required|string|max:255 (legacy UI had no validation) */
export const classSchema = z.object({ name: requiredText('Class name', 255) })
export type ClassValues = z.infer<typeof classSchema>

/** AcademicYearController: name required|max:100, starts_on required|date, ends_on required|date|after:starts_on */
export const academicYearSchema = z
  .object({
    name: requiredText('Name', 100),
    starts_on: z.string().min(1, 'Start date is required.'),
    ends_on: z.string().min(1, 'End date is required.'),
    is_current: z.boolean(),
  })
  .refine((v) => !v.starts_on || !v.ends_on || v.ends_on > v.starts_on, { path: ['ends_on'], message: 'End date must be after the start date.' })
export type AcademicYearValues = z.infer<typeof academicYearSchema>

export function academicYearDefaults(y?: AcademicYear | null): AcademicYearValues {
  return y
    ? { name: y.name, starts_on: y.starts_on?.slice(0, 10), ends_on: y.ends_on?.slice(0, 10), is_current: !!y.is_current }
    : { name: '', starts_on: '', ends_on: '', is_current: false }
}

/** Same JSON body (and key order) as the legacy form. */
export function toAcademicYearPayload(v: AcademicYearValues): AcademicYearPayload {
  return { name: v.name, starts_on: v.starts_on, ends_on: v.ends_on, is_current: v.is_current }
}

/** Suggests "2026-2027" style names from the start date (Indian academic year). */
export function suggestYearName(startsOn: string): string {
  const y = Number(startsOn.slice(0, 4))
  return Number.isFinite(y) && y > 1900 ? `${y}-${y + 1}` : ''
}
