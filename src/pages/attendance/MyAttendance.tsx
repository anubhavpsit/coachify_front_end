import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

type Attendance = {
  id?: number
  user_id: number
  role: 'student' | 'teacher'
  attendance_date: string
  status: 'present' | 'absent' | 'leave' | 'not_marked'
}

type CorrectionRequest = {
  id: number
  attendance_date: string
  current_status?: 'present' | 'absent' | 'leave' | 'not_marked' | null
  requested_status: 'present' | 'absent' | 'leave'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function MyAttendance() {
  const token = window.localStorage.getItem('authToken')
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<CorrectionRequest[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState<string>('')
  const [requestedStatus, setRequestedStatus] = useState<'present' | 'absent' | 'leave'>('present')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const atts = await axios.get(`${API_BASE_URL}/my/attendance?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      setRecords(atts.data.data || [])
      const reqs = await axios.get(`${API_BASE_URL}/attendance-corrections/mine`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      setRequests(reqs.data.data || [])
    } catch (e) {
      setError('Failed to load attendance.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  const absentDays = useMemo(
    () => records.filter(r => r.status === 'absent').map(r => r.attendance_date),
    [records],
  )

  const openModal = (date: string) => {
    setModalDate(date)
    setRequestedStatus('present')
    setReason('')
    setModalOpen(true)
  }

  const submitRequest = async () => {
    if (!modalDate || !reason.trim()) return
    setSubmitting(true)
    try {
      await axios.post(
        `${API_BASE_URL}/attendance-corrections`,
        { attendance_date: modalDate, requested_status: requestedStatus, reason },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      )
      setModalOpen(false)
      await load()
      alert('Correction request submitted')
    } catch (e) {
      alert('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">My Attendance</h6>
        <div className="d-flex gap-2">
          <select className="form-select" style={{ width: 120 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })}</option>
            ))}
          </select>
          <input
            type="number"
            className="form-control"
            style={{ width: 100 }}
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            min={2000}
            max={2100}
          />
        </div>
      </div>
      <div className="card-body">
        {loading && <div>Loading…</div>}
        {error && <div className="text-danger">{error}</div>}
        {!loading && !error && (
          <>
            <div className="table-responsive mb-4">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Date</th>
                    <th>Status</th>
                    <th style={{ width: 200 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(rec => (
                    <tr key={rec.attendance_date}>
                      <td>{new Date(rec.attendance_date).toLocaleDateString()}</td>
                      <td className="text-capitalize">{rec.status.replace('_', ' ')}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openModal(rec.attendance_date)}
                        >
                          Request Correction
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted">No attendance records.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h6 className="fw-semibold">My Correction Requests</h6>
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.attendance_date).toLocaleDateString()}</td>
                      <td className="text-capitalize">{r.current_status ?? '—'}</td>
                      <td className="text-capitalize">{r.requested_status}</td>
                      <td className={`text-capitalize ${r.status === 'pending' ? 'text-warning' : r.status === 'approved' ? 'text-success' : 'text-danger'}`}>{r.status}</td>
                      <td>{r.reason}</td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">No requests yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {absentDays.length > 0 && (
              <div className="mt-3 small text-muted">Absent days this month: {absentDays.map(d => new Date(d).toLocaleDateString()).join(', ')}</div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Request Correction</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input className="form-control" value={new Date(modalDate).toLocaleDateString()} readOnly />
                </div>
                <div className="mb-3">
                  <label className="form-label">Requested Status</label>
                  <select className="form-select" value={requestedStatus} onChange={e => setRequestedStatus(e.target.value as any)}>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="leave">Leave</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Reason</label>
                  <textarea className="form-control" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this should be corrected" />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
                <button className="btn btn-primary" onClick={submitRequest} disabled={submitting || !reason.trim()}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {modalOpen && <div className="modal-backdrop fade show" onClick={() => setModalOpen(false)} />}
    </div>
  )
}

