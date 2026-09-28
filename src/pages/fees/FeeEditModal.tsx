import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button, Modal } from 'react-bootstrap'
import { toDateInputValue } from '../../utils/date'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'
const NOTES_MAX = 1000
const MODES = ['cash', 'online', 'cheque', 'upi', 'other']

export type EditableFee = {
  id: number
  student_id: number
  from_date: string
  to_date: string
  amount: number | string
  payment_mode: string
  submitted_on: string | null
  notes?: string | null
}

type Props = {
  fee: EditableFee | null // null = closed
  students: { id: number; name: string }[]
  onHide: () => void
  onSaved: () => void
}

const dateOnly = (v?: string | null) => (v ? v.slice(0, 10) : '')

/** Correct a mistaken fee entry (PUT /student-fees/{id}). */
export default function FeeEditModal({ fee, students, onHide, onSaved }: Props) {
  const [studentId, setStudentId] = useState<number | ''>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('cash')
  const [submittedOn, setSubmittedOn] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fee) return
    setStudentId(fee.student_id)
    setFromDate(dateOnly(fee.from_date))
    setToDate(dateOnly(fee.to_date))
    setAmount(String(Number(fee.amount)))
    setMode(fee.payment_mode || 'cash')
    setSubmittedOn(dateOnly(fee.submitted_on) || toDateInputValue())
    setNotes(fee.notes ?? '')
    setError(null)
  }, [fee])

  const today = toDateInputValue()

  const save = async () => {
    if (!fee) return
    setError(null)
    if (!studentId || !fromDate || !toDate || amount === '' || !mode || !submittedOn) {
      setError('Please fill all required fields.')
      return
    }
    if (toDate < fromDate) {
      setError('"To" date must be on or after the "From" date.')
      return
    }
    if (submittedOn > today) {
      setError('Submitted On cannot be in the future.')
      return
    }

    setSaving(true)
    try {
      await axios.put(
        `${API_BASE_URL}/student-fees/${fee.id}`,
        {
          student_id: Number(studentId),
          from_date: fromDate,
          to_date: toDate,
          amount: Number(amount),
          payment_mode: mode,
          submitted_on: submittedOn,
          notes: notes.trim() || null,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' } },
      )
      onSaved()
    } catch (err: unknown) {
      const data = axios.isAxiosError(err) ? err.response?.data : null
      const first = data?.errors ? (Object.values(data.errors)[0] as string[])[0] : null
      setError(first || data?.message || 'Unable to update fee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={fee !== null} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h6 mb-0">Edit Fee Entry</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label className="form-label fw-semibold">Student</label>
          <select className="form-select" value={studentId} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : '')}>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="form-text">Change this if the fee was recorded against the wrong student.</div>
        </div>
        <div className="row g-3 mb-3">
          <div className="col-6">
            <label className="form-label fw-semibold">From Date</label>
            <input type="date" className="form-control" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="col-6">
            <label className="form-label fw-semibold">To Date</label>
            <input type="date" className="form-control" value={toDate} min={fromDate || undefined} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>
        <div className="row g-3 mb-3">
          <div className="col-6">
            <label className="form-label fw-semibold">Amount</label>
            <input type="number" min={0} step="0.01" className="form-control" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="col-6">
            <label className="form-label fw-semibold">Submission Mode</label>
            <select className="form-select" value={mode} onChange={e => setMode(e.target.value)}>
              {MODES.map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Submitted On</label>
          <input type="date" className="form-control" value={submittedOn} max={today} onChange={e => setSubmittedOn(e.target.value)} />
        </div>
        <div className="mb-2">
          <label className="form-label fw-semibold">Notes</label>
          <textarea className="form-control" rows={2} maxLength={NOTES_MAX} value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="text-xs text-secondary-light mt-1 text-end">{notes.length}/{NOTES_MAX} · Visible to admins/staff only</div>
        </div>
        {error && <p className="text-danger-600 text-sm mb-0">{error}</p>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
      </Modal.Footer>
    </Modal>
  )
}
