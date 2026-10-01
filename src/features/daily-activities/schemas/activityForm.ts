import { z } from 'zod'
import { toDateInputValue } from '@/utils/date'
import type { ActivityPayload, ActivityRecord, BatchPayload, HomeworkStatus } from '../services/dailyActivitiesService'

/** Backend: attachments.* / file → mimes:jpeg,jpg,png,webp,pdf|max:10240 (KB). */
export const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf'
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'pdf']

/** Notes / homework are TEXT columns; cap them at something a teacher would never need to exceed. */
export const TEXT_MAX = 2000

/** Returns a reason the file can't be uploaded, or null. */
export function attachmentProblem(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXT.includes(ext)) return `${file.name}: only JPG, PNG, WebP or PDF files can be attached.`
  if (file.size > ATTACHMENT_MAX_BYTES) return `${file.name} is larger than 10 MB.`
  if (file.size === 0) return `${file.name} is empty.`
  return null
}

export const todayISO = () => toDateInputValue(new Date())
export const yesterdayISO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toDateInputValue(d)
}

/** Backend accepts any date; we also refuse future days (you can't log a lesson that hasn't happened). */
export function dateProblem(value: string): string | null {
  if (!value) return 'Pick the date of the lesson.'
  if (Number.isNaN(Date.parse(value))) return 'Enter a valid date.'
  if (value > todayISO()) return 'The date cannot be in the future.'
  return null
}

const ref = z.object({ id: z.number(), name: z.string() }).nullable()
const topicRef = z.object({ id: z.number(), name: z.string(), chapter_id: z.number().nullable() }).nullable()
const text = (label: string) => z.string().max(TEXT_MAX, `${label} must be ${TEXT_MAX} characters or fewer.`)

/** What was taught: a topic or a few words of notes (an entry with neither tells the student nothing). */
const lessonFields = {
  chapter: ref,
  topic: topicRef,
  chapter_number: z.number().nullable(),
  notes: text('Class notes'),
  homework: text('Homework'),
}

const needsContent = (v: { topic: unknown; notes: string }) => !!v.topic || v.notes.trim().length > 0
const contentMessage = 'Add a topic or a short note about what you taught.'

export const entrySchema = z
  .object({
    key: z.string(),
    id: z.number().nullable(),
    student_id: z.union([z.number(), z.literal('')]).refine((v): boolean => v !== '', 'Select a student.'),
    subject_id: z.union([z.number(), z.literal('')]).refine((v): boolean => v !== '', 'Select a subject.'),
    homework_status: z.enum(['not_done', 'partial', 'done']),
    ...lessonFields,
  })
  .refine(needsContent, { path: ['notes'], message: contentMessage })

export const entriesSchema = z.object({ entries: z.array(entrySchema).min(1, 'Add at least one student.') }).superRefine((v, ctx) => {
  // The backend keeps one record per student + subject + day, so a second entry would silently overwrite the first.
  const seen = new Map<string, number>()
  v.entries.forEach((e, i) => {
    if (e.student_id === '' || e.subject_id === '') return
    const k = `${e.student_id}-${e.subject_id}`
    if (seen.has(k)) {
      ctx.addIssue({
        code: 'custom',
        path: ['entries', i, 'subject_id'],
        message: `Entry ${seen.get(k)! + 1} already covers this student and subject for this day.`,
      })
    } else seen.set(k, i)
  })
})

export type EntryValues = z.infer<typeof entrySchema>
export type EntriesValues = z.infer<typeof entriesSchema>

let keySeq = 0
const newKey = () => `e${++keySeq}`

export function blankEntry(): EntryValues {
  return { key: newKey(), id: null, student_id: '', subject_id: '', chapter: null, topic: null, chapter_number: null, notes: '', homework: '', homework_status: 'not_done' }
}

/** Same lesson for another student (handy when several students had the same class). */
export function duplicateEntry(e: EntryValues): EntryValues {
  return { ...e, key: newKey(), id: null, student_id: '' }
}

export function entryFromRecord(r: ActivityRecord): EntryValues {
  return {
    key: newKey(),
    id: r.id,
    student_id: r.student_id,
    subject_id: r.subject_id,
    chapter: r.chapter_id && r.chapter_model ? { id: r.chapter_id, name: r.chapter_model.name } : null,
    topic: r.topic_id && r.topic_model ? { id: r.topic_id, name: r.topic_model.name, chapter_id: r.topic_model.chapter_id ?? null } : null,
    chapter_number: r.chapter_number ?? null,
    notes: r.notes ?? '',
    homework: r.homework ?? '',
    homework_status: (r.homework_status ?? 'not_done') as HomeworkStatus,
  }
}

export function toActivityPayload(e: EntryValues, date: string): ActivityPayload {
  return {
    id: e.id,
    student_id: e.student_id !== '' ? Number(e.student_id) : undefined,
    subject_id: e.subject_id !== '' ? Number(e.subject_id) : undefined,
    chapter_number: e.chapter_number || null,
    chapter_id: e.chapter?.id || null,
    topic_id: e.topic?.id || null,
    notes: e.notes || null,
    homework: e.homework || null,
    homework_status: e.homework_status ?? undefined,
    activity_date: date || undefined,
  }
}

export const batchSchema = z
  .object({
    class_id: z.string().min(1, 'Select a class.'),
    subject_id: z.string().min(1, 'Select a subject.'),
    ...lessonFields,
    files: z.array(z.instanceof(File)).superRefine((files, ctx) => {
      for (const f of files) {
        const problem = attachmentProblem(f)
        if (problem) ctx.addIssue({ code: 'custom', message: problem })
      }
    }),
  })
  .refine(needsContent, { path: ['notes'], message: contentMessage })

export type BatchValues = z.infer<typeof batchSchema>

export const batchDefaults = (): BatchValues => ({ class_id: '', subject_id: '', chapter: null, topic: null, chapter_number: null, notes: '', homework: '', files: [] })

export function toBatchPayload(v: BatchValues, date: string): BatchPayload {
  return {
    class_id: v.class_id,
    subject_id: v.subject_id,
    chapter_number: v.chapter_number || null,
    chapter_id: v.chapter?.id || null,
    topic_id: v.topic?.id || null,
    notes: v.notes || null,
    homework: v.homework || null,
    activity_date: date || undefined,
  }
}
