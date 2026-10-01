import { z } from 'zod'
import { requiredText } from '@/lib/validation'
import type { Chapter, ChapterPayload, Topic, TopicPayload } from '../services/contentLibraryService'

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

/** Backend: subject_id required|exists; name required|string|max:255, unique per tenant + subject. */
export const chapterSchema = z.object({
  subject_id: z.string().min(1, 'Select a subject.'),
  name: requiredText('Chapter name', 255),
})
export type ChapterValues = z.infer<typeof chapterSchema>

export const chapterDefaults = (c?: Chapter | null, subjectId = ''): ChapterValues => ({ subject_id: c ? String(c.subject_id) : subjectId, name: c?.name ?? '' })
export const toChapterPayload = (v: ChapterValues): ChapterPayload => ({ subject_id: v.subject_id, name: v.name })

/**
 * Backend: subject_id required; chapter_id nullable but must belong to that
 * subject; grade nullable|integer|1..12; name required|max:255, unique per
 * tenant + subject + grade; explanation_html nullable|string.
 */
export const topicSchema = z.object({
  subject_id: z.string().min(1, 'Select a subject.'),
  chapter_id: z.string(),
  grade: z.string().refine((g): boolean => g === '' || (Number.isInteger(Number(g)) && Number(g) >= 1 && Number(g) <= 12), 'Choose a grade between 1 and 12.'),
  name: requiredText('Topic name', 255),
  explanation_html: z.string(),
})
export type TopicValues = z.infer<typeof topicSchema>

export const topicDefaults = (t?: Topic | null, preset: Partial<TopicValues> = {}): TopicValues => ({
  subject_id: t ? String(t.subject_id) : (preset.subject_id ?? ''),
  chapter_id: t?.chapter_id ? String(t.chapter_id) : (preset.chapter_id ?? ''),
  grade: t?.grade ? String(t.grade) : (preset.grade ?? ''),
  name: t?.name ?? '',
  explanation_html: t?.explanation_html ?? '',
})

export const toTopicPayload = (v: TopicValues): TopicPayload => ({
  subject_id: v.subject_id,
  chapter_id: v.chapter_id || null,
  grade: v.grade || null,
  name: v.name,
  explanation_html: v.explanation_html,
})

/** Laravel's unique-rule text, rewritten so it says what to do. */
export function friendlyDuplicate(message: string, what: 'chapter' | 'topic'): string {
  if (!/already been taken/i.test(message)) return message
  return what === 'chapter'
    ? 'Your coaching already has a chapter with this name in this subject.'
    : 'Your coaching already has a topic with this name for this subject and grade.'
}
