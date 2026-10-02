import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Same URLs, headers and bodies as the legacy ChaptersManager / TopicsManager.
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' })
const CHAPTERS = '/admin/chapters'
const TOPICS = '/admin/topics'

export type Subject = { id: number; subject: string }
export type Chapter = { id: number; tenant_id: number; subject_id: number; name: string; subject?: Subject; topics_count?: number }
export type Topic = {
  id: number
  tenant_id: number
  subject_id: number
  chapter_id: number | null
  grade: number | null
  name: string
  explanation_html: string | null
  subject?: Subject
  chapter?: Pick<Chapter, 'id' | 'name' | 'subject_id' | 'tenant_id'> | null
}

/** Legacy sent form values as strings (subject_id "5", grade "7" or null). */
export type ChapterPayload = { subject_id: string; name: string }
export type TopicPayload = { subject_id: string; chapter_id: string | null; grade: string | null; name: string; explanation_html: string }
export type TopicFilters = { subject_id?: string; chapter_id?: string; grade?: string }

export const ownTenantId = () => Number(localStorage.getItem('tenant_id') ?? 0)

export async function fetchSubjects(): Promise<Subject[]> {
  const res = await axios.get(`${API_BASE_URL}/subjects/${ownTenantId()}`, { headers: headers() })
  return res.data?.data ?? []
}

export async function fetchChapters(subjectId?: string): Promise<Chapter[]> {
  const res = await axios.get(`${API_BASE_URL}${CHAPTERS}`, { params: subjectId ? { subject_id: subjectId } : undefined, headers: headers() })
  return res.data?.data ?? []
}

export const createChapter = (p: ChapterPayload) => axios.post(`${API_BASE_URL}${CHAPTERS}`, p, { headers: headers() })
export const updateChapter = (id: number, p: ChapterPayload) => axios.put(`${API_BASE_URL}${CHAPTERS}/${id}`, p, { headers: headers() })
export const deleteChapter = (id: number) => axios.delete(`${API_BASE_URL}${CHAPTERS}/${id}`, { headers: headers() })

export async function fetchTopics(f: TopicFilters): Promise<Topic[]> {
  const res = await axios.get(`${API_BASE_URL}${TOPICS}`, {
    params: {
      ...(f.subject_id ? { subject_id: f.subject_id } : {}),
      ...(f.chapter_id ? { chapter_id: f.chapter_id } : {}),
      ...(f.grade ? { grade: f.grade } : {}),
    },
    headers: headers(),
  })
  return res.data?.data ?? []
}

export const createTopic = (p: TopicPayload) => axios.post(`${API_BASE_URL}${TOPICS}`, p, { headers: headers() })
export const updateTopic = (id: number, p: TopicPayload) => axios.put(`${API_BASE_URL}${TOPICS}/${id}`, p, { headers: headers() })
export const deleteTopic = (id: number) => axios.delete(`${API_BASE_URL}${TOPICS}/${id}`, { headers: headers() })

export type ChapterDetail = Chapter & { is_base?: boolean; topics: Topic[] }

export async function fetchChapter(id: string | number): Promise<ChapterDetail> {
  const res = await axios.get(`${API_BASE_URL}${CHAPTERS}/${id}`, { headers: headers() })
  return res.data?.data
}

export const attachTopics = (chapterId: number, topicIds: number[]) => axios.post(`${API_BASE_URL}${CHAPTERS}/${chapterId}/topics`, { topic_ids: topicIds }, { headers: headers() })
export const detachTopic = (chapterId: number, topicId: number) => axios.delete(`${API_BASE_URL}${CHAPTERS}/${chapterId}/topics/${topicId}`, { headers: headers() })

// ---- Question bank (per topic) ----
export type QuestionType = '' | 'mcq' | 'true_false' | 'short_answer' | 'long_answer' | 'fill_in_the_blank' | 'match_the_following'
export type Question = {
  id: number
  tenant_id: number
  grade: number
  difficulty: string | null
  question_type: string | null
  question_html: string
  solution_html: string | null
  option_a: string | null
  option_b: string | null
  option_c: string | null
  option_d: string | null
  correct_answer: string | null
  answer_key: string | null
  needs_image: boolean
  image_note: string | null
}
/** Same body as the legacy buildPayload() (grade as a string). */
export type QuestionPayload = {
  grade: string
  difficulty: string | null
  question_type: string | null
  question_html: string
  solution_html: string | null
  option_a: string | null
  option_b: string | null
  option_c: string | null
  option_d: string | null
  correct_answer: string | null
  answer_key: string | null
  needs_image: boolean
  image_note: string | null
}

const questionsUrl = (topicId: string | number) => `${API_BASE_URL}${TOPICS}/${topicId}/questions`

export async function fetchTopic(id: string | number): Promise<Topic | null> {
  const res = await axios.get(`${API_BASE_URL}${TOPICS}/${id}`, { headers: headers() })
  return res.data?.data ?? null
}

export async function fetchQuestions(topicId: string | number, grade?: string): Promise<Question[]> {
  const res = await axios.get(questionsUrl(topicId), { params: grade ? { grade } : undefined, headers: headers() })
  return res.data?.data ?? []
}
export const createQuestion = (topicId: string | number, p: QuestionPayload) => axios.post(questionsUrl(topicId), p, { headers: headers() })
export const updateQuestion = (topicId: string | number, id: number, p: QuestionPayload) => axios.put(`${questionsUrl(topicId)}/${id}`, p, { headers: headers() })
export const deleteQuestion = (topicId: string | number, id: number) => axios.delete(`${questionsUrl(topicId)}/${id}`, { headers: headers() })

export async function uploadQuestionImage(topicId: string | number, id: number, file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await axios.post(`${questionsUrl(topicId)}/${id}/image`, fd, { headers: { ...headers(), 'Content-Type': 'multipart/form-data' } })
  return res.data?.url ?? ''
}
