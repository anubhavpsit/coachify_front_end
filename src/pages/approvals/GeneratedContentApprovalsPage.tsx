import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import DOMPurify from 'dompurify'
import { ROLES } from '../../constants/roles'

interface ContentUser {
  id: number
  name: string
}

interface ContentSubject {
  id: number
  subject: string
}

interface DailyActivitySummary {
  id: number
  activity_date: string
  chapter?: string | null
  topic?: string | null
  teacher?: ContentUser | null
  student?: ContentUser | null
  subject?: ContentSubject | null
}

type ContentNotification = {
  id: number
  title: string
  status: string
  sent_at?: string | null
  created_at: string
  last_error?: string | null
}

interface GeneratedContentItem {
  id: number
  daily_activity_id: number
  explanation_html?: string | null
  homework_html?: string | null
  sample_questions_html?: string | null
  sample_questions_with_solutions_html?: string | null
  is_admin_approved?: boolean
  approved_at?: string | null
  admin_feedback?: string | null
  ingested_at?: string | null
  daily_activity?: DailyActivitySummary | null
  teacher_notification?: ContentNotification | null
  student_notification?: ContentNotification | null
}

type StudentOption = { id: number; name: string }

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

type ApprovalFilter = 'pending' | 'approved'
type QuickFilter = 'today' | '3d' | '7d' | '14d' | '30d' | 'all' | 'custom'

const QUICK_FILTER_OPTIONS: { label: string; value: QuickFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: '3d', value: '3d' },
  { label: '7d', value: '7d' },
  { label: '14d', value: '14d' },
  { label: '30d', value: '30d' },
  { label: 'All', value: 'all' },
]

const toDateStr = (d: Date) => d.toISOString().split('T')[0]

const getQuickFilterDates = (
  filter: QuickFilter,
  customDate: string,
): { date?: string; date_from?: string; date_to?: string } => {
  if (filter === 'custom') return customDate ? { date: customDate } : {}
  if (filter === 'today') return { date: toDateStr(new Date()) }
  if (filter === 'all') return {}
  const days = { '3d': 3, '7d': 7, '14d': 14, '30d': 30 }[filter as string]
  if (!days) return {}
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days + 1)
  return { date_from: toDateStr(from), date_to: toDateStr(to) }
}

const CONTENT_SECTIONS: { key: keyof GeneratedContentItem; label: string }[] = [
  { key: 'explanation_html', label: 'Explanation' },
  { key: 'homework_html', label: 'Homework' },
  { key: 'sample_questions_html', label: 'Sample Questions' },
  { key: 'sample_questions_with_solutions_html', label: 'Sample Questions with Solutions' },
]

