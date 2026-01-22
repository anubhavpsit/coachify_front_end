import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import axios from 'axios'
import Icon from '../../components/common/Icon.tsx'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

type UserSummary = {
  id: number
  name: string
  role: string
  profile_img?: string | null
}

type Option = {
  value: string
  label: string
}

type NotificationRecord = {
  id: number
  sent_to: number
  sent_from: number
  channel: string
  type: string
  title: string
  body: string | null
  payload: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  status: string
  attempts: number
  max_attempts: number
  scheduled_for: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  last_error: string | null
  recipient?: UserSummary | null
  sender?: UserSummary | null
}

type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

type ApiResponse = {
  success: boolean
  data: {
    notifications: NotificationRecord[]
    pagination: PaginationMeta
    filters: {
      types: Option[]
      statuses: Option[]
    }
    stats: {
      pending: number
      failed: number
      sent_today: number
    }
  }
}

const statusClassMap: Record<string, string> = {
  pending: 'badge bg-warning-100 text-warning-600',
  processing: 'badge bg-info-100 text-info-600',
  retrying: 'badge bg-purple-100 text-purple-600',
  sent: 'badge bg-success-100 text-success-600',
  failed: 'badge bg-danger-100 text-danger-600',
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const truncate = (value: string | null | undefined, length = 120) => {
  if (!value) return '—'
  return value.length > length ? `${value.slice(0, length)}…` : value
}

export default function NotificationsPage() {
  const [records, setRecords] = useState<NotificationRecord[]>([])
  const [options, setOptions] = useState<{ types: Option[]; statuses: Option[] }>(
    { types: [], statuses: [] },
  )
  const [stats, setStats] = useState({ pending: 0, failed: 0, sent_today: 0 })
  const [pagination, setPagination] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
  })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'sent_at' | 'status' | 'type'>(
    'created_at',
  )
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadFlag, setReloadFlag] = useState(0)
  const [sendingNotificationId, setSendingNotificationId] = useState<number | null>(
    null,
  )

  const token =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('authToken')
      : null

  useEffect(() => {
    if (!token) {
      setError('Sign in to view notifications.')
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('per_page', String(perPage))
    params.append('sort_by', sortBy)
    params.append('sort_direction', sortDirection)
    if (statusFilter !== 'all') {
      params.append('status', statusFilter)
    }
    if (typeFilter !== 'all') {
      params.append('type', typeFilter)
    }
    if (search.trim()) {
      params.append('search', search.trim())
    }
    if (startDate) {
      params.append('start_date', startDate)
    }
    if (endDate) {
      params.append('end_date', endDate)
    }

    setLoading(true)
    setError(null)

    axios
      .get<ApiResponse>(`${API_BASE_URL}/notifications?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        },
      )
      .then((response) => {
        setRecords(response.data.data.notifications || [])
        setPagination(response.data.data.pagination)
        setStats(response.data.data.stats)
        setOptions(response.data.data.filters)
      })
      .catch((thrown) => {
        if (axios.isCancel(thrown)) return
        setError('Unable to load notifications. Please try again later.')
        setRecords([])
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [
    token,
    page,
    perPage,
    statusFilter,
    typeFilter,
    search,
    startDate,
    endDate,
    sortBy,
    sortDirection,
    reloadFlag,
  ])

  const statusOptions = useMemo<Option[]>(() => {
    const base: Option[] = [{ value: 'all', label: 'All statuses' }]
    return [...base, ...options.statuses]
  }, [options.statuses])

  const typeOptions = useMemo<Option[]>(() => {
    const base: Option[] = [{ value: 'all', label: 'All notification types' }]
    return [...base, ...options.types]
  }, [options.types])

  const handleReset = () => {
    setStatusFilter('all')
    setTypeFilter('all')
    setSearch('')
    setStartDate('')
    setEndDate('')
    setSortBy('created_at')
    setSortDirection('desc')
    setPerPage(25)
    setPage(1)
  }

  const handlePerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPerPage(Number(event.target.value))
    setPage(1)
  }

  const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value)
    setPage(1)
  }

  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(event.target.value)
    setPage(1)
  }

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
  }

  const totalStart = (pagination.current_page - 1) * pagination.per_page + 1
  const totalEnd = Math.min(
    pagination.current_page * pagination.per_page,
    pagination.total,
  )

  const renderStatusBadge = (status: string) => {
    const normalized = status.toLowerCase()
    const className = statusClassMap[normalized] ?? 'badge bg-neutral-100 text-neutral-600'
    return <span className={className}>{normalized.replace('_', ' ')}</span>
  }

  const refreshTable = () => setReloadFlag((previous) => previous + 1)

  const handleSendNotification = async (notificationId: number) => {
    if (!token) return

    setSendingNotificationId(notificationId)
    try {
      await axios.post(
        `${API_BASE_URL}/notifications/${notificationId}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      refreshTable()
    } catch (apiError) {
      console.error('Failed to send notification', apiError)
      alert('Unable to send notification. Please review it and try again.')
    } finally {
      setSendingNotificationId(null)
    }
  }

  return (
    <div className="dashboard-main-body">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Push Notifications</h6>
        <ul className="d-flex align-items-center gap-2">
          <li className="fw-medium">
            <span className="d-flex align-items-center gap-1 hover-text-primary">
              <Icon
                icon="solar:home-smile-angle-outline"
                className="icon text-lg"
              />
              Dashboard
            </span>
          </li>
          <li>-</li>
          <li className="fw-medium">Notifications</li>
        </ul>
      </div>

      <div className="row g-3 mb-24">
        <div className="col-md-4">
          <div className="card p-20 radius-12 border border-warning-100 bg-warning-50">
            <p className="text-sm text-warning-600 mb-8">Pending queue</p>
            <h4 className="mb-0 text-warning-800">{stats.pending}</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-20 radius-12 border border-danger-100 bg-danger-50">
            <p className="text-sm text-danger-600 mb-8">Failed deliveries</p>
            <h4 className="mb-0 text-danger-800">{stats.failed}</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-20 radius-12 border border-success-100 bg-success-50">
            <p className="text-sm text-success-600 mb-8">Sent today</p>
            <h4 className="mb-0 text-success-800">{stats.sent_today}</h4>
          </div>
        </div>
      </div>

      <div className="card radius-12 p-24 mb-24">
        <form
          className="row g-3"
          onSubmit={handleSearchSubmit}
        >
          <div className="col-md-3">
            <label className="form-label text-sm text-primary-light">Search</label>
            <input
              type="text"
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or body"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label text-sm text-primary-light">Status</label>
            <select
              className="form-select"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label text-sm text-primary-light">Type</label>
            <select
              className="form-select"
              value={typeFilter}
              onChange={handleTypeChange}
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label text-sm text-primary-light">Sort by</label>
            <div className="d-flex gap-2">
              <select
                className="form-select"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as typeof sortBy)
                  setPage(1)
                }}
              >
                <option value="created_at">Created</option>
                <option value="sent_at">Sent date</option>
                <option value="status">Status</option>
                <option value="type">Type</option>
              </select>
              <select
                className="form-select"
                value={sortDirection}
                onChange={(event) => {
                  setSortDirection(event.target.value as typeof sortDirection)
                  setPage(1)
                }}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label text-sm text-primary-light">Start date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label text-sm text-primary-light">End date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="col-12 d-flex align-items-end gap-3">
            <button type="submit" className="btn btn-primary px-32">
              Apply
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleReset}
            >
              Reset filters
            </button>
          </div>
        </form>
      </div>

      <div className="card radius-12">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Title & Body</th>
                  <th>Recipient</th>
                  <th>Sender</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Created</th>
                  <th>Sent at</th>
                  <th>Last error</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={10} className="text-center py-4">
                      Loading notifications…
                    </td>
                  </tr>
                )}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-4">
                      {error ?? 'No notifications found for the selected filters.'}
                    </td>
                  </tr>
                )}
                {!loading &&
                  records.map((notification) => (
                    <tr key={notification.id}>
                      <td>
                        <div className="fw-semibold text-truncate">
                          {notification.title}
                        </div>
                        <div className="text-sm text-secondary-light">
                          {truncate(notification.body)}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">
                          {notification.recipient?.name ?? `User #${notification.sent_to}`}
                        </div>
                        <div className="text-sm text-secondary-light text-capitalize">
                          {notification.recipient?.role ?? 'unknown'}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">
                          {notification.sender?.name ?? 'System'}
                        </div>
                        <div className="text-sm text-secondary-light text-capitalize">
                          {notification.sender?.role ?? 'automated'}
                        </div>
                      </td>
                      <td className="text-capitalize">{notification.type.replace(/_/g, ' ')}</td>
                      <td>{renderStatusBadge(notification.status)}</td>
                      <td>
                        {notification.attempts}/{notification.max_attempts}
                      </td>
                      <td>{formatDateTime(notification.created_at)}</td>
                      <td>{formatDateTime(notification.sent_at)}</td>
                      <td>
                        <span className="text-sm text-danger-600">
                          {truncate(notification.last_error, 80)}
                        </span>
                      </td>
                      <td>
                        {notification.status.toLowerCase() === 'sent' ? (
                          <span className="text-success-600 text-sm">Sent</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            disabled={sendingNotificationId === notification.id}
                            onClick={() => handleSendNotification(notification.id)}
                          >
                            {sendingNotificationId === notification.id
                              ? 'Sending...'
                              : 'Send now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mt-16">
        <div className="text-sm text-secondary-light">
          Showing {pagination.total === 0 ? 0 : totalStart} to {totalEnd} of{' '}
          {pagination.total} entries
        </div>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select text-sm"
            value={perPage}
            onChange={handlePerPageChange}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <div className="btn-group">
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={page <= 1}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={page >= pagination.last_page}
              onClick={() =>
                setPage((previous) =>
                  Math.min(pagination.last_page, previous + 1),
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
