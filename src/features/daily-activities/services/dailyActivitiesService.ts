import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests mirror the legacy DailyActivitiesPage (same URLs, headers and bodies).
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` })
const STORAGE_BASE = import.meta.env.VITE_STORAGE_BASE_URL ?? 'http://coachify.local/storage'

export type HomeworkStatus = 'not_done' | 'partial' | 'done'
export type Option = { id: number; name: string }
export type SubjectOption = { id: number; subject: string }

export type ActivityAttachment = {
  id: number
  original_name: string
  path: string
  url?: string | null
  file_type?: 'image' | 'pdf' | 'other'
  mime_type?: string | null
}

export type ActivityRecord = {
  id: number
  activity_date: string
  student_id: number
  subject_id: number
  chapter?: string | null
  topic?: string | null
  chapter_number?: number | null
  chapter_id?: number | null
  topic_id?: number | null
  chapter_model?: { id: number; name: string } | null
  topic_model?: { id: number; name: string; chapter_id: number | null } | null
  notes?: string | null
  homework?: string | null
  remarks?: string | null
  homework_status?: HomeworkStatus | null
  student?: { id: number; name: string } | null
  subject?: { id: number; subject: string } | null
  attachments?: ActivityAttachment[]
  is_admin_approved?: boolean
  admin_feedback?: string | null
}

/** Body item of POST /daily-activities (keys exactly as legacy). */
export type ActivityPayload = {
  id: number | null
  student_id: number | undefined
  subject_id: number | undefined
  chapter_number: number | null
  chapter_id: number | null
  topic_id: number | null
  notes: string | null
  homework: string | null
  homework_status: HomeworkStatus | undefined
  activity_date: string | undefined
}

export type BatchPayload = {
  class_id: string
  subject_id: string
  chapter_number: number | null
  chapter_id: number | null
  topic_id: number | null
  notes: string | null
  homework: string | null
  activity_date: string | undefined
}

export type CatalogItem = { id: number; tenant_id: number; subject_id: number; name: string; chapter_id?: number | null }

export const attachmentUrl = (a: ActivityAttachment) => a.url || `${STORAGE_BASE}/${a.path}`

/** Sent back = still pending AND the admin left a remark (cleared when the teacher edits it). */
export const isSentBack = (a: Pick<ActivityRecord, 'is_admin_approved' | 'admin_feedback'>) => !a.is_admin_approved && !!a.admin_feedback

export async function fetchMyStudents(): Promise<Option[]> {
  const res = await axios.get<{ data: Option[] }>(`${API_BASE_URL}/teachers/students`, { headers: auth() })
  return (res.data?.data || []).map((s) => ({ id: s.id, name: s.name }))
}

export async function fetchClassesAndSubjects(): Promise<{ classes: Option[]; subjects: SubjectOption[] }> {
  const tenantId = localStorage.getItem('tenant_id')
  if (!tenantId) return { classes: [], subjects: [] }
  const [classesRes, subjectsRes] = await Promise.all([
    axios.get<{ success: boolean; data: Option[] }>(`${API_BASE_URL}/classes/${tenantId}`, { headers: auth() }),
    axios.get<{ data?: SubjectOption[]; subjects?: SubjectOption[] }>(`${API_BASE_URL}/subjects/${tenantId}`, { headers: auth() }),
  ])
  return {
    classes: classesRes.data.success ? classesRes.data.data || [] : [],
    subjects: subjectsRes.data.data || subjectsRes.data.subjects || [],
  }
}

export async function fetchStudentSubjects(studentId: number): Promise<SubjectOption[]> {
  const res = await axios.get<{ data: SubjectOption[] }>(`${API_BASE_URL}/students/${studentId}/subjects`, { headers: auth() })
  return res.data?.data || []
}

/**
 * Entries already saved for a day. Today uses the legacy endpoint; other days
 * use the teacher history endpoint filtered by date (same record shape), so
 * changing the date edits that day's entries instead of moving today's.
 */
export async function fetchActivitiesFor(date: string, today: string): Promise<ActivityRecord[]> {
  const res =
    date === today ? await axios.get(`${API_BASE_URL}/daily-activities`, { headers: auth() }) : await axios.get(`${API_BASE_URL}/teacher/daily-activities`, { headers: auth(), params: { date } })
  return res.data?.data || []
}

export async function saveActivities(activities: ActivityPayload[]): Promise<ActivityRecord[]> {
  const res = await axios.post(`${API_BASE_URL}/daily-activities`, { activities }, { headers: auth() })
  return res.data?.data || []
}

export async function deleteActivity(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/daily-activities/${id}`, { headers: auth() })
}

