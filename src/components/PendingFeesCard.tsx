import { useEffect, useState } from 'react'
import axios from 'axios'
import { formatDate } from '../utils/date'
import { Modal, Button } from 'react-bootstrap'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

type PendingFee = {
  student_id: number
  student_name: string
  student_email?: string
  student_status?: string
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

type CoachingClass = {
  id: number
  name: string
}

export default function PendingFeesCard() {
  const [items, setItems] = useState<PendingFee[]>([])
  const [classes, setClasses] = useState<CoachingClass[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [asOfDate, setAsOfDate] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [details, setDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenant_id') : null

  const getClassName = (classIdOrName: string | null | undefined) => {
    if (!classIdOrName) return '-'
    const found = classes.find((c) => String(c.id) === String(classIdOrName))
    return found ? found.name : classIdOrName
  }

  useEffect(() => {
    const loadPendingFees = async () => {
      setLoading(true)
      setError(null)

      try {
        if (!token) {
          setError('You are not authenticated.')
          setLoading(false)
          return
        }

        const [feesResponse, classRes] = await Promise.all([
          axios.get<PendingFeesResponse>(
            `${API_BASE_URL}/dashboard/pending-fees`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
            },
          ),
          axios.get<{ data: CoachingClass[] }>(
            `${API_BASE_URL}/classes/${tenantId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ])

        if (feesResponse.data.success) {
          setItems(feesResponse.data.data || [])
          if (feesResponse.data.meta?.today) {
            setAsOfDate(feesResponse.data.meta.today)
          }
        } else {
          setError('Unable to load pending fees.')
        }
        setClasses(classRes.data.data || [])
      } catch (err) {
        console.error('Error loading pending fees:', err)
        setError('Unable to load pending fees.')
      } finally {
        setLoading(false)
      }
    }

    loadPendingFees()
  }, [])

  const openDetails = async (studentId: number) => {
    if (!token) return
    setShowDetails(true)
    setDetails(null)
    setDetailsError(null)
    setDetailsLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/student-fees/${studentId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.data?.success) {
        setDetails(res.data.data)
      } else {
        setDetailsError('Unable to load fee details.')
      }
    } catch (e) {
      setDetailsError('Unable to load fee details.')
    } finally {
      setDetailsLoading(false)
    }
  }

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
            <div style={{ maxHeight: '350px', overflowY: items.length > 5 ? 'auto' : 'visible' }}>
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
                      <tr key={item.student_id} onClick={() => openDetails(item.student_id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="d-flex flex-column">
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-semibold text-sm">{item.student_name}</span>
                              {item.student_status && (
                                <span className={`badge text-xs fw-medium ${item.student_status === 'active' ? 'bg-success-100 text-success-600' : 'bg-secondary-100 text-secondary-600'}`}>
                                  {item.student_status}
                                </span>
                              )}
                            </div>
                            {item.student_email && (
                              <span className="text-xs text-secondary-light">
                                {item.student_email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{getClassName(item.class)}</td>
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
            </div>
          )}
        </div>
      </div>
      <FeeDetailsModal
        show={showDetails}
        onHide={() => setShowDetails(false)}
        loading={detailsLoading}
        error={detailsError}
        details={details}
      />
    </div>
  )
}

function FeeDetailsModal({
  show,
  onHide,
  loading,
  error,
  details,
}: {
  show: boolean
  onHide: () => void
  loading: boolean
  error: string | null
  details: any | null
}) {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Fee Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <p className="text-danger-600 text-sm mb-0">{error}</p>
        ) : details ? (
          <div>
            <div className="mb-3">
              <h6 className="mb-1">{details.student?.name}</h6>
              <p className="text-sm text-secondary-light mb-0">
                {details.student?.email} · Class: {details.student?.class ?? '-'} · Phone: {details.student?.phone ?? '-'}
              </p>
            </div>
            <div className="mb-3">
              <p className="mb-1"><strong>Total Paid:</strong> ₹{Number(details.summary?.total_paid || 0).toFixed(2)}</p>
              <p className="mb-1"><strong>Last Paid Till:</strong> {formatDate(details.summary?.last_paid_to_date)}</p>
              <p className="mb-1"><strong>Next Due Date:</strong> {formatDate(details.summary?.next_due_date)}</p>
              <p className="mb-1"><strong>Days Overdue:</strong> {details.summary?.days_overdue ?? 0}</p>
              <p className="mb-1"><strong>Unpaid Periods (approx):</strong> {details.summary?.unpaid_periods ?? 0}</p>
            </div>
            <div className="table-responsive">
              <table className="table bordered-table mb-0 text-sm">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Amount</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(details.fees) && details.fees.length > 0 ? (
                    details.fees.map((fee: any) => (
                      <tr key={fee.id}>
                        <td>{formatDate(fee.from_date)}</td>
                        <td>{formatDate(fee.to_date)}</td>
                        <td>₹{Number(fee.amount || 0).toFixed(2)}</td>
                        <td>{fee.payment_mode}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center text-secondary-light">No payments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  )
}
