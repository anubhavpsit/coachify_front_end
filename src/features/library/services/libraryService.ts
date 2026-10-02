import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import type { Question } from '@/features/content-library/services/contentLibraryService'

// Teacher read-only library — same requests as the legacy Library* managers.
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' })

export const NO_SUBJECTS = 'No subjects are assigned to you yet — this list follows the subjects taken by your assigned students.'

export type Subject = { id: number; subject: string }
export type LibraryChapter = { id: number; tenant_id: number; subject_id: number; name: string; subject?: Subject; topics_count?: number }
export type LibraryTopic = { id: number; subject_id: number; chapter_id: number | null; grade: number | null; name: string; explanation_html?: string | null; chapter?: { id: number; name: string } | null; questions_count?: number }
export type LibraryChapterDetail = LibraryChapter & { topics: LibraryTopic[] }

/** Subjects taken by the teacher's assigned students. */
export async function fetchTeacherSubjects(): Promise<Subject[]> {
  const res = await axios.get(`${API_BASE_URL}/teacher/subjects`, { headers: headers() })
  return res.data?.data ?? []
}

export async function fetchLibraryChapters(subjectId?: string): Promise<LibraryChapter[]> {
  const res = await axios.get(`${API_BASE_URL}/chapters`, { params: subjectId ? { subject_id: subjectId } : undefined, headers: headers() })
  return res.data?.data ?? []
}

export async function fetchLibraryChapter(id: string): Promise<LibraryChapterDetail | null> {
  const res = await axios.get(`${API_BASE_URL}/chapters/${id}`, { headers: headers() })
  return res.data?.data ?? null
}

export async function fetchLibraryTopics(f: { subject_id: string; chapter_id?: string; grade?: string }): Promise<LibraryTopic[]> {
  const res = await axios.get(`${API_BASE_URL}/topics`, {
    params: { subject_id: f.subject_id, ...(f.chapter_id ? { chapter_id: f.chapter_id } : {}), ...(f.grade ? { grade: f.grade } : {}) },
    headers: headers(),
  })
  return res.data?.data ?? []
}

export async function fetchLibraryTopic(id: string): Promise<{ topic: LibraryTopic | null; questions: Question[] }> {
  const [t, q] = await Promise.all([axios.get(`${API_BASE_URL}/topics/${id}`, { headers: headers() }), axios.get(`${API_BASE_URL}/topics/${id}/questions`, { headers: headers() })])
  return { topic: t.data?.data ?? null, questions: q.data?.data ?? [] }
}