export async function uploadAttachment(activityId: number, file: File): Promise<ActivityAttachment | null> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axios.post(`${API_BASE_URL}/daily-activities/${activityId}/attachments`, formData, { headers: auth() })
  return res.data?.data ?? null
}

export async function deleteAttachment(activityId: number, attachmentId: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/daily-activities/${activityId}/attachments/${attachmentId}`, { headers: auth() })
}

/** Returns the backend message ("Daily activity saved/updated for N students."). */
export async function saveBatch(payload: BatchPayload, files: File[]): Promise<string | undefined> {
  if (files.length > 0) {
    const fd = new FormData()
    fd.append('class_id', payload.class_id)
    fd.append('subject_id', payload.subject_id)
    if (payload.chapter_number) fd.append('chapter_number', String(payload.chapter_number))
    if (payload.chapter_id) fd.append('chapter_id', String(payload.chapter_id))
    if (payload.topic_id) fd.append('topic_id', String(payload.topic_id))
    if (payload.notes) fd.append('notes', payload.notes)
    if (payload.homework) fd.append('homework', payload.homework)
    // Legacy omitted the date here, so a back-dated class entry with files landed on today.
    if (payload.activity_date) fd.append('activity_date', payload.activity_date)
    files.forEach((f) => fd.append('attachments[]', f))
    const res = await axios.post(`${API_BASE_URL}/daily-activities/batch`, fd, { headers: { ...auth(), 'Content-Type': 'multipart/form-data' } })
    return res.data?.message
  }
  const res = await axios.post(`${API_BASE_URL}/daily-activities/batch`, payload, { headers: auth() })
  return res.data?.message
}

export async function fetchHistory(date?: string): Promise<ActivityRecord[]> {
  const params: Record<string, string> = {}
  if (date) params.date = date
  const res = await axios.get<{ data: ActivityRecord[] }>(`${API_BASE_URL}/teacher/daily-activities`, { headers: auth(), params })
  return res.data?.data || []
}

export async function updateHomeworkStatus(id: number, homework_status: HomeworkStatus): Promise<void> {
  await axios.patch(`${API_BASE_URL}/daily-activities/${id}/status`, { homework_status }, { headers: auth() })
}

export async function saveRemarks(id: number, remarks: string): Promise<void> {
  await axios.patch(`${API_BASE_URL}/daily-activities/${id}/status`, { remarks }, { headers: auth() })
}

const searchHeaders = () => ({ ...auth(), Accept: 'application/json' })

export async function searchChapters(subjectId: number, q: string): Promise<CatalogItem[]> {
  const res = await axios.get(`${API_BASE_URL}/chapters`, { params: { subject_id: subjectId, q }, headers: searchHeaders() })
  return res.data?.data ?? []
}

export async function searchTopics(subjectId: number, chapterId: number | null, q: string): Promise<CatalogItem[]> {
  const res = await axios.get(`${API_BASE_URL}/topics/autocomplete`, {
    params: { subject_id: subjectId, ...(chapterId ? { chapter_id: chapterId } : {}), q },
    headers: searchHeaders(),
  })
  return res.data?.data ?? []
}