function SanitizedHtml({ html }: { html: string }) {
  return (
    <div
      className="border rounded p-2 bg-body-tertiary"
      style={{ maxHeight: '260px', overflowY: 'auto', fontSize: '0.85rem' }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  )
}

function ContentAccordion({ item }: { item: GeneratedContentItem }) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className="d-flex flex-column gap-1">
      {CONTENT_SECTIONS.map(({ key, label }) => {
        const html = item[key] as string | null | undefined
        if (!html) return null
        const isOpen = openKey === key

        return (
          <div key={key}>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100 text-start"
              onClick={() => setOpenKey(isOpen ? null : key)}
            >
              {isOpen ? '▾' : '▸'} {label}
            </button>
            {isOpen && (
              <div className="mt-1">
                <SanitizedHtml html={html} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function GeneratedContentApprovalsPage() {
  const [items, setItems] = useState<GeneratedContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('pending')
  const [dateFilter, setDateFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('today')
  const [studentFilter, setStudentFilter] = useState('')
  const [students, setStudents] = useState<StudentOption[]>([])
  const [processingId, setProcessingId] = useState<number | null>(null)

  const authUserRaw = typeof window !== 'undefined'
    ? window.localStorage.getItem('authUser')
    : null
  const authUser = useMemo(() => {
    try {
      return authUserRaw ? JSON.parse(authUserRaw) : null
    } catch {
      return null
    }
  }, [authUserRaw])

  const token = typeof window !== 'undefined'
    ? window.localStorage.getItem('authToken')
    : null

  const isAdmin = authUser?.role === ROLES.COACHING_ADMIN

  useEffect(() => {
    if (!token || !isAdmin) return
    axios
      .get<{ success: boolean; data: StudentOption[] }>(
        `${API_BASE_URL}/students`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then(res => {
        if (res.data.success) setStudents(res.data.data || [])
      })
      .catch(() => {/* non-critical */})
  }, [token, isAdmin])

  const loadItems = async (
    approvalFilter: ApprovalFilter,
    dateParams: { date?: string; date_from?: string; date_to?: string },
    studentId?: string,
  ) => {
    if (!token || !isAdmin) return

    setLoading(true)
    setError(null)

    try {
      const params: Record<string, string> = {
        approved: approvalFilter === 'approved' ? 'true' : 'false',
      }
      if (dateParams.date) params.date = dateParams.date
      if (dateParams.date_from) params.date_from = dateParams.date_from
      if (dateParams.date_to) params.date_to = dateParams.date_to
      if (studentId) params.student_id = studentId

      const response = await axios.get<{ success: boolean; data: GeneratedContentItem[] }>(
        `${API_BASE_URL}/admin/generated-content`,
        { headers: { Authorization: `Bearer ${token}` }, params },
      )

      if (response.data.success) {
        setItems(response.data.data || [])
      } else {
        setError('Unable to load generated content. Please try again later.')
      }
    } catch (err) {
      console.error('Failed to load generated content', err)
      setError('Unable to load generated content. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const dateParams = getQuickFilterDates(quickFilter, dateFilter)
    loadItems(statusFilter, dateParams, studentFilter || undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, quickFilter, dateFilter, studentFilter, isAdmin])

  const refresh = () => {
    const dateParams = getQuickFilterDates(quickFilter, dateFilter)
    loadItems(statusFilter, dateParams, studentFilter || undefined)
  }

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter)
    if (filter !== 'custom') setDateFilter('')
  }

  const setApproval = async (id: number, approved: boolean, remarks?: string) => {
    if (!token) return

    setProcessingId(id)
    try {
      await axios.patch(
        `${API_BASE_URL}/generated-content/${id}/approval`,
        { approved, remarks },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      refresh()
    } catch (err) {
      console.error('Failed to update generated content approval', err)
      alert('Unable to update approval. Please try again.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleApprovalToggle = (id: number, approved: boolean) => {
    if (approved) {
      setApproval(id, true)
      return
    }

    const remark = window.prompt(
      'Enter remarks for the teacher explaining what needs to be regenerated (required).',
    )

    if (!remark || !remark.trim()) {
      alert('Remarks are required to reject generated content.')
      return
    }

    setApproval(id, false, remark.trim())
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <h6 className="fw-semibold mb-2">AI Content Approvals</h6>
        <p className="text-danger-600">You are not authorized to view this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-2">
        <div>
          <h6 className="fw-semibold mb-0">AI Content Approvals</h6>
          <p className="text-secondary-light mb-0 text-xs">
            Review AI-generated explanations, homework and sample questions before they
            reach teachers and students. Approving a row releases all of its content to
            the teacher immediately; the sample-question solutions unlock for students
            48 hours after approval.
          </p>
        </div>

        <div className="d-flex align-items-end gap-2">
          <div>
            <div className="text-xs text-secondary-light mb-1">Status</div>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ApprovalFilter)}
              style={{ minWidth: '150px' }}
            >
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-secondary-light mb-1">Student</div>
            <select
              className="form-select form-select-sm"
              value={studentFilter}
              onChange={(event) => setStudentFilter(event.target.value)}
              style={{ minWidth: '155px' }}
            >
              <option value="">All Students</option>
              {students.map(s => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="d-flex align-items-center justify-content-end gap-2 mb-3">
        <div className="btn-group" role="group" aria-label="Quick date filters">
          {QUICK_FILTER_OPTIONS.map(f => (
            <button
              key={f.value}
              type="button"
              className={`btn btn-sm ${quickFilter === f.value ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => applyQuickFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={refresh}
            title="Refresh"
          >
            ↻
          </button>
        </div>
        <input
          type="date"
          className={`form-control form-control-sm${quickFilter === 'custom' ? ' border-primary' : ''}`}
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value)
            setQuickFilter(event.target.value ? 'custom' : 'all')
          }}
          style={{ width: '148px' }}
        />
      </div>

      {error && <p className="text-danger-600 mb-3">{error}</p>}

      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border spinner-border-sm"></span>
          <span className="ms-2 text-secondary-light">Loading generated content…</span>
        </div>
      ) : items.length === 0 ? (
        <p className="text-secondary-light">No generated content found for the selected filters.</p>
      ) : (
        <div className="table-responsive">
          <table className="table bordered-table align-top">
            <thead>
              <tr>
                <th>Date</th>
                <th>Teacher</th>
                <th>Student</th>
                <th>Subject / Topic</th>
                <th>Content</th>
                <th>Feedback</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const activity = item.daily_activity
                return (
                  <tr key={item.id}>
                    <td>{activity?.activity_date ? formatDate(activity.activity_date) : '-'}</td>
                    <td>{activity?.teacher?.name ?? '-'}</td>
                    <td>{activity?.student?.name ?? '-'}</td>
                    <td>
                      {activity?.subject?.subject ?? '-'}
                      {activity?.topic ? ` — ${activity.topic}` : ''}
                    </td>
                    <td style={{ minWidth: '260px' }}>
                      <ContentAccordion item={item} />
                    </td>
                    <td>{item.admin_feedback ?? '—'}</td>
                    <td className="text-center">
                      <div className="d-flex flex-column gap-2 align-items-center">
                        {item.is_admin_approved ? (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled={processingId === item.id}
                            onClick={() => handleApprovalToggle(item.id, false)}
                          >
                            {processingId === item.id ? 'Updating...' : 'Mark Pending'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={processingId === item.id}
                            onClick={() => handleApprovalToggle(item.id, true)}
                          >
                            {processingId === item.id ? 'Updating...' : 'Approve Content'}
                          </button>
                        )}
                        {item.is_admin_approved && (
                          <small className="text-secondary-light">
                            Approved {formatDate(item.approved_at)}
                          </small>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
