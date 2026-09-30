import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

export type SubjectItem = { subject_id: number; subject: string; activity_count: number; days_count: number; share: number; series: number[]; dates: string[] }
export type ChapterItem = { chapter: string; activity_count: number }
export type SubjectsResult = { items: SubjectItem[]; notes: string[] }

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' })

/** `null` = all time (legacy sends `all=true`), otherwise `window_days`. */
export const windowParams = (days: number | null) => (days === null ? { all: 'true' } : { window_days: days })

export async function fetchSubjectInsights(days: number | null): Promise<SubjectsResult | null> {
  const res = await axios.get(`${API_BASE_URL}/insights/activities/subjects`, { headers: headers(), params: windowParams(days) })
  if (!res.data?.success) return null
  return { items: res.data.data.items, notes: res.data.data.focus?.notes || [] }
}

export async function fetchChapterInsights(days: number | null, subjectId: number): Promise<ChapterItem[]> {
  const res = await axios.get(`${API_BASE_URL}/insights/activities/chapters`, { headers: headers(), params: { ...windowParams(days), subject_id: subjectId } })
  return res.data?.success ? res.data.data.items || [] : []
}
