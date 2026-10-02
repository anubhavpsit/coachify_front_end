import { z } from 'zod'
import { requiredText } from '@/lib/validation'
import type { CreatePayload, ResultPayload } from '../services/assessmentsService'

/** Backend store(): title required|max:255; subject required; class nullable; total_marks required|integer|min:1; scheduled_date nullable|date. */
export const DESCRIPTION_MAX = 2000
export const createSchema = z.object({
  title: requiredText('Title', 255),
  subject_id: z.string().min(1, 'Select a subject.'),
  class_id: z.string(),
  total_marks: z
    .string()
    .min(1, 'Enter the total marks.')
    .refine((v): boolean => /^\d+$/.test(v.trim()), 'Use a whole number.')
    .refine((v): boolean => Number(v) >= 1, 'Total marks must be at least 1.')
    .refine((v): boolean => Number(v) <= 1000, 'Total marks must be 1000 or less.'),
  scheduled_date: z.string().refine((v): boolean => v === '' || !Number.isNaN(Date.parse(v)), 'Enter a valid date.'),
  description: z.string().max(DESCRIPTION_MAX, `Keep the description under ${DESCRIPTION_MAX} characters.`),
})
export type CreateValues = z.infer<typeof createSchema>
export const createDefaults = (): CreateValues => ({ title: '', subject_id: '', class_id: '', total_marks: '', scheduled_date: '', description: '' })

export const toCreatePayload = (v: CreateValues): CreatePayload => ({
  title: v.title,
  description: v.description || null,
  subject_id: Number(v.subject_id),
  class_id: v.class_id ? Number(v.class_id) : null,
  total_marks: Number(v.total_marks),
  scheduled_date: v.scheduled_date || null,
})

/** Backend: mimes:jpeg,jpg,png,webp,pdf|max:20480 (KB) for assessment files and answer sheets. */
export const FILE_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'
export const FILE_MAX_BYTES = 20 * 1024 * 1024
export function fileProblem(f: File): string | null {
  const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
  if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) return 'Only JPG, PNG, WebP or PDF files.'
  if (f.size > FILE_MAX_BYTES) return 'File is larger than 20 MB.'
  if (f.size === 0) return 'File is empty.'
  return null
}

export type ResultRow = { student_id: number; student_name: string; marks_obtained: string; total_marks: string; teacher_notes: string; answerFile: File | null }

/**
 * Backend: marks_obtained required|numeric|min:0; total_marks nullable|numeric|min:1.
 * Also: marks can't exceed the total (the API doesn't check this). Empty marks = skip the row (legacy).
 */
export function resultRowErrors(r: ResultRow): Partial<Record<'marks_obtained' | 'total_marks' | 'answerFile', string>> {
  const e: Partial<Record<'marks_obtained' | 'total_marks' | 'answerFile', string>> = {}
  const total = r.total_marks.trim() === '' ? null : Number(r.total_marks)
  if (total !== null && (Number.isNaN(total) || total < 1)) e.total_marks = 'At least 1.'
  if (r.marks_obtained.trim() !== '') {
    const m = Number(r.marks_obtained)
    if (Number.isNaN(m) || m < 0) e.marks_obtained = 'Must be 0 or more.'
    else if (total !== null && !Number.isNaN(total) && m > total) e.marks_obtained = `Can't be more than ${total}.`
  }
  if (r.answerFile) {
    const p = fileProblem(r.answerFile)
    if (p) e.answerFile = p
  }
  return e
}

export const toResultPayloads = (rows: ResultRow[]): ResultPayload[] =>
  rows
    .filter((r) => r.marks_obtained !== '')
    .map((r) => ({
      student_id: r.student_id,
      marks_obtained: Number(r.marks_obtained),
      total_marks: r.total_marks ? Number(r.total_marks) : undefined,
      teacher_notes: r.teacher_notes || undefined,
    }))
