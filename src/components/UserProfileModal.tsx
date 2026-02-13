import { useEffect, useState } from 'react'
import { Modal, Button } from 'react-bootstrap'
import axios from 'axios'
import Avatar from './common/Avatar'
import { formatDate } from '../utils/date'
import { Spinner } from 'react-bootstrap'

interface StudentProfile {
  class?: string
  subjects?: (string | number)[]
  phone?: string
}

interface UserProfile {
  id: number
  name: string
  email: string
  role: string
  dob?: string | null
  created_at?: string | null
  profile_img?: string | null
  profile_image?: string | null
  tenant_id: number
  student_profile?: StudentProfile | null
}

interface UserProfileModalProps {
  userId: number | null
  show: boolean
  onHide: () => void
  canEditImage: boolean
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function UserProfileModal({
  userId,
  show,
  onHide,
  canEditImage,
}: UserProfileModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [authRole, setAuthRole] = useState<string>('')

  // Fees summary state (admin-only)
  const [feesLoading, setFeesLoading] = useState(false)
  const [feesForbidden, setFeesForbidden] = useState(false)
  const [feesError, setFeesError] = useState<string | null>(null)
  const [feeSummary, setFeeSummary] = useState<{
    last_paid_at: string | null
    last_paid_amount: number | null
    last_payment_mode?: string | null
    next_due_date: string
    is_overdue: boolean
    days_overdue: number
    status_label?: string
  } | null>(null)
  // Fee history (admin-only)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [feeHistory, setFeeHistory] = useState<Array<{
    id: number
    from_date: string
    to_date: string
    paid_at?: string | null
    amount: number
    status?: string
    payment_mode?: string
  }>>([])

