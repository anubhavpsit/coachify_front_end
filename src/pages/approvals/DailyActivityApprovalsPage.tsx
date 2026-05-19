import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Modal } from 'react-bootstrap'
import { ROLES } from '../../constants/roles'

interface ActivityAttachment {
  id: number
  original_name: string
  path: string
  url?: string | null
  file_type?: 'image' | 'pdf' | 'other'
  is_admin_approved?: boolean
}

interface ActivityUser {
  id: number
  name: string
}

interface ActivitySubject {
  id: number
  subject: string
}

interface AdminActivity {
  id: number
  activity_date: string
  chapter?: string | null
  topic?: string | null
  notes?: string | null
  homework?: string | null
  is_admin_approved?: boolean
  admin_feedback?: string | null
  teacher?: ActivityUser | null
  student?: ActivityUser | null
  subject?: ActivitySubject | null
  attachments?: ActivityAttachment[]
  student_notification?: ActivityNotification | null
  teacher_notification?: ActivityNotification | null
}

type ActivityNotification = {
  id: number
  title: string
  body?: string | null
  status: string
  sent_at?: string | null
  scheduled_for?: string | null
  created_at: string
  last_error?: string | null
}

type StudentOption = {
  id: number
  name: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'
const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_BASE_URL ?? 'http://coachify.local/storage'

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

type AttachmentActionContext = {
  activityId: number
  attachment: ActivityAttachment
}

export default function DailyActivityApprovalsPage() {
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('pending')
  const [dateFilter, setDateFilter] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('today')
  const [studentFilter, setStudentFilter] = useState('')
  const [students, setStudents] = useState<StudentOption[]>([])
  const [previewContext, setPreviewContext] =
    useState<AttachmentActionContext | null>(null)
  const [processingActivityId, setProcessingActivityId] = useState<number | null>(
    null,
  )
  const [sendingNotificationId, setSendingNotificationId] = useState<number | null>(
    null,
  )

  const formatAddedOn = (isoString?: string | null) => {
    if (!isoString) return '-';
    const parsedDate = new Date(isoString);
    if (Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleString();
  };

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
  const isTeacher = authUser?.role === ROLES.TEACHER
  const canAccess = isAdmin || isTeacher

  const studentsEndpoint = isAdmin ? '/students' : '/teachers/students'

  useEffect(() => {
    if (!token || !canAccess) return
    axios
      .get<{ success: boolean; data: StudentOption[] }>(
        `${API_BASE_URL}${studentsEndpoint}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then(res => {
        if (res.data.success) {
          setStudents(res.data.data || [])
        }
      })
      .catch(() => {/* non-critical */})
  }, [token, canAccess, studentsEndpoint])

  const loadActivities = async (
    approvalFilter: ApprovalFilter,
    dateParams: { date?: string; date_from?: string; date_to?: string },
    studentId?: string,
  ) => {
    if (!token || !canAccess) return

    setLoading(true)
    setError(null)

    try {
      const params: Record<string, string> = {}

      if (isAdmin) {
        params.approved = approvalFilter === 'approved' ? 'true' : 'false'
      }
      if (dateParams.date) {
        params.date = dateParams.date
      }
      if (dateParams.date_from) {
        params.date_from = dateParams.date_from
      }
      if (dateParams.date_to) {
        params.date_to = dateParams.date_to
      }
      if (studentId) {
        params.student_id = studentId
      }

      const endpoint = isAdmin
        ? `${API_BASE_URL}/admin/daily-activities`
        : `${API_BASE_URL}/teacher/daily-activities`

      const response = await axios.get<{ success: boolean; data: AdminActivity[] }>(
        endpoint,
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        },
      )

      if (response.data.success) {
        setActivities(response.data.data || [])
      } else {
        setError('Unable to load activities. Please try again later.')
      }
    } catch (err) {
      console.error('Failed to load activities', err)
      setError('Unable to load activities. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const dateParams = getQuickFilterDates(quickFilter, dateFilter)
    loadActivities(statusFilter, dateParams, studentFilter || undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, quickFilter, dateFilter, studentFilter, canAccess])

  const refresh = () => {
    const dateParams = getQuickFilterDates(quickFilter, dateFilter)
    loadActivities(statusFilter, dateParams, studentFilter || undefined)
  }

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter)
    if (filter !== 'custom') {
      setDateFilter('')
    }
  }

  const approveActivity = async (
    activityId: number,
    approved = true,
    remarks?: string,
  ) => {
    if (!token) return

    setProcessingActivityId(activityId)
    try {
      await axios.patch(
        `${API_BASE_URL}/daily-activities/${activityId}/approval`,
        { approved, remarks },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      refresh()
    } catch (err) {
      console.error('Failed to update approval', err)
      alert('Unable to update approval. Please try again.')
    } finally {
      setProcessingActivityId(null)
    }
  }

  const approveAttachment = async (
    activityId: number,
    attachmentId: number,
    approved = true,
  ) => {
    if (!token) return

    try {
      await axios.patch(
        `${API_BASE_URL}/daily-activities/${activityId}/attachments/${attachmentId}/approval`,
        { approved },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      refresh()
    } catch (err) {
      console.error('Failed to update attachment approval', err)
      alert('Unable to update attachment approval. Please try again.')
    }
  }

  const sendQueuedNotification = async (notificationId: number) => {
    if (!token) return

    setSendingNotificationId(notificationId)
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${notificationId}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      refresh()
    } catch (err) {
      console.error('Failed to send notification', err)
      alert('Unable to send notification. Please review it in the Notifications tab.')
    } finally {
      setSendingNotificationId(null)
    }
  }

  const handleApprovalToggle = (activityId: number, approved: boolean) => {
    if (approved) {
      approveActivity(activityId, true)
      return
    }

    const remark = window.prompt(
      'Enter remarks for the teacher so they can fix the activity (required).',
    )

    if (!remark || !remark.trim()) {
      alert('Remarks are required to reject an activity.')
      return
    }

    approveActivity(activityId, false, remark.trim())
  }

  const notificationStatusClass = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === 'sent') return 'badge bg-success-subtle text-success'
    if (normalized === 'failed') return 'badge bg-danger-subtle text-danger'
    if (normalized === 'retrying' || normalized === 'processing')
      return 'badge bg-info-subtle text-info'
    return 'badge bg-warning-subtle text-warning'
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  const renderNotificationMeta = (
    label: string,
    notification?: ActivityNotification | null,
  ) => {
    if (!notification) return null

    const isSent = notification.status?.toLowerCase() === 'sent'
    return (
      <div className="border rounded p-2 mt-2">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <small className="text-muted d-block">{label}</small>
            <span className={notificationStatusClass(notification.status)}>
              {notification.status.replace('_', ' ')}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            disabled={isSent || sendingNotificationId === notification.id}
            title={isSent ? 'Already delivered to the recipient' : 'Send this notification immediately'}
            onClick={() => sendQueuedNotification(notification.id)}
          >
            {sendingNotificationId === notification.id
              ? 'Sending...'
              : isSent
              ? 'Sent'
              : 'Send now'}
          </button>
        </div>
        <div className="mt-1 text-xs text-secondary-light">
          <div>Scheduled: {formatDate(notification.scheduled_for)}</div>
          <div>Created: {formatDate(notification.created_at)}</div>
          {notification.sent_at && <div>Sent: {formatDate(notification.sent_at)}</div>}
          {notification.last_error && (
            <div className="text-danger-600">
              Last error: {notification.last_error}
            </div>
          )}
        </div>
      </div>
    )
  }

  const getAttachmentUrl = (attachment: ActivityAttachment) => {
    if (attachment.url) return attachment.url
    return `${STORAGE_BASE_URL}/${attachment.path}`
  }

  if (!canAccess) {
    return (
      <div className="p-4">
        <h6 className="fw-semibold mb-2">Activity Approvals</h6>
        <p className="text-danger-600">You are not authorized to view this page.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Row 1: title + dropdowns */}
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-2">
        <div>
          <h6 className="fw-semibold mb-0">Activity Approvals</h6>
          <p className="text-secondary-light mb-0 text-xs">
            Review and approve teacher submitted activities.
          </p>
        </div>

        <div className="d-flex align-items-end gap-2">
          {isAdmin && (
            <div>
              <div className="text-xs text-secondary-light mb-1">Status</div>
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ApprovalFilter)}
                style={{ minWidth: '150px' }}
              >
                <option value="pending">Pending Approval</option>
                <option value="approved">Recently Approved</option>
              </select>
            </div>
          )}
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

      {/* Row 2: date range bar */}
      <div className="d-flex align-items-center justify-content-end gap-2 mb-1">
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

      <p className="text-xs text-secondary-light text-end mb-3">
        Use quick filters to narrow by date range, or pick a custom date. Approving an activity does <strong>not</strong> automatically approve its attachments — those must be approved separately in the Attachments column.
      </p>

      {error && <p className="text-danger-600 mb-3">{error}</p>}

      {loading ? (
        <div className="text-center py-5">
          <span className="spinner-border spinner-border-sm"></span>
          <span className="ms-2 text-secondary-light">Loading activities…</span>
        </div>
      ) : activities.length === 0 ? (
        <p className="text-secondary-light">No activities found for the selected filters.</p>
      ) : (
        <div className="table-responsive">
          <table className="table bordered-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Teacher</th>
                <th>Student</th>
                <th>Subject</th>
                <th>Notes</th>
                <th>Homework</th>
                <th>Attachments</th>
                <th>Remarks</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(activity => (
                <tr key={activity.id}>
                  <td>
                    {activity?.activity_date
                      ? formatAddedOn(activity.activity_date)
                      : '-'}
                  </td>
                  <td>{activity.teacher?.name ?? '-'}</td>
                  <td>{activity.student?.name ?? '-'}</td>
                  <td>{activity.subject?.subject ?? '-'}</td>
                  <td>{activity.notes ?? '-'}</td>
                  <td>{activity.homework ?? '-'}</td>
                    <td>
                      {activity.attachments && activity.attachments.length > 0 ? (
                        <div className="d-flex flex-column gap-1">
                        {activity.attachments.map(attachment => (
                          <div
                            key={attachment.id}
                            className="d-flex align-items-center gap-2 flex-wrap"
                          >
                            <button
                              type="button"
                              className="btn btn-link btn-sm px-0"
                              onClick={() =>
                                setPreviewContext({
                                  activityId: activity.id,
                                  attachment,
                                })
                              }
                            >
                              {attachment.original_name}
                            </button>
                            <span
                              className={
                                attachment.is_admin_approved
                                  ? 'badge bg-success-subtle text-success'
                                  : 'badge bg-warning-subtle text-warning'
                              }
                            >
                              {attachment.is_admin_approved ? 'Approved' : 'Pending'}
                            </span>
                            {!attachment.is_admin_approved && (
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() =>
                                  approveAttachment(activity.id, attachment.id)
                                }
                              >
                                Approve
                              </button>
                            )}
                            {attachment.is_admin_approved && statusFilter === 'approved' && (
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() =>
                                  approveAttachment(activity.id, attachment.id, false)
                                }
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-secondary-light">No attachments</span>
                    )}
                  </td>
                  <td>{activity.admin_feedback ?? '—'}</td>
                  <td className="text-center">
                    <div className="d-flex flex-column gap-2 align-items-center">
                      {isAdmin && (
                        activity.is_admin_approved ? (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled={processingActivityId === activity.id}
                            onClick={() => handleApprovalToggle(activity.id, false)}
                          >
                            {processingActivityId === activity.id
                              ? 'Updating...'
                              : 'Mark Pending'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={processingActivityId === activity.id}
                            onClick={() => handleApprovalToggle(activity.id, true)}
                          >
                            {processingActivityId === activity.id
                              ? 'Updating...'
                              : 'Approve Activity'}
                          </button>
                        )
                      )}
                      {renderNotificationMeta(
                        'Student notification',
                        activity.student_notification,
                      )}
                      {renderNotificationMeta(
                        'Teacher notification',
                        activity.teacher_notification,
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        show={!!previewContext}
        onHide={() => setPreviewContext(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Attachment Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewContext ? (
            previewContext.attachment.file_type === 'pdf' ? (
              <iframe
                title="Attachment preview"
                src={`${getAttachmentUrl(previewContext.attachment)}#toolbar=0`}
                className="w-100"
                style={{ minHeight: '70vh' }}
              ></iframe>
            ) : (
              <img
                src={getAttachmentUrl(previewContext.attachment)}
                alt={previewContext.attachment.original_name}
                className="img-fluid"
              />
            )
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
  )
}
