import DOMPurify from 'dompurify'
import { z } from 'zod'
import type { Question, QuestionPayload } from '../services/contentLibraryService'

export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)
export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
export const QUESTION_TYPES = [
  { value: '', label: 'Not set' },
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank' },
  { value: 'match_the_following', label: 'Match the Following' },
] as const
export const SUBJECTIVE_TYPES = ['short_answer', 'long_answer', 'fill_in_the_blank', 'match_the_following']
export const typeLabel = (t: string | null) => QUESTION_TYPES.find((x) => x.value === (t ?? ''))?.label ?? '-'

/** Backend: image mimes:jpeg,jpg,png,webp|max:5120 (KB). */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export function imageProblem(f: File): string | null {
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(f.name.split('.').pop()?.toLowerCase() ?? '')) return 'Only JPG, PNG or WebP images.'
  if (f.size > 5 * 1024 * 1024) return 'Image is larger than 5 MB.'
  return null
}

/** Visible text of rich HTML (sanitised before parsing). */
export function htmlText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = DOMPurify.sanitize(html || '')
  return (el.textContent || '').trim()
}

const opt = z.string().max(255, 'Keep options under 255 characters.')

/**
 * Mirrors Admin\QuestionController::validateQuestion: grade 1–12 required, question required,
 * difficulty/type enums, MCQ needs A–D + a/b/c/d, True/False needs true/false, written types need an answer key,
 * image note ≤ 255. Also: options must differ (stricter than the API).
 */
export const questionSchema = z
  .object({
    grade: z.string().min(1, 'Select a grade.'),
    difficulty: z.string(),
    questionType: z.string(),
    questionHtml: z.string().refine((h): boolean => htmlText(h).length > 0 || /<img\b/i.test(h), 'Write the question.'),
    solutionHtml: z.string(),
    optionA: opt,
    optionB: opt,
    optionC: opt,
    optionD: opt,
    correctAnswer: z.string(),
    answerKey: z.string(),
    needsImage: z.boolean(),
    imageNote: z.string().max(255, 'Keep the note under 255 characters.'),
  })
  .superRefine((v, ctx) => {
    if (v.questionType === 'mcq') {
      const opts = { optionA: v.optionA, optionB: v.optionB, optionC: v.optionC, optionD: v.optionD }
      const seen = new Map<string, string>()
      for (const [k, val] of Object.entries(opts)) {
        const t = val.trim()
        if (!t) ctx.addIssue({ code: 'custom', path: [k], message: `Enter option ${k.slice(-1)}.` })
        else if (seen.has(t.toLowerCase())) ctx.addIssue({ code: 'custom', path: [k], message: `Same as option ${seen.get(t.toLowerCase())}.` })
        else seen.set(t.toLowerCase(), k.slice(-1))
      }
      if (!['a', 'b', 'c', 'd'].includes(v.correctAnswer)) ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: 'Mark the correct option.' })
    }
    if (v.questionType === 'true_false' && !['true', 'false'].includes(v.correctAnswer)) ctx.addIssue({ code: 'custom', path: ['correctAnswer'], message: 'Choose True or False.' })
    if (SUBJECTIVE_TYPES.includes(v.questionType) && !v.answerKey.trim()) ctx.addIssue({ code: 'custom', path: ['answerKey'], message: 'Add the answer key.' })
  })
export type QuestionValues = z.infer<typeof questionSchema>

export const questionDefaults = (q?: Question | null, grade = ''): QuestionValues => ({
  grade: q ? String(q.grade) : grade,
  difficulty: q?.difficulty ?? '',
  questionType: q?.question_type ?? '',
  questionHtml: q?.question_html ?? '',
  solutionHtml: q?.solution_html ?? '',
  optionA: q?.option_a ?? '',
  optionB: q?.option_b ?? '',
  optionC: q?.option_c ?? '',
  optionD: q?.option_d ?? '',
  correctAnswer: q?.correct_answer ?? '',
  answerKey: q?.answer_key ?? '',
  needsImage: q?.needs_image ?? false,
  imageNote: q?.image_note ?? '',
})

export const toQuestionPayload = (f: QuestionValues): QuestionPayload => ({
  grade: f.grade,
  difficulty: f.difficulty || null,
  question_type: f.questionType || null,
  question_html: f.questionHtml,
  solution_html: f.solutionHtml || null,
  option_a: f.questionType === 'mcq' ? f.optionA : null,
  option_b: f.questionType === 'mcq' ? f.optionB : null,
  option_c: f.questionType === 'mcq' ? f.optionC : null,
  option_d: f.questionType === 'mcq' ? f.optionD : null,
  correct_answer: f.questionType === 'mcq' || f.questionType === 'true_false' ? f.correctAnswer : null,
  answer_key: SUBJECTIVE_TYPES.includes(f.questionType) ? f.answerKey : null,
  needs_image: f.needsImage,
  image_note: f.imageNote || null,
})