  useEffect(() => {
    const authUser = JSON.parse(localStorage.getItem('authUser') || '{}')
    setAuthRole(authUser.role || '')
    if (!show || !userId) return

    const fetchProfile = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('authToken')
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setUser(response.data.data)
        }
      } catch (err) {
        console.error('Error fetching user profile', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [show, userId])

  // Load fee summary when admin views a student
  useEffect(() => {
    const shouldLoadFees =
      show && !!userId && authRole === 'coaching_admin' && user?.role === 'student'
    if (!shouldLoadFees) return

    const loadFees = async () => {
      setFeesLoading(true)
      setFeesError(null)
      setFeesForbidden(false)
      try {
        const token = localStorage.getItem('authToken')
        const res = await axios.get(`${API_BASE_URL}/students/${userId}/fee-summary`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        if (res.data?.success) {
          setFeeSummary(res.data.data)
        } else {
          setFeesError('Unable to load fee summary.')
        }
      } catch (err: any) {
        const status = err?.response?.status
        if (status === 403) {
          setFeesForbidden(true)
        } else if (status === 404) {
          setFeesError('No fee history available.')
        } else {
          setFeesError('Unable to load fee summary.')
        }
      } finally {
        setFeesLoading(false)
      }
    }

    loadFees()
  }, [show, userId, authRole, user])

  // Load fee history list
  useEffect(() => {
    const shouldLoad = show && !!userId && authRole === 'coaching_admin' && user?.role === 'student'
    if (!shouldLoad) return
    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const token = localStorage.getItem('authToken')
        const res = await axios.get(`${API_BASE_URL}/students/${userId}/fees?limit=10`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        if (res.data?.success && Array.isArray(res.data.items)) {
          setFeeHistory(res.data.items)
        } else {
          setHistoryError('Unable to load fee history.')
        }
      } catch (e: any) {
        if (e?.response?.status !== 403) {
          setHistoryError('Unable to load fee history.')
        }
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [show, userId, authRole, user])

  // date display handled via shared util

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !userId) return

    setUploading(true)
    try {
      const token = localStorage.getItem('authToken')
      const formData = new FormData()
      formData.append('profile_image', file)

      const response = await axios.post(
        `${API_BASE_URL}/users/${userId}/profile-image`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      )

      if (response.data.success) {
        setUser(response.data.data)
        setFile(null)
      }
    } catch (err) {
      console.error('Error uploading profile image', err)
      alert('Failed to upload profile image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>User Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading || !user ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <>
            <div className="d-flex align-items-center gap-3 mb-3">
              <Avatar
                user={{
                  name: user.name,
                  profile_image: user.profile_image ?? undefined,
                }}
                size={64}
              />
              <div>
                <h6 className="mb-1">{user.name}</h6>
                <div className="text-sm text-secondary-light">{user.email}</div>
                <div className="text-sm text-secondary-light">
                  Role: {user.role}
                </div>
                {user.dob && (
                  <div className="text-sm text-secondary-light">
                    DOB: {formatDate(user.dob)}
                  </div>
                )}
              </div>
            </div>

            {user.role === 'student' && (
              <div className="mb-3">
                <h6 className="fw-semibold mb-2">Student Details</h6>
                {user.student_profile && (
                  <>
                    <div className="text-sm">Class: {user.student_profile.class}</div>
                    <div className="text-sm">Phone: {user.student_profile.phone || '-'}</div>
                  </>
                )}
                <div className="text-sm">Admission: {formatDate(user.created_at)}</div>
                {authRole === 'coaching_admin' && user.student_profile && (
                  <>
                    <div className="text-sm">Next Fee Due: {formatDate((user.student_profile as any).fee_due_date as string)}</div>
                    <div className="text-sm">Trial Days: {(user.student_profile as any).trial_days ?? '-'}</div>
                  </>
                )}
              </div>
            )}

            {/* Fees (Admin-only) */}
            {authRole === 'coaching_admin' && user.role === 'student' && !feesForbidden && (
              <div className="mb-3">
                <h6 className="fw-semibold mb-2">Fees</h6>
                {feesLoading ? (
                  <div className="d-flex align-items-center gap-2 text-sm">
                    <Spinner size="sm" animation="border" />
                    <span>Loading fees…</span>
                  </div>
                ) : feesError ? (
                  <div className="text-sm text-secondary-light">{feesError}</div>
                ) : feeSummary ? (
                  <>
                    <div className="text-sm mb-1">
                      Last fees paid: {feeSummary.last_paid_at ? formatDate(feeSummary.last_paid_at) : 'No fee history'}
                      {typeof feeSummary.last_paid_amount === 'number' && !Number.isNaN(feeSummary.last_paid_amount) && (
                        <> (₹{Number(feeSummary.last_paid_amount).toFixed(2)})</>
                      )}
                    </div>
                    <div className="text-sm mb-1">Next fees due: {formatDate(feeSummary.next_due_date)}</div>
                    <div className="text-sm">
                      {feeSummary.is_overdue ? (
                        <span className="badge bg-danger-subtle text-danger-600">
                          ⚠ Fees overdue: Due on {formatDate(feeSummary.next_due_date)}{feeSummary.days_overdue ? ` (${feeSummary.days_overdue} days overdue)` : ''}
                        </span>
                      ) : (
                        <span className="badge bg-success-subtle text-success-600">
                          {new Date(feeSummary.next_due_date).toDateString() === new Date().toDateString()
                            ? 'Due today'
                            : `Paid - Next due on ${formatDate(feeSummary.next_due_date)}`}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-secondary-light">No fee history available.</div>
                )}
              </div>
            )}

            {/* Fee History (Admin-only) */}
            {authRole === 'coaching_admin' && user.role === 'student' && (
              <div className="mt-3">
                <h6 className="fw-semibold mb-2">Fees History</h6>
                {historyLoading ? (
                  <div className="text-sm text-secondary-light">Loading history…</div>
                ) : feeHistory.length === 0 ? (
                  <div className="text-sm text-secondary-light">No fees history found.</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table bordered-table mb-0 text-sm">
                      <thead>
                        <tr>
                          <th>Period</th>
                          <th>Paid On</th>
                          <th>Amount</th>
                          <th>Mode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeHistory.map((item) => (
                          <tr key={item.id}>
                            <td>{formatDate(item.from_date)} → {formatDate(item.to_date)}</td>
                            <td>{formatDate(item.paid_at)}</td>
                            <td>₹{Number(item.amount).toFixed(2)}</td>
                            <td>{item.payment_mode || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {historyError && (
                  <div className="text-sm text-danger-600 mt-1">{historyError}</div>
                )}
              </div>
            )}

            {canEditImage && (
              <form onSubmit={handleUpload} className="mt-3">
                <h6 className="fw-semibold mb-2">Update Profile Image</h6>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control mb-2"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0])
                    }
                  }}
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={uploading || !file}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </form>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  )
}
