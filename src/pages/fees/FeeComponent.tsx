import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from 'react-bootstrap'
import { formatDate } from '../../utils/date'
import { getAuthUser } from '../../lib/auth'
import { ROLES } from '../../constants/roles'
import FeeEditModal, { type EditableFee } from './FeeEditModal'
import Icon from '../../components/common/Icon.tsx'

interface StudentProfile {
  class?: string | number
  subjects?: (string | number)[]
  phone?: string
}

interface Student {
  id: number
  name: string
  email: string
  tenant_id: number
  student_profile?: StudentProfile | null
}

interface StudentFee {
  id: number
  student_id: number
  tenant_id: number
  from_date: string
  to_date: string
  amount: string | number
  payment_mode: string
  notes?: string | null
  submitted_on: string
  created_at: string
  student?: Student
}

interface FeeHistoryItem {
  id: number
  from_date: string
  to_date: string
  paid_at?: string | null
  amount: number
  status?: string
  payment_mode?: string
  notes?: string | null
}

const NOTES_MAX = 1000

function getTodayValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentMonthValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export default function FeeComponent() {
  const [students, setStudents] = useState<Student[]>([])
  const [fees, setFees] = useState<StudentFee[]>([])

  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [submittedOn, setSubmittedOn] = useState(getTodayValue())
  const [notes, setNotes] = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestNote, setSuggestNote] = useState<string | null>(null)

  const [filterMonth, setFilterMonth] = useState<string>(getCurrentMonthValue())
  const [feesMeta, setFeesMeta] = useState<{ count: number; total_amount: number; students_count: number } | null>(null)
  const [feesReloadKey, setFeesReloadKey] = useState(0)
  // Correcting a mistaken entry — coaching admin only (API enforces the same)
  const canEditFees = getAuthUser()?.role === ROLES.COACHING_ADMIN
  const [editingFee, setEditingFee] = useState<EditableFee | null>(null)

  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingFees, setLoadingFees] = useState(false)
  const [saving, setSaving] = useState(false)
  // Fee history for selected student
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<FeeHistoryItem[]>([])

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true)
      try {
        const token = localStorage.getItem('authToken')
        const response = await axios.get(`${API_BASE_URL}/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setStudents(response.data.data || [])
        }
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setLoadingStudents(false)
      }
    }

    fetchStudents()
  }, [API_BASE_URL])

  useEffect(() => {
    const fetchFees = async () => {
      setLoadingFees(true)
      try {
        const token = localStorage.getItem('authToken')
        // Fees *submitted* in the month; all students unless one is selected.
        const params: Record<string, string> = {}
        if (filterMonth) params.month = filterMonth
        if (selectedStudentId) params.student_id = String(selectedStudentId)

        const response = await axios.get(`${API_BASE_URL}/student-fees`, {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setFees(response.data.data || [])
          setFeesMeta(response.data.meta ?? null)
        }
      } catch (error) {
        console.error('Error fetching fees:', error)
      } finally {
        setLoadingFees(false)
      }
    }

    fetchFees()
  }, [API_BASE_URL, filterMonth, selectedStudentId, feesReloadKey])

  // Auto-fill From/To Date based on student selection. Also called again
  // after saving a fee so the next period is suggested without a reselect.
  const fetchSuggestPeriod = useCallback(
    async (studentId: number | '') => {
      if (!studentId) return
      setSuggestLoading(true)
      setSuggestNote(null)
      try {
        const token = localStorage.getItem('authToken')
        const res = await axios.get(
          `${API_BASE_URL}/students/${studentId}/fees/suggest-period`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        )
        if (res.data?.success) {
          setFromDate(res.data.from_date || '')
          setToDate(res.data.to_date || '')
          setSuggestNote('Auto-filled from last payment')
        } else {
          setSuggestNote('Could not auto-fill dates')
        }
      } catch {
        setSuggestNote('Could not auto-fill dates')
      } finally {
        setSuggestLoading(false)
      }
    },
    [API_BASE_URL],
  )

  useEffect(() => {
    fetchSuggestPeriod(selectedStudentId)
  }, [selectedStudentId, fetchSuggestPeriod])

  // Load fee history for selected student. Also called again after saving a
  // fee so the list reflects the new entry without requiring a reselect.
  const fetchHistory = useCallback(
    async (studentId: number | '') => {
      setHistoryItems([])
      setHistoryError(null)
      if (!studentId) return
      setHistoryLoading(true)
      try {
        const token = localStorage.getItem('authToken')
        const res = await axios.get(
          `${API_BASE_URL}/students/${studentId}/fees?limit=10`,
          { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
        )
        if (res.data?.success && Array.isArray(res.data.items)) {
          setHistoryItems(res.data.items)
        } else {
          setHistoryError('Unable to load fees history.')
        }
      } catch (e: any) {
        if (e?.response?.status !== 403) {
          setHistoryError('Unable to load fees history.')
        }
      } finally {
        setHistoryLoading(false)
      }
    },
    [API_BASE_URL],
  )

  useEffect(() => {
    fetchHistory(selectedStudentId)
  }, [selectedStudentId, fetchHistory])

  const handleSaveFee = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedStudentId || !fromDate || !toDate || !amount || !paymentMode || !submittedOn) {
      alert('Please fill all required fields.')
      return
    }

    if (submittedOn > getTodayValue()) {
      alert('Submitted On date cannot be in the future.')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('authToken')
      const payload = {
        student_id: Number(selectedStudentId),
        from_date: fromDate,
        to_date: toDate,
        amount: Number(amount),
        payment_mode: paymentMode,
        submitted_on: submittedOn,
        notes: notes.trim() || null,
      }

      const response = await axios.post(
        `${API_BASE_URL}/student-fees`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )

      if (response.data.success) {
        setAmount('')
        setPaymentMode('cash')
        setSubmittedOn(getTodayValue())
        setNotes('')

        // Refetch rather than prepend: the new fee belongs in the list only
        // if its submitted-on date falls in the month being viewed.
        setFeesReloadKey((k) => k + 1)

        // Keep the student selected and refresh their history + next
        // suggested period in place, instead of forcing a reselect.
        fetchHistory(selectedStudentId)
        fetchSuggestPeriod(selectedStudentId)
      }
    } catch (error) {
      console.error('Error saving fee:', error)
      alert('Failed to save fee.')
    } finally {
      setSaving(false)
    }
  }

  const selectedStudent =
    selectedStudentId !== ''
      ? students.find((student) => student.id === Number(selectedStudentId))
      : undefined

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Student Fees</h6>
      </div>

      <div className="card mb-24">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light">
            Add Monthly Tuition Fee
          </span>
        </div>
        <div className="card-body">
          <form onSubmit={handleSaveFee} className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Student</label>
              <select
                className="form-select"
                value={selectedStudentId}
                onChange={(event) =>
                  setSelectedStudentId(
                    event.target.value ? Number(event.target.value) : '',
                  )
                }
                disabled={loadingStudents || saving}
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                disabled={saving}
              />
              {suggestLoading && (
                <div className="text-xs text-secondary-light mt-1">Loading suggestion…</div>
              )}
              {suggestNote && !suggestLoading && (
                <div className="text-xs text-secondary-light mt-1">{suggestNote}</div>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Amount Submitted</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Submission Mode</label>
              <select
                className="form-select"
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                disabled={saving}
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Submitted On</label>
              <input
                type="date"
                className="form-control"
                value={submittedOn}
                max={getTodayValue()}
                onChange={(event) => setSubmittedOn(event.target.value)}
                disabled={saving}
              />
              <div className="text-xs text-secondary-light mt-1">
                Defaults to today. Set a past date if fees were paid online but entered late.
              </div>
            </div>

            <div className="col-md-8">
              <label className="form-label fw-semibold">Notes</label>
              <textarea
                className="form-control"
                rows={2}
                maxLength={NOTES_MAX}
                placeholder="Optional — e.g. half paid, balance next week; paid by father via UPI"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={saving}
              />
              <div className="text-xs text-secondary-light mt-1 text-end">
                {notes.length}/{NOTES_MAX} · Visible to admins/staff only
              </div>
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <Button
                type="submit"
                variant="primary"
                disabled={saving || loadingStudents}
                className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save Fee'}
              </Button>
            </div>
          </form>

          {selectedStudent && (
            <div className="mt-4 p-3 border rounded bg-light">
              <h6 className="fw-semibold mb-2">Selected Student Details</h6>
              <p className="mb-1">
                <strong>Name:</strong> {selectedStudent.name}
              </p>
              <p className="mb-1">
                <strong>Email:</strong> {selectedStudent.email}
              </p>
              <p className="mb-0">
                <strong>Phone:</strong>{' '}
                {selectedStudent.student_profile?.phone || '-'}
              </p>

              <div className="mt-3">
                <h6 className="fw-semibold mb-2">Fees History</h6>
                {historyLoading ? (
                  <div className="text-sm text-secondary-light">Loading history…</div>
                ) : historyItems.length === 0 ? (
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
                          <th>Notes</th>
                          {canEditFees && <th className="text-center">Edit</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems.map((item) => (
                          <tr key={item.id}>
                            <td>{formatDate(item.from_date)} → {formatDate(item.to_date)}</td>
                            <td>{item.paid_at ? formatDate(item.paid_at) : '-'}</td>
                            <td>₹{Number(item.amount).toFixed(2)}</td>
                            <td>{item.payment_mode || '-'}</td>
                            <td style={{ whiteSpace: 'pre-wrap', minWidth: 160 }}>{item.notes || '-'}</td>
                            {canEditFees && (
                              <td className="text-center">
                                <Button
                                  variant="link"
                                  className="p-0"
                                  title="Edit this fee entry"
                                  aria-label="Edit this fee entry"
                                  onClick={() =>
                                    setEditingFee({
                                      id: item.id,
                                      student_id: Number(selectedStudentId),
                                      from_date: item.from_date,
                                      to_date: item.to_date,
                                      amount: item.amount,
                                      payment_mode: item.payment_mode || 'cash',
                                      submitted_on: item.paid_at ?? null,
                                      notes: item.notes,
                                    })
                                  }
                                >
                                  <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                                </Button>
                              </td>
                            )}
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
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
          <div>
            <span className="text-md fw-medium text-secondary-light d-block">
              Fees Submitted (Month-wise)
              {' · '}
              {selectedStudent ? selectedStudent.name : 'All students'}
            </span>
            {feesMeta && feesMeta.count > 0 && (
              <span className="text-sm text-secondary-light">
                {feesMeta.count} payment{feesMeta.count === 1 ? '' : 's'}
                {!selectedStudent && ` from ${feesMeta.students_count} student${feesMeta.students_count === 1 ? '' : 's'}`}
                {' · '}
                <strong className="text-primary-light">
                  ₹{feesMeta.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </strong>{' '}
                collected
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <input
              type="month"
              className="form-control"
              value={filterMonth}
              onChange={(event) => setFilterMonth(event.target.value)}
            />
          </div>
        </div>
        <div className="card-body">
          {loadingFees ? (
            <div className="text-center py-6">
              <span className="spinner-border spinner-border-sm" />
              <span className="ms-2">Loading fees...</span>
            </div>
          ) : fees.length === 0 ? (
            <p className="text-center text-muted">
              {selectedStudent
                ? `${selectedStudent.name} has no fees submitted in this month.`
                : 'No fees submitted in this month.'}
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Submitted On</th>
                    <th>Notes</th>
                    {canEditFees && <th className="text-center">Edit</th>}
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id}>
                      <td>{fee.student?.name || '-'}</td>
                      <td>{formatDate(fee.from_date)}</td>
                      <td>{formatDate(fee.to_date)}</td>
                      <td>{fee.amount}</td>
                      <td>{fee.payment_mode}</td>
                      <td>{formatDate(fee.submitted_on || fee.created_at)}</td>
                      <td style={{ whiteSpace: 'pre-wrap', minWidth: 160 }}>{fee.notes || '-'}</td>
                      {canEditFees && (
                        <td className="text-center">
                          <Button
                            variant="link"
                            className="p-0"
                            title="Edit this fee entry"
                            aria-label="Edit this fee entry"
                            onClick={() => setEditingFee({ ...fee, submitted_on: fee.submitted_on || fee.created_at })}
                          >
                            <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {canEditFees && (
        <FeeEditModal
          fee={editingFee}
          students={students}
          onHide={() => setEditingFee(null)}
          onSaved={() => {
            setEditingFee(null)
            setFeesReloadKey((k) => k + 1)
            if (selectedStudentId) {
              fetchHistory(selectedStudentId)
              fetchSuggestPeriod(selectedStudentId)
            }
          }}
        />
      )}
    </div>
  )
}
