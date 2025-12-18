import { useEffect, useState } from 'react'
import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

type PendingFee = {
  student_id: number
  student_name: string
  student_email?: string
  class?: string | null
  phone?: string | null
  last_paid_to_date?: string | null
  due_date: string
  days_overdue: number
}

type PendingFeesResponse = {
  success: boolean
  data: PendingFee[]
  meta?: {
    today?: string
    total_pending_students?: number
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export default function PendingFeesCard() {
  const [items, setItems] = useState<PendingFee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [asOfDate, setAsOfDate] = useState<string | null>(null)

  useEffect(() => {
    const loadPendingFees = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = sessionStorage.getItem('authToken')
        if (!token) {
          setError('You are not authenticated.')
          setLoading(false)
          return
        }

        const response = await axios.get<PendingFeesResponse>(
          `${API_BASE_URL}/dashboard/pending-fees`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        )

        if (response.data.success) {
          setItems(response.data.data || [])
          if (response.data.meta?.today) {
            setAsOfDate(response.data.meta.today)
          }
        } else {
          setError('Unable to load pending fees.')
        }
      } catch (err) {
        console.error('Error loading pending fees:', err)
        setError('Unable to load pending fees.')
      } finally {
        setLoading(false)
      }
    }

    loadPendingFees()
  }, [])

  if (!loading && !error && items.length === 0) {
    return null
  }

  return (
    <div className="col-12">
      <div className="card mb-3">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold text-lg">Students with Pending Fees</h6>
          {asOfDate && (
            <span className="text-xs text-secondary-light">
              As of {formatDate(asOfDate)}
            </span>
          )}
        </div>
        <div className="card-body">
          {loading && <p>Loading...</p>}
          {error && !loading && (
            <p className="text-danger-600 text-sm mb-0">{error}</p>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Phone</th>
                    <th>Last Paid Till</th>
                    <th>Due Since</th>
                    <th>Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.student_id}>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold text-sm">
                            {item.student_name}
                          </span>
                          {item.student_email && (
                            <span className="text-xs text-secondary-light">
                              {item.student_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{item.class ?? '-'}</td>
                      <td>{item.phone ?? '-'}</td>
                      <td>
                        {item.last_paid_to_date
                          ? formatDate(item.last_paid_to_date)
                          : 'Never'}
                      </td>
                      <td>{formatDate(item.due_date)}</td>
                      <td>{item.days_overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

