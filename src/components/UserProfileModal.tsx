import { useEffect, useState } from 'react'
import { Modal, Button, Spinner } from 'react-bootstrap'
import axios from 'axios'
import Avatar from './common/Avatar'
import { formatDate } from '../utils/date'
//
// Student insights types
type SubjectInsightItem = {
  subject_id: number
  subject: string
  activity_count: number
  days_count: number
  share: number
  dates?: string[]
  series?: number[]
}

type SubjectsInsightResp = {
  from: string
  to: string
  window_days: number
  items: SubjectInsightItem[]
  focus?: { overfocus: boolean; underfocus: boolean; notes: string[] }
}

type ChapterInsightItem = { chapter: string; activity_count: number }

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
  current_class_id?: number | null
  current_class_name?: string | null
  attendance_percentage?: number
  not_marked_days?: number
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

  // Insights state (admin + teacher when viewing a student)
  const [insightWindowDays, setInsightWindowDays] = useState<number>(7)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightSubjects, setInsightSubjects] = useState<SubjectInsightItem[]>([])
  const [insightFocusNotes, setInsightFocusNotes] = useState<string[]>([])
  const [selectedSubjectForChapters, setSelectedSubjectForChapters] = useState<number | null>(null)
  const [chaptersLoading, setChaptersLoading] = useState(false)
  const [chapterItems, setChapterItems] = useState<ChapterInsightItem[]>([])

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

  // Load insights subjects when viewing a student (admin or teacher)
  useEffect(() => {
    const shouldLoad =
      show && !!userId && user?.role === 'student' && (authRole === 'coaching_admin' || authRole === 'teacher')
    if (!shouldLoad) return

    const loadSubjects = async () => {
      setInsightsLoading(true)
      try {
        const token = localStorage.getItem('authToken')
        const res = await axios.get(`${API_BASE_URL}/insights/activities/subjects`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          params: { window_days: insightWindowDays, student_id: userId },
        })
        if (res.data?.success) {
          const d: SubjectsInsightResp = res.data.data
          setInsightSubjects(d.items || [])
          setInsightFocusNotes(d.focus?.notes || [])
        }
      } catch {
        // noop
      } finally {
        setInsightsLoading(false)
      }
    }

    loadSubjects()
  }, [show, userId, authRole, user, insightWindowDays])

  const loadChapters = async (subjectId: number) => {
    if (!userId) return
    setSelectedSubjectForChapters(subjectId)
    setChaptersLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const res = await axios.get(`${API_BASE_URL}/insights/activities/chapters`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: { window_days: insightWindowDays, student_id: userId, subject_id: subjectId },
      })
      if (res.data?.success) {
        setChapterItems(res.data.data.items || [])
      }
    } catch {
      // noop
    } finally {
      setChaptersLoading(false)
    }
  }

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

            {(typeof user.attendance_percentage === 'number' || typeof user.not_marked_days === 'number') && (
              <div className="mb-3">
                <h6 className="fw-semibold mb-1">Attendance</h6>
                <div className="fw-bold">
                  {typeof user.attendance_percentage === 'number' ? `${user.attendance_percentage.toFixed(2)}%` : '—'}
                </div>
                {typeof user.not_marked_days === 'number' && (
                  <div className="text-sm text-secondary-light">
                    {Math.round(user.not_marked_days)} day(s) yet to be marked.
                  </div>
                )}
              </div>
            )}

            {user.role === 'student' && (
              <div className="mb-3">
                <h6 className="fw-semibold mb-2">Student Details</h6>
                {user.student_profile && (
                  <>
                    <div className="text-sm">Class: {user.current_class_name ?? user.student_profile.class}</div>
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

            {/* Insights (Admin + Teacher when viewing a student) */}
            {(user.role === 'student' && (authRole === 'coaching_admin' || authRole === 'teacher')) && (
              <div className="mt-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-semibold mb-0">Insights</h6>
                  <div className="d-flex align-items-center gap-2">
                    {[1,3,7,14].map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant={insightWindowDays===d? 'primary':'outline-primary'}
                        onClick={()=> setInsightWindowDays(d)}
                      >
                        {d===1? 'Today' : `${d}d`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-body">
                    {insightsLoading ? (
                      <div className="d-flex align-items-center gap-2 text-sm">
                        <Spinner size="sm" animation="border" />
                        <span>Loading insights…</span>
                      </div>
                    ) : insightSubjects.length === 0 ? (
                      <div className="text-sm text-secondary-light">No activity in this window.</div>
                    ) : (
                      <>
                        {/* Summary: Top and Least Covered */}
                        {insightSubjects.length > 0 && (
                          <div className="mb-3 d-flex gap-2">
                            {(() => {
                              const total = insightSubjects.reduce((acc, it) => acc + it.activity_count, 0) || 1
                              const top = insightSubjects.reduce((a,b)=> (a.activity_count>=b.activity_count? a:b))
                              const least = insightSubjects.reduce((a,b)=> (a.activity_count<=b.activity_count? a:b))
                              return (
                                <>
                                  <div className="flex-fill p-3 rounded border" style={{ borderColor: 'var(--bs-border-color)' }}>
                                    <div className="text-sm text-secondary-light mb-1">Top Subject</div>
                                    <div className="d-flex align-items-baseline justify-content-between">
                                      <div className="fw-semibold">{top.subject}</div>
                                      <div className="text-sm text-secondary-light">{Math.round((top.activity_count/total)*100)}%</div>
                                    </div>
                                  </div>
                                  {insightSubjects.length > 1 && (
                                    <div className="flex-fill p-3 rounded border" style={{ borderColor: 'var(--bs-border-color)' }}>
                                      <div className="text-sm text-secondary-light mb-1">Least Covered</div>
                                      <div className="d-flex align-items-baseline justify-content-between">
                                        <div className="fw-semibold">{least.subject}</div>
                                        <div className="text-sm text-secondary-light">{Math.round((least.activity_count/total)*100)}%</div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        )}
                        <div className="mb-2">
                          {insightFocusNotes.map((n,i)=> (
                            <div key={i} className="alert alert-warning py-2 px-3 mb-2 text-sm">{n}</div>
                          ))}
                        </div>
                        <div className="mb-2" style={{ maxHeight: 220, overflowY: 'auto' }}>
                          {insightSubjects.map((s) => {
                            const total = insightSubjects.reduce((acc, it) => acc + it.activity_count, 0) || 1
                            const pct = Math.round((s.activity_count/total)*100)
                            const series = s.series || []
                            const maxVal = series.length ? Math.max(...series) || 1 : 1
                            const isSelected = selectedSubjectForChapters === s.subject_id
                            return (
                              <div key={s.subject_id} className="mb-2 p-2 rounded" style={{ border: `1px solid ${isSelected ? 'var(--bs-primary)' : 'var(--bs-border-color)'}`, background: isSelected ? 'rgba(var(--bs-primary-rgb), 0.04)' : 'transparent' }}>
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <div className="fw-medium">{s.subject}</div>
                                  <div className="text-sm text-secondary-light">{s.activity_count} • {pct}%</div>
                                </div>
                                <div style={{ height: 8, background: 'var(--bs-secondary-bg)', borderRadius: 8, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--bs-primary)', opacity: 0.8 }} />
                                </div>
                                {series.length > 0 && (
                                  <div className="mt-2" style={{ height: 22, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                                    {series.map((v, idx) => (
                                      <div key={idx} style={{ width: 4, height: Math.max(2, Math.round((v/maxVal)*20)), background: 'var(--bs-primary)', opacity: 0.6, borderRadius: 2 }} />
                                    ))}
                                  </div>
                                )}
                                <div className="text-end mt-1">
                                  {isSelected ? (
                                    <span className="badge bg-primary-subtle text-primary">Selected</span>
                                  ) : (
                                    <Button size="sm" variant="link" onClick={()=> loadChapters(s.subject_id)}>Chapters</Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="fw-semibold">
                              {selectedSubjectForChapters === null
                                ? 'Chapters (select a subject)'
                                : `Chapters — ${insightSubjects.find(it => it.subject_id === selectedSubjectForChapters)?.subject ?? ''}`}
                            </div>
                          </div>
                          {selectedSubjectForChapters === null ? (
                            <div className="text-sm text-secondary-light">Choose a subject to see chapters.</div>
                          ) : chaptersLoading ? (
                            <div className="d-flex align-items-center gap-2 text-sm">
                              <Spinner size="sm" animation="border" />
                              <span>Loading chapters…</span>
                            </div>
                          ) : chapterItems.length === 0 ? (
                            <div className="text-sm text-secondary-light">No chapter activity in this window.</div>
                          ) : (
                            <div className="table-responsive">
                              <table className="table bordered-table mb-0 text-sm">
                                <thead>
                                  <tr>
                                    <th>Chapter</th>
                                    <th className="text-end">Count</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {chapterItems.map((c, idx) => (
                                    <tr key={idx}>
                                      <td>{c.chapter}</td>
                                      <td className="text-end">{c.activity_count}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
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
