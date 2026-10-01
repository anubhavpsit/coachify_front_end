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
