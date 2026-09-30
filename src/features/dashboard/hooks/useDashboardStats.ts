import { useCallback, useEffect, useState } from 'react'
import type { DashboardStats } from '../types'
import { fetchDashboardStats } from '../services/dashboardService'

const LOAD_ERROR = 'Unable to load dashboard stats.'

/** GET /dashboard/stats, only when `enabled` (same permission gate as before). */
export function useDashboardStats(enabled: boolean) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setError('You are not authenticated.')
        return
      }
      const body = await fetchDashboardStats(token)
      if (body.success) setStats(body.data)
      else setError(LOAD_ERROR)
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
      setError(LOAD_ERROR)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void load()
  }, [load])

  return { stats, loading, error, reload: load }
}
