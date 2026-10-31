import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Same URLs, headers and bodies as the legacy AssessmentsPage / QuestionPaperModal.
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` })
const json = () => ({ ...auth(), Accept: 'application/json' })
const STORAGE_BASE = import.meta.env.VITE_STORAGE_BASE_URL ?? 'http://coachify.local/storage'

export type AssessmentResult = { marks_obtained: number; total_marks: number; percentage: number; teacher_notes?: string | null }
/** Per-student stage, derived by the API from status + date (IST). */
export type AssignmentStage = 'upcoming' | 'today' | 'awaiting_results' | 'result_out' | 'absent' | 'cancelled'
export type AssessmentAssignment = { id: number; student_id: number; scheduled_date: string; status: string; stage?: AssignmentStage; student?: { id: number; name: string }; result?: AssessmentResult }
/** Whole-assessment stage, most urgent first (AssessmentProgress). */
export type AssessmentStage = 'needs_results' | 'today' | 'upcoming' | 'done' | 'not_assigned' | 'cancelled'
export type AssessmentProgress = {
  total: number
  upcoming: number
  today: number
  awaiting_results: number
  result_out: number
  absent: number
  cancelled: number
  next_date: string | null
  oldest_pending_date: string | null
  /** Per test date (calendar): students, and how many still have no result / absent. */
  dates?: { date: string; total: number; open: number }[]
  stage: AssessmentStage
}
export type Assessment = {
  id: number
  title: string
  description?: string | null
  subject_id: number
  class_id?: number | null
  teacher_id?: number | null
  total_marks: number
  scheduled_date?: string | null
  status: string
  is_admin_approved?: boolean
  approved_at?: string | null
  source?: string | null
  topic_id?: number | null
  paper_questions_count?: number
  question_paper_approved_at?: string | null
  question_paper_released_at?: string | null
  subject?: { id: number; subject: string }
  class?: { id: number; name: string }
  teacher?: { id: number; name: string }
  assignments?: AssessmentAssignment[]
  progress?: AssessmentProgress | null
}
export type StudentOption = { id: number; name: string; classId: number | null }
export type AssessmentFileType = 'question_paper' | 'answer_sheet' | 'other'
export type AssessmentFile = {
  id: number
  type: AssessmentFileType
  path: string
  original_name: string
  mime_type?: string | null
  size_bytes?: number | null
  student_id?: number | null
  uploaded_at?: string | null
  student?: { id: number; name: string } | null
  file_type?: 'image' | 'pdf' | 'other'
  url?: string | null
  is_admin_approved?: boolean
}
export type CreatePayload = { title: string; description: string | null; subject_id: number; class_id: number | null; total_marks: number; scheduled_date: string | null; student_ids?: number[] }
export type ResultPayload =
  | { student_id: number; marks_obtained: number; total_marks: number | undefined; teacher_notes: string | undefined }
  | { student_id: number; absent: true }
export type BulkAction = 'reschedule' | 'absent' | 'cancel' | 'reopen'

export const fileUrl = (f: AssessmentFile) => f.url || `${STORAGE_BASE}/${f.path}`

export async function fetchAssessments(): Promise<Assessment[]> {
  const res = await axios.get(`${API_BASE_URL}/assessments`, { headers: json() })
  if (!res.data.success) throw new Error('Unable to load assessments.')
  return res.data.data || []
}

export async function fetchAssessment(id: number): Promise<Assessment | null> {
  const res = await axios.get(`${API_BASE_URL}/assessments/${id}`, { headers: json() })
  return res.data.success ? (res.data.data as Assessment) : null
}

export async function fetchSubjectsAndClasses(): Promise<{ subjects: { id: number; subject: string }[]; classes: { id: number; name: string }[] }> {
  const tenantId = localStorage.getItem('tenant_id')
  if (!tenantId) return { subjects: [], classes: [] }
  const [s, c] = await Promise.all([axios.get(`${API_BASE_URL}/subjects/${tenantId}`, { headers: auth() }), axios.get(`${API_BASE_URL}/classes/${tenantId}`, { headers: auth() })])
  // Legacy read `status` for subjects and `success` for classes.
  return { subjects: s.data.status ? s.data.data || [] : [], classes: c.data.success ? c.data.data || [] : [] }
}

type StudentApiItem = { id: number; name: string; student_profile?: { class?: number | string | null } | null; studentProfile?: { class?: number | string | null } | null }

/** Teachers see their own students; everyone else the institute's. */
export async function fetchStudentOptions(isTeacher: boolean): Promise<StudentOption[]> {
  const res = await axios.get<{ success: boolean; data: StudentApiItem[] }>(`${API_BASE_URL}${isTeacher ? '/teachers/students' : '/students'}`, { headers: auth() })
  if (!res.data.success) return []
  return (res.data.data || []).map((item) => {
    const raw = (item.student_profile ?? item.studentProfile ?? null)?.class ?? null
    const n = raw === null || raw === undefined ? NaN : Number(raw)
    return { id: item.id, name: item.name, classId: Number.isNaN(n) ? null : n }
  })
}

export async function createAssessment(p: CreatePayload): Promise<Assessment | null> {
  const res = await axios.post(`${API_BASE_URL}/assessments`, p, { headers: json() })
  return res.data.success ? res.data.data : null
}

export async function updateAssessment(id: number, p: CreatePayload): Promise<Assessment | null> {
  const res = await axios.put(`${API_BASE_URL}/assessments/${id}`, p, { headers: json() })
  return res.data.success ? res.data.data : null
}

export const deleteAssessment = (id: number) => axios.delete(`${API_BASE_URL}/assessments/${id}`, { headers: json() })

export async function setAssessmentApproval(id: number, approved: boolean): Promise<Assessment | null> {
  const res = await axios.patch(`${API_BASE_URL}/assessments/${id}/approval`, { approved }, { headers: json() })
  return res.data.success ? (res.data.data as Assessment) : null
}

export async function assignStudents(id: number, assignments: { student_id: number; scheduled_date: string }[]): Promise<boolean> {
  const res = await axios.post(`${API_BASE_URL}/assessments/${id}/assign`, { assignments }, { headers: auth() })
  return !!res.data.success
}

export async function saveResults(id: number, results: ResultPayload[]): Promise<void> {
  const res = await axios.post(`${API_BASE_URL}/assessments/${id}/results`, { results }, { headers: json() })
  if (!res.data.success) throw new Error('Failed to save results')
}

/** Reschedule / mark absent / cancel / reopen students whose test didn't happen as planned. */
export async function bulkUpdateAssignments(id: number, studentIds: number[], action: BulkAction, scheduledDate?: string): Promise<{ message: string; progress: AssessmentProgress }> {
  const res = await axios.post(
    `${API_BASE_URL}/assessments/${id}/assignments/bulk`,
    { student_ids: studentIds, action, ...(action === 'reschedule' ? { scheduled_date: scheduledDate } : {}) },
    { headers: json() },
  )
  return { message: res.data.message, progress: res.data.data.progress }
}

export async function uploadAnswerSheet(id: number, studentId: number, file: File): Promise<void> {
  const fd = new FormData()
  fd.append('file', file)
  await axios.post(`${API_BASE_URL}/assessments/${id}/students/${studentId}/files`, fd, { headers: auth() })
}

export async function fetchFiles(id: number): Promise<AssessmentFile[]> {
  const res = await axios.get(`${API_BASE_URL}/assessments/${id}/files`, { headers: auth() })
  return res.data.success ? res.data.data || [] : []
}

export async function uploadFile(id: number, file: File, type: AssessmentFileType): Promise<boolean> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('type', type)
  const res = await axios.post(`${API_BASE_URL}/assessments/${id}/files`, fd, { headers: { ...auth(), 'Content-Type': 'multipart/form-data' } })
  return !!res.data.success
}

export const setFileApproval = (fileId: number, approved: boolean) => axios.patch(`${API_BASE_URL}/assessments/files/${fileId}/approval`, { approved }, { headers: auth() })
export const deleteFile = (assessmentId: number, fileId: number) => axios.delete(`${API_BASE_URL}/assessments/${assessmentId}/files/${fileId}`, { headers: auth() })

export async function fetchAutoAssessment(): Promise<boolean> {
  const res = await axios.get(`${API_BASE_URL}/tenant/auto-assessment`, { headers: json() })
  return res.data?.success ? !!res.data.data.enabled : false
}

export async function setAutoAssessment(enabled: boolean): Promise<boolean> {
  const res = await axios.put(`${API_BASE_URL}/tenant/auto-assessment`, { enabled }, { headers: json() })
  return !!res.data.data.enabled
}

// ---- Question paper ----
export type PaperQuestion = {
  id: number
  position?: number
  marks?: number | null
  question_type?: string | null
  question_html?: string | null
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  difficulty?: string | null
  grade?: number | null
}
export type Paper = {
  assessment_id: number
  title: string
  source: string
  total_marks: number
  topic?: { id: number; name: string } | null
  status: 'none' | 'pending' | 'approved' | 'released'
  approved_at?: string | null
  released_at?: string | null
  questions: PaperQuestion[]
}

const paperBase = (id: number) => `${API_BASE_URL}/assessments/${id}/question-paper`

export async function fetchPaper(id: number): Promise<Paper> {
  const res = await axios.get<{ success: boolean; data: Paper }>(paperBase(id), { headers: json() })
  return res.data.data
}
export const replacePaper = (id: number, questions: { question_id: number; marks?: number }[]) => axios.put(paperBase(id), { questions }, { headers: json() })
export const removePaperQuestion = (id: number, questionId: number) => axios.delete(`${paperBase(id)}/questions/${questionId}`, { headers: json() })
export const setPaperApproval = (id: number, approve: boolean) => axios.post(`${paperBase(id)}/${approve ? 'approve' : 'unapprove'}`, {}, { headers: json() })

export async function fetchAvailableQuestions(id: number, q: string, difficulty: string): Promise<PaperQuestion[]> {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  if (difficulty) params.set('difficulty', difficulty)
  const res = await axios.get<{ success: boolean; data: PaperQuestion[] }>(`${paperBase(id)}/available?${params.toString()}`, { headers: json() })
  return res.data.data
}

export async function fetchPaperPdf(id: number): Promise<Blob> {
  const res = await axios.get(`${paperBase(id)}/print`, { headers: json(), responseType: 'blob' })
  return new Blob([res.data], { type: 'application/pdf' })
}

// ---- Student (self) ----
export type StudentAssignment = {
  id: number
  scheduled_date: string
  status: string
  stage?: AssignmentStage
  attempted_at?: string | null
  assessment: {
    id: number
    title: string
    total_marks: number
    source?: string | null
    question_paper_released_at?: string | null
    subject?: { id: number; subject: string }
    teacher?: { id: number; name: string }
  }
  result?: { marks_obtained: number; total_marks: number; percentage: number; teacher_notes?: string | null }
}
export type StudentFile = { id: number; type: AssessmentFileType; path: string; original_name: string; uploaded_at?: string | null }
export type StudentFiles = { question_papers: StudentFile[]; answer_sheets: StudentFile[] }

/** Legacy links used the storage path (not `url`). */
export const studentFileUrl = (f: StudentFile) => `${STORAGE_BASE}/${f.path}`

export async function fetchMyAssessments(): Promise<{ upcoming: StudentAssignment[]; history: StudentAssignment[] }> {
  const [u, h] = await Promise.all([axios.get(`${API_BASE_URL}/student/assessments/upcoming`, { headers: auth() }), axios.get(`${API_BASE_URL}/student/assessments/history`, { headers: auth() })])
  return { upcoming: u.data.success ? u.data.data || [] : [], history: h.data.success ? h.data.data || [] : [] }
}

export async function fetchMyAssessmentFiles(assessmentId: number): Promise<StudentFiles | null> {
  const res = await axios.get(`${API_BASE_URL}/student/assessments/${assessmentId}/files`, { headers: auth() })
  return res.data.success ? res.data.data : null
}

export async function fetchReleasedPaper(assessmentId: number): Promise<{ questions: PaperQuestion[]; total_marks: number | null }> {
  const res = await axios.get(`${API_BASE_URL}/student/assessments/${assessmentId}/question-paper`, { headers: json() })
  return { questions: res.data.data.questions || [], total_marks: res.data.data.total_marks ?? null }
}
