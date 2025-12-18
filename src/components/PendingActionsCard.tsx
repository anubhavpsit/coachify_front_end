import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

type PendingAction = {
  type: string
  date?: string
  title: string
  description: string
  action_route?: string
  severity?: 'low' | 'medium' | 'high'
}

export default function PendingActionsCard() {
  const [actions, setActions] = useState<PendingAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('')

  useEffect(() => {
    const loadActions = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = sessionStorage.getItem('authToken')
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

  if (!loading && !error && actions.length === 0) {
    return null
  }

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
                <ul className="list-unstyled mb-0">
                  {filteredActions.map((action, index) => (
                    <li
                      key={`${action.type}-${action.date ?? index}`}
                      className="d-flex justify-content-between align-items-center mb-2"
                    >
                      <div>
                        <strong>{action.title}</strong>
                        <br />
                        <span className="text-sm text-secondary-light">
                          {action.description}
                        </span>
                      </div>
                      {action.action_route && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleOpen(action)}
                        >
                          Open
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
