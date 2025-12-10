import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from 'react-bootstrap'

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
  created_at: string
  student?: Student
}

function getCurrentMonthValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function getMonthDateRange(monthValue: string) {
  if (!monthValue) {
    return { from: undefined, to: undefined }
  }

  const [yearStr, monthStr] = monthValue.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  const from = `${monthValue}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${monthValue}-${String(lastDay).padStart(2, '0')}`

  return { from, to }
}

export default function FeeComponent() {
  const [students, setStudents] = useState<Student[]>([])
  const [fees, setFees] = useState<StudentFee[]>([])

  const [selectedStudentId, setSelectedStudentId] = useState<number | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')

  const [filterMonth, setFilterMonth] = useState<string>(getCurrentMonthValue())

  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingFees, setLoadingFees] = useState(false)
  const [saving, setSaving] = useState(false)

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true)
      try {
        const token = sessionStorage.getItem('authToken')
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
        const token = sessionStorage.getItem('authToken')
        const { from, to } = getMonthDateRange(filterMonth)

        let url = `${API_BASE_URL}/student-fees`
        const params: string[] = []
        if (from) params.push(`from_date=${from}`)
        if (to) params.push(`to_date=${to}`)
        if (params.length) {
          url += `?${params.join('&')}`
        }

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setFees(response.data.data || [])
        }
      } catch (error) {
        console.error('Error fetching fees:', error)
      } finally {
        setLoadingFees(false)
      }
    }

    fetchFees()
  }, [API_BASE_URL, filterMonth])

  const handleSaveFee = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedStudentId || !fromDate || !toDate || !amount || !paymentMode) {
      alert('Please fill all required fields.')
      return
    }

    setSaving(true)
    try {
      const token = sessionStorage.getItem('authToken')
      const payload = {
        student_id: Number(selectedStudentId),
        from_date: fromDate,
        to_date: toDate,
        amount: Number(amount),
        payment_mode: paymentMode,
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
        setSelectedStudentId('')
        setFromDate('')
        setToDate('')
        setAmount('')
        setPaymentMode('cash')

        const createdFee: StudentFee = response.data.data
        setFees((previous) => [createdFee, ...previous])
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
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
          <span className="text-md fw-medium text-secondary-light">
            Fees Submitted (Month-wise)
          </span>
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
            <p className="text-center text-muted">No fees found for this period.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {fees.map((fee) => (
                    <tr key={fee.id}>
                      <td>{fee.student?.name || '-'}</td>
                      <td>{fee.from_date}</td>
                      <td>{fee.to_date}</td>
                      <td>{fee.amount}</td>
                      <td>{fee.payment_mode}</td>
                      <td>{new Date(fee.created_at).toLocaleDateString()}</td>
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

