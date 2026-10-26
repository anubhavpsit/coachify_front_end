import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import type { PaperQuestion } from '@/features/assessments/services/assessmentsService'

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' })
const base = `${API_BASE_URL}/worksheets`

export type Difficulty = 'mix' | 'easy' | 'medium' | 'hard'
export type Layout = 'standard' | 'compact'
/** Question-bank types a worksheet can ask for (WorksheetQuestionPicker::TYPES). */
export const QUESTION_TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_in_the_blank', label: 'Fill in the blank' },
  { value: 'short_answer', label: 'Short answer' },
  { value: 'long_answer', label: 'Long answer' },
  { value: 'match_the_following', label: 'Match the following' },
] as const

export type WorksheetSummary = {
  id: number
  title: string
  subject: { id: number; subject: string } | null
  class: { id: number; name: string } | null
  grade: number | null
  topics: { id: number; name: string }[]
  questions_count: number
  layout: Layout
  show_marks: boolean
  created_by: { id: number; name: string } | null
  created_at: string
  updated_at: string
}

export type WorksheetQuestion = PaperQuestion & {
  topic_id?: number | null
  correct_answer?: string | null
  answer_key?: string | null
  solution_html?: string | null
}

export type Worksheet = WorksheetSummary & {
  instructions: string | null
  subject_id: number
  class_id: number | null
  topic_ids: number[]
  total_marks: number
  max_questions: number
  min_questions: number
  questions: WorksheetQuestion[]
}

export type TopicOption = { id: number; name: string; chapter: string | null; grade: number | null; questions_count: number }

export type WorksheetMeta = {
  title: string
  class_id: number | null
  topic_ids: number[]
  instructions: string | null
  layout: Layout
  show_marks: boolean
}
export type AutoPick = { count: number; difficulty: Difficulty; types: string[] }

/** API returns an optional `message` (e.g. "Only 6 of 20 questions could be picked…"). */
export type WithNote<T> = { data: T; note: string | null }

export async function fetchWorksheets(): Promise<WorksheetSummary[]> {
  const res = await axios.get(base, { headers: headers() })
  return res.data.data || []
}

export async function fetchTopicOptions(subjectId: number, grade: number | null): Promise<TopicOption[]> {
  const res = await axios.get(`${base}/topics`, { headers: headers(), params: { subject_id: subjectId, ...(grade ? { grade } : {}) } })
  return res.data.data || []
}

export async function fetchWorksheet(id: number): Promise<Worksheet> {
  const res = await axios.get(`${base}/${id}`, { headers: headers() })
  return res.data.data
}

export async function createWorksheet(meta: WorksheetMeta & { subject_id: number }, auto: AutoPick | null): Promise<WithNote<Worksheet>> {
  const res = await axios.post(base, { ...meta, ...(auto && auto.count > 0 ? { auto } : {}) }, { headers: headers() })
  return { data: res.data.data, note: res.data.message ?? null }
}

export async function updateWorksheet(id: number, meta: WorksheetMeta): Promise<Worksheet> {
  const res = await axios.put(`${base}/${id}`, meta, { headers: headers() })
  return res.data.data
}

export const deleteWorksheet = (id: number) => axios.delete(`${base}/${id}`, { headers: headers() })

export async function saveWorksheetQuestions(id: number, questions: { question_id: number; marks?: number | null }[]): Promise<Worksheet> {
  const res = await axios.put(`${base}/${id}/questions`, { questions }, { headers: headers() })
  return res.data.data
}

export async function autoPickQuestions(id: number, auto: AutoPick, replace = false): Promise<WithNote<Worksheet>> {
  const res = await axios.post(`${base}/${id}/auto-pick`, { ...auto, replace }, { headers: headers() })
  return { data: res.data.data, note: res.data.message ?? null }
}

export async function fetchAvailable(id: number, filters: { q?: string; difficulty?: string; topic_id?: string; type?: string }): Promise<WorksheetQuestion[]> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  const res = await axios.get(`${base}/${id}/available`, { headers: headers(), params })
  return res.data.data || []
}

export type PrintOptions = { copy: 'student' | 'answers'; set: '' | 'A' | 'B'; explanations: boolean }

export async function fetchWorksheetPdf(id: number, o: PrintOptions): Promise<Blob> {
  const params: Record<string, string> = { copy: o.copy }
  if (o.set) params.set = o.set
  if (o.copy === 'answers') params.explanations = o.explanations ? '1' : '0'
  const res = await axios.get(`${base}/${id}/print`, { headers: headers(), params, responseType: 'blob' })
  return new Blob([res.data], { type: 'application/pdf' })
}

/** Class level from a class name like "Class 8" (same rule as the API). */
export function gradeFromClassName(name?: string | null): number | null {
  const m = (name ?? '').match(/\b(1[0-2]|[1-9])\b/)
  return m ? Number(m[1]) : null
}
