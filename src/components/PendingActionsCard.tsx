import { useEffect, useState } from 'react'
import axios from 'axios'
import { can } from '../lib/auth'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

// Pending-action types that name a responsible teacher and can be nudged.
const NOTIFIABLE_REASONS = ['assessment_overdue', 'subject_not_covered', 'subject_gap']

type PendingAction = {
  type: string
  date?: string
  title: string
  description: string
  action_route?: string
  severity?: 'low' | 'medium' | 'high'
  for_teacher_id?: number
  for_teacher_name?: string
  student_name?: string
  subject_name?: string
}

type NotifyState = 'idle' | 'sending' | 'sent' | 'error'

export default function PendingActionsCard() {
  const [actions, setActions] = useState<PendingAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('')
  const [notify, setNotify] = useState<Record<string, NotifyState>>({})
  const [notifyMsg, setNotifyMsg] = useState<Record<string, string>>({})

  const canNotify = can('dashboard.notify_pending_actions')

  useEffect(() => {
    const loadActions = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          setLoading(false)
          return
        }

        const response = await axios.get<{
          success: boolean
          data: PendingAction[]
        }>(`${API_BASE_URL}/dashboard/pending-actions`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.data.success) {
          setActions(response.data.data || [])
        } else {
          setError('Unable to load pending actions.')
        }
      } catch (err) {
        console.error('Error loading pending actions:', err)
        setError('Unable to load pending actions.')
      } finally {
        setLoading(false)
      }
    }

    loadActions()
  }, [])

  const handleOpen = (action: PendingAction) => {
    if (!action.action_route) return
    window.location.href = action.action_route
  }

  const rowKey = (action: PendingAction, index: number) =>
    `${action.type}-${action.for_teacher_id ?? ''}-${action.student_name ?? ''}-${action.subject_name ?? ''}-${index}`

  const isNotifiable = (action: PendingAction) =>
    canNotify &&
    !!action.for_teacher_id &&
    NOTIFIABLE_REASONS.includes(action.type)

  const handleNotify = async (action: PendingAction, key: string) => {
    if (!action.for_teacher_id) return
    setNotify((s) => ({ ...s, [key]: 'sending' }))
    setNotifyMsg((s) => ({ ...s, [key]: '' }))
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.post<{ success: boolean; message: string }>(
        `${API_BASE_URL}/dashboard/pending-actions/notify`,
        {
          teacher_id: action.for_teacher_id,
          reason: action.type,
          student_name: action.student_name,
          subject_name: action.subject_name,
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      )
      setNotify((s) => ({ ...s, [key]: 'sent' }))
      setNotifyMsg((s) => ({ ...s, [key]: response.data.message }))
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to send the reminder.'
      setNotify((s) => ({ ...s, [key]: 'error' }))
      setNotifyMsg((s) => ({ ...s, [key]: message }))
    }
  }

  const typeLabels: Record<string, string> = {
    attendance_missing: 'Attendance',
    expense_missing: 'Expenses',
    daily_activity_missing: 'Daily Activities',
  }

  const availableTypes = Array.from(
    new Set(actions.map((action) => action.type)),
  )

  const filteredActions = actions.filter((action) => {
    if (filterType !== 'all' && action.type !== filterType) {
      return false
    }

    if (filterDate && action.date && action.date !== filterDate) {
      return false
    }

    if (filterDate && !action.date) {
      return false
    }

    return true
  })

  return (
    <div className="col-12">
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold text-lg">Pending Actions</h6>
        </div>
        <div className="card-body">
          {loading && <p>Loading...</p>}
          {error && !loading && (
            <p className="text-danger-600 text-sm mb-0">{error}</p>
          )}

          {!loading && !error && actions.length === 0 && (
            <p className="text-muted mb-0 text-sm">You&apos;re all caught up — no pending actions.</p>
          )}

          {!loading && !error && actions.length > 0 && (
            <>
              <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                {availableTypes.length > 1 && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-sm text-secondary-light">Action</span>
                    <select
                      className="form-select form-select-sm"
                      value={filterType}
                      onChange={(event) => setFilterType(event.target.value)}
                      style={{ minWidth: '160px' }}
                    >
                      <option value="all">All actions</option>
                      {availableTypes.map((type) => (
                        <option key={type} value={type}>
                          {typeLabels[type] ?? type}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="d-flex align-items-center gap-2">
                  <span className="text-sm text-secondary-light">Date</span>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={filterDate}
                    onChange={(event) => setFilterDate(event.target.value)}
                    style={{ maxWidth: '180px' }}
                  />
                </div>
              </div>

              {filteredActions.length === 0 ? (
                <p className="text-muted mb-0 text-sm">
                  No pending actions for the selected filters.
                </p>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: filteredActions.length > 4 ? 'auto' : 'visible', paddingRight: '8px' }}>
                  <ul className="list-unstyled mb-0">
                    {filteredActions.map((action, index) => {
                      const key = rowKey(action, index)
                      const state = notify[key] ?? 'idle'
                      return (
                      <li
                        key={key}
                        className="d-flex justify-content-between align-items-start mb-2 gap-2"
                      >
                        <div>
                          <strong>{action.title}</strong>
                          <br />
                          <span className="text-sm text-secondary-light">
                            {action.description}
                          </span>
                          {notifyMsg[key] && (
                            <div
                              className={`text-xs mt-1 ${
                                state === 'error' ? 'text-danger-600' : 'text-success-600'
                              }`}
                            >
                              {notifyMsg[key]}
                            </div>
                          )}
                        </div>
                        <div className="d-flex flex-column align-items-end gap-1 flex-shrink-0">
                          {isNotifiable(action) && (
                            <button
                              type="button"
                              className={`btn btn-sm ${
                                state === 'sent'
                                  ? 'btn-success'
                                  : state === 'error'
                                    ? 'btn-outline-danger'
                                    : 'btn-outline-primary'
                              }`}
                              disabled={state === 'sending' || state === 'sent'}
                              onClick={() => handleNotify(action, key)}
                              title={
                                action.for_teacher_name
                                  ? `Notify ${action.for_teacher_name}`
                                  : 'Notify teacher'
                              }
                            >
                              {state === 'sending'
                                ? 'Sending…'
                                : state === 'sent'
                                  ? 'Notified'
                                  : state === 'error'
                                    ? 'Retry'
                                    : 'Notify'}
                            </button>
                          )}
                          {action.action_route && !isNotifiable(action) && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleOpen(action)}
                            >
                              Open
                            </button>
                          )}
                        </div>
                      </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
