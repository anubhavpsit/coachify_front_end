import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

type TeacherGap = {
  teacher_id: number
  teacher_name: string
  teacher_email?: string
  missing_dates: string[]
  missing_days_count: number
}

type GapsResponse = {
  success: boolean
  data: {
    from: string
    to: string
    teachers: TeacherGap[]
  }
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export default function TeacherActivityGapsCard() {
  const [data, setData] = useState<GapsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadGaps = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          setLoading(false)
          return
        }

        const response = await axios.get<GapsResponse>(
          `${API_BASE_URL}/dashboard/teacher-activity-gaps`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )

        if (response.data.success) {
          setData(response.data.data)
        } else {
          setError('Unable to load teacher activity gaps.')
        }
      } catch (err) {
        console.error('Error loading teacher activity gaps:', err)
        setError('Unable to load teacher activity gaps.')
      } finally {
        setLoading(false)
      }
    }

    loadGaps()
  }, [])

  const teachers = data?.teachers ?? []

  if (!loading && !error && (!data || teachers.length === 0)) {
    return null
  }

  return (
    <div className="col-12">
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold text-lg">Teachers Not Adding Daily Activities</h6>
          {data && (
            <span className="text-xs text-secondary-light">
              Range: {formatDate(data.from)} - {formatDate(data.to)}
            </span>
          )}
        </div>
        <div className="card-body">
          {loading && <p>Loading...</p>}
          {error && !loading && (
            <p className="text-danger-600 text-sm mb-0">{error}</p>
          )}

          {!loading && !error && teachers.length > 0 && (
            <ul className="list-unstyled mb-0">
              {teachers.map((teacher) => (
                <li
                  key={teacher.teacher_id}
                  className="d-flex justify-content-between align-items-start mb-2"
                >
                  <div>
                    <strong>{teacher.teacher_name}</strong>
                    {teacher.teacher_email && (
                      <div className="text-xs text-secondary-light">
                        {teacher.teacher_email}
                      </div>
                    )}
                    <div className="text-xs text-secondary-light mt-1">
                      Missing days: {teacher.missing_days_count}
                      {teacher.missing_dates.length > 0 && (
                        <>
                          {' '}
                          ({teacher.missing_dates
                            .slice(0, 3)
                            .map(formatDate)
                            .join(', ')}
                          {teacher.missing_dates.length > 3 && ' ...'})
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
