import { useEffect, useState } from 'react'
import axios from 'axios'
import { can } from '../lib/auth'

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

type NotifyState = 'idle' | 'sending' | 'sent' | 'error'

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export default function TeacherActivityGapsCard() {
  const [data, setData] = useState<GapsResponse['data'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notify, setNotify] = useState<Record<number, NotifyState>>({})
  const [notifyMsg, setNotifyMsg] = useState<Record<number, string>>({})

  const canNotify = can('dashboard.notify_activity_gaps')

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

  const handleNotify = async (teacherId: number) => {
    setNotify((s) => ({ ...s, [teacherId]: 'sending' }))
    setNotifyMsg((s) => ({ ...s, [teacherId]: '' }))
    try {
      const token = localStorage.getItem('authToken')
      const response = await axios.post<{ success: boolean; message: string }>(
        `${API_BASE_URL}/dashboard/teacher-activity-gaps/${teacherId}/notify`,
        {},
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      )
      setNotify((s) => ({ ...s, [teacherId]: 'sent' }))
      setNotifyMsg((s) => ({ ...s, [teacherId]: response.data.message }))
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to send the reminder.'
      setNotify((s) => ({ ...s, [teacherId]: 'error' }))
      setNotifyMsg((s) => ({ ...s, [teacherId]: message }))
    }
  }

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
              {teachers.map((teacher) => {
                const state = notify[teacher.teacher_id] ?? 'idle'
                return (
                  <li
                    key={teacher.teacher_id}
                    className="d-flex justify-content-between align-items-start mb-2"
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <strong>{teacher.teacher_name}</strong>
                        {canNotify && (
                          <button
                            type="button"
                            className={`btn btn-sm py-0 px-2 ${
                              state === 'sent'
                                ? 'btn-success'
                                : state === 'error'
                                  ? 'btn-outline-danger'
                                  : 'btn-outline-primary'
                            }`}
                            disabled={state === 'sending' || state === 'sent'}
                            onClick={() => handleNotify(teacher.teacher_id)}
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
                      </div>
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
                      {notifyMsg[teacher.teacher_id] && (
                        <div
                          className={`text-xs mt-1 ${
                            state === 'error' ? 'text-danger-600' : 'text-success-600'
                          }`}
                        >
                          {notifyMsg[teacher.teacher_id]}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
