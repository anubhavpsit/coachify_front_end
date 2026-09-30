import { useEffect, useState } from 'react'
import type { TopStudent } from '../types'
import { fetchTopStudents } from '../services/dashboardService'

/** GET /dashboard/assessments/top-students, only with `dashboard.top_students`. */
export function useTopStudents(enabled: boolean) {
  const [students, setStudents] = useState<TopStudent[]>([])
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    const token = localStorage.getItem('authToken')
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- nothing to fetch
      setLoading(false)
      return
    }
    fetchTopStudents(token)
      .then((body) => {
        if (body.success) setStudents(body.data || [])
      })
      .catch((error) => console.error('Error loading top students:', error))
      .finally(() => setLoading(false))
  }, [enabled])

  return { students, loading }
}
