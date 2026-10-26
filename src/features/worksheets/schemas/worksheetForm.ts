import { z } from 'zod'
import type { AutoPick, Worksheet, WorksheetMeta } from '../services/worksheetsService'

/** Worksheet::MIN_QUESTIONS / MAX_QUESTIONS */
export const MIN_QUESTIONS = 50
export const MAX_QUESTIONS = 100

/** Mirrors WorksheetController::validateMeta + the create-time auto-pick. */
export const worksheetSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(150, 'Title must be at most 150 characters.'),
  subject_id: z.string().min(1, 'Select a subject.'),
  class_id: z.string(),
  topic_ids: z.array(z.number()).min(1, 'Pick at least one topic.').max(10, 'Pick at most 10 topics.'),
  instructions: z.string().max(2000, 'Instructions must be at most 2000 characters.'),
  layout: z.enum(['standard', 'compact']),
  show_marks: z.boolean(),
  // A new worksheet always starts with 50–100 auto-picked questions.
  auto_count: z.number({ error: 'Enter a number.' }).int().min(MIN_QUESTIONS, `At least ${MIN_QUESTIONS} questions.`).max(MAX_QUESTIONS, `At most ${MAX_QUESTIONS} questions.`),
  difficulty: z.enum(['mix', 'easy', 'medium', 'hard']),
  types: z.array(z.string()),
})
export type WorksheetValues = z.infer<typeof worksheetSchema>

export const DEFAULT_INSTRUCTIONS = 'Answer all questions. Write neatly in the space given.'

export function worksheetDefaults(w: Worksheet | null): WorksheetValues {
  return {
    title: w?.title ?? '',
    subject_id: w ? String(w.subject_id) : '',
    class_id: w?.class_id ? String(w.class_id) : '',
    topic_ids: w?.topic_ids ?? [],
    instructions: w ? (w.instructions ?? '') : DEFAULT_INSTRUCTIONS,
    layout: w?.layout ?? 'standard',
    show_marks: w?.show_marks ?? false,
    auto_count: MIN_QUESTIONS,
    difficulty: 'mix',
    types: [],
  }
}

export function toMeta(v: WorksheetValues): WorksheetMeta {
  return {
    title: v.title.trim(),
    class_id: v.class_id ? Number(v.class_id) : null,
    topic_ids: v.topic_ids,
    instructions: v.instructions.trim() || null,
    layout: v.layout,
    show_marks: v.show_marks,
  }
}

export const toAutoPick = (v: WorksheetValues): AutoPick => ({ count: v.auto_count, difficulty: v.difficulty, types: v.types })

export const WORKSHEET_FIELDS = ['title', 'subject_id', 'class_id', 'topic_ids', 'instructions', 'layout', 'show_marks'] as const
