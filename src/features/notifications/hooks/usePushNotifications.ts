import { useEffect, useState } from 'react'
import axios from 'axios'
import { ROLES } from '@/constants/roles'
import { usePermission } from '@/permissions'
import {
  buildPushParams,
  fetchPushNotifications,
  type NotificationRecord,
  type Option,
  type PaginationMeta,
  type PushFilters,
} from '../services/pushNotificationsService'

export const DEFAULT_PUSH_FILTERS: PushFilters = {
  status: 'all',
  type: 'all',
  search: '',
  startDate: '',
  endDate: '',
  sortBy: 'created_at',
  sortDirection: 'desc',
  perPage: 10,
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}

/**
 * Logic of the legacy admin NotificationsPage. Page-level gate kept as-is
 * (PERMISSIONS_MAP Q10): only coaching_admin / super_admin fetch; others get
 * the same error message.
 */
export function usePushNotifications() {
  const { hasRole } = usePermission()
  const allowed = hasRole(ROLES.COACHING_ADMIN, ROLES.SUPER_ADMIN)
  const [filters, setFilters] = useState<PushFilters>(DEFAULT_PUSH_FILTERS)
  const search = useDebounced(filters.search, 300)
  const [page, setPage] = useState(1)
  const [records, setRecords] = useState<NotificationRecord[]>([])
  const [options, setOptions] = useState<{ types: Option[]; statuses: Option[] }>({ types: [], statuses: [] })
  const [stats, setStats] = useState({ pending: 0, failed: 0, sent_today: 0 })
  const [pagination, setPagination] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadFlag, setReloadFlag] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      if (!token) {
        setError('Sign in to view notifications.')
        return
      }
      if (!allowed) {
        setError('Only coaching admins can view notifications.')
        return
      }
      setLoading(true)
      setError(null)
      fetchPushNotifications(token, buildPushParams({ ...filters, search }, page), controller.signal)
        .then((data) => {
          const incoming = data.notifications || []
          setRecords((prev) => (page === 1 ? incoming : [...prev, ...incoming]))
          setPagination(data.pagination)
          setStats(data.stats)
          setOptions(data.filters)
        })
        .catch((thrown) => {
          if (axios.isCancel(thrown)) return
          setError('Unable to load notifications. Please try again later.')
          setRecords([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    })
    return () => controller.abort()
    // `filters.search` is applied through its debounced copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, page, filters.status, filters.type, filters.startDate, filters.endDate, filters.sortBy, filters.sortDirection, filters.perPage, search, reloadFlag])

  // Any filter change goes back to page 1 (as before).
  const update = (changes: Partial<PushFilters>) => {
    setFilters((f) => ({ ...f, ...changes }))
    setPage(1)
  }

  return {
    allowed,
    filters,
    update,
    // Legacy reset also switched per-page to 25.
    reset: () => update({ ...DEFAULT_PUSH_FILTERS, perPage: 25 }),
    records,
    options,
    stats,
    pagination,
    loading,
    error,
    page,
    loadNextPage: () => setPage((p) => Math.min(pagination.last_page, p + 1)),
    hasMore: page < pagination.last_page,
    refresh: () => setReloadFlag((n) => n + 1),
  }
}
