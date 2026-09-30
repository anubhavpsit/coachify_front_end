import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useAuthUser } from '@/permissions'
import { formatDate, toDateInputValue } from '@/utils/date'
import {
  buildLogParams,
  fetchActivityLogs,
  fetchUsers,
  type ActivityLog,
  type DashboardUser,
  type LogFilters,
  type Pagination,
} from './activityLogService'

export function createDefaultRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 7)
  return { start: toDateInputValue(start), end: toDateInputValue(end) }
}

export function defaultFilters(): LogFilters {
  const range = createDefaultRange()
  return { role: 'all', module: 'all', userId: 'all', startDate: range.start, endDate: range.end }
}

/** Logic of the legacy ActivityLogCard, unchanged (requests, params, user list). */
export function useActivityLogs() {
  const authUser = useAuthUser()
  const [filters, setFilters] = useState<LogFilters>(defaultFilters)
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [modules, setModules] = useState<string[]>([])
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, last_page: 1, total: 0, per_page: 25 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<DashboardUser[]>([])
  const modulesLoaded = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const controller = new AbortController()
    // Deferred so state updates happen outside the effect body.
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      if (!token) {
        setError('Sign in to view activity logs.')
        return
      }
      setLoading(true)
      setError(null)
      fetchActivityLogs(token, buildLogParams(filters, page, pagination.per_page, !modulesLoaded.current), controller.signal)
        .then((data) => {
          setLogs(data.logs || [])
          if (data.modules) {
            setModules(data.modules)
            modulesLoaded.current = data.modules.length > 0
          }
          setPagination((prev) => ({ ...prev, ...data.pagination }))
        })
        .catch((thrown) => {
          if (axios.isCancel(thrown)) return
          setError('Unable to load activity logs.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    })
    return () => controller.abort()
  }, [filters, page, pagination.per_page])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    fetchUsers(token)
      .then((list) => {
        const tenantId = typeof authUser?.tenant_id === 'number' ? authUser.tenant_id : null
        const filtered = tenantId ? list.filter((u) => u.tenant_id === tenantId) : list
        const adminEntry =
          authUser?.role === 'coaching_admin' && typeof authUser?.id === 'number'
            ? [{ id: authUser.id, name: `${authUser?.name || 'You'} (Admin)`, role: 'coaching_admin', tenant_id: tenantId }]
            : []
        setUsers([...adminEntry, ...filtered])
      })
      .catch(() => setUsers([]))
  }, [authUser?.id, authUser?.name, authUser?.role, authUser?.tenant_id])

  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>()
    for (const log of logs) {
      const key = formatDate(log.created_at) // local date, as before
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(log)
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
  }, [logs])

  const updateFilters = (changes: Partial<LogFilters>) => {
    setFilters((prev) => ({ ...prev, ...changes }))
    setPage(1)
  }

  return {
    filters,
    updateFilters,
    resetFilters: () => updateFilters(defaultFilters()),
    page,
    setPage,
    pagination,
    groups,
    modules,
    users,
    loading,
    error,
    isEmpty: logs.length === 0,
  }
}
