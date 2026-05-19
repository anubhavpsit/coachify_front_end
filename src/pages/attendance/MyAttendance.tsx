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
  admin_comment?: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function MyAttendance() {
  const token = window.localStorage.getItem('authToken')
  const authUser = useMemo(() => {
    try { return JSON.parse(window.localStorage.getItem('authUser') || '{}') } catch { return {} }
  }, []) as { id?: number }
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
  const [profilePercentage, setProfilePercentage] = useState<number | null>(null)
  const [profileNotMarked, setProfileNotMarked] = useState<number | null>(null)
  const [admissionYmd, setAdmissionYmd] = useState<string | null>(null)
  const [lifetimeCounts, setLifetimeCounts] = useState<{present?: number; absent?: number; leave?: number} | null>(null)
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())

  const normalizeYmd = (value: string) => {
    const m = value && value.match(/^\d{4}-\d{2}-\d{2}/)
    return m ? m[0] : value
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const atts = await axios.get(`${API_BASE_URL}/my/attendance?month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const rawRecs: Attendance[] = atts.data.data || []
      const normRecs: Attendance[] = rawRecs.map(r => ({
        ...r,
        attendance_date: normalizeYmd(String(r.attendance_date)),
      }))
      setRecords(normRecs)
      const reqs = await axios.get(`${API_BASE_URL}/attendance-corrections/mine`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      const rawReqs: CorrectionRequest[] = reqs.data.data || []
      const normReqs: CorrectionRequest[] = rawReqs.map(r => ({
        ...r,
        attendance_date: normalizeYmd(String(r.attendance_date)),
      }))
      setRequests(normReqs)
      // Load holidays for this month (inclusive range)
      try {
        const first = new Date(year, month - 1, 1)
        const last = new Date(year, month, 0)
        const fmt = (d: Date) => {
          const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`
        }
        const res = await axios.get(`${API_BASE_URL}/admin/holidays?from=${fmt(first)}&to=${fmt(last)}` , {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        const hs: string[] = (res.data?.data || []).map((h: any) => normalizeYmd(String(h.holiday_date)))
        setHolidaySet(new Set(hs))
      } catch {}
      if (authUser?.id) {
        try {
          const prof = await axios.get(`${API_BASE_URL}/users/${authUser.id}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          })
          const u = prof.data?.data || {}
          if (typeof u.attendance_percentage === 'number') setProfilePercentage(u.attendance_percentage)
          if (typeof u.not_marked_days === 'number') setProfileNotMarked(u.not_marked_days)
          const adm = u.admission_date || u.created_at
          if (adm) {
            const d = new Date(adm)
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            setAdmissionYmd(`${y}-${m}-${day}`)
          }
          if (u.attendance_stats) {
            setLifetimeCounts({
              present: typeof u.attendance_stats.present_days === 'number' ? u.attendance_stats.present_days : undefined,
              absent: typeof u.attendance_stats.absent_days === 'number' ? u.attendance_stats.absent_days : undefined,
              leave: typeof u.attendance_stats.leave_days === 'number' ? u.attendance_stats.leave_days : undefined,
            })
          }
        } catch {}
      }
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

  const formatYmd = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const allMonthRecords = useMemo(() => {
    const first = new Date(year, month - 1, 1)
    const last = new Date(year, month, 0)
    const map = new Map(records.map(r => [r.attendance_date, r] as const))
    const result: Attendance[] = []
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const key = formatYmd(d)
      const rec = map.get(key)
      if (rec) {
        result.push(rec)
      } else if (!holidaySet.has(key)) {
        result.push({ user_id: 0, role: 'student', attendance_date: key, status: 'not_marked' })
      }
    }
    return result
  }, [records, month, year, holidaySet])

  const requestedDates = useMemo(() => new Set(requests.map(r => r.attendance_date)), [requests])
  const todayYmd = useMemo(() => formatYmd(new Date()), [])
  const upToTodayRecords = useMemo(
    () => allMonthRecords.filter(r => r.attendance_date <= todayYmd),
    [allMonthRecords, todayYmd],
  )
  const afterAdmissionRecords = useMemo(
    () => upToTodayRecords.filter(r => !admissionYmd || r.attendance_date >= admissionYmd),
    [upToTodayRecords, admissionYmd],
  )
  const filteredRecords = useMemo(
    () => afterAdmissionRecords
      .filter(r => r.status !== 'present') // exclude present days from correction list
      .filter(r => r.status !== 'not_marked') // exclude not marked days from correction list
      .filter(r => !requestedDates.has(r.attendance_date))
      .filter(r => !(r.attendance_date === todayYmd && r.status === 'not_marked')),
    [afterAdmissionRecords, requestedDates, todayYmd],
  )
  const absentDays = useMemo(
    () => afterAdmissionRecords.filter(r => r.status === 'absent').map(r => r.attendance_date),
    [afterAdmissionRecords],
  )

  // Insights computed from all records
  const insights = useMemo(() => {
    const present = afterAdmissionRecords.filter(r => r.status === 'present').length
    const absent = afterAdmissionRecords.filter(r => r.status === 'absent').length
    const leave = afterAdmissionRecords.filter(r => r.status === 'leave').length
    const notMarked = afterAdmissionRecords.filter(r => r.status === 'not_marked').length
    // Match profile formula: present / (present + absent)
    const workingDays = present + absent
    const percentage = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0

    // Longest present streak
    const sorted = [...afterAdmissionRecords].sort((a, b) => new Date(a.attendance_date).getTime() - new Date(b.attendance_date).getTime())
    let longestPresent = 0
    let currentPresent = 0
    let lastDate: Date | null = null
    for (const r of sorted) {
      const d = new Date(r.attendance_date)
      const contiguous = lastDate ? (d.getTime() - lastDate.getTime()) <= 86400000 + 1000 : true
      if (r.status === 'present' && (contiguous || lastDate === null)) {
        currentPresent += 1
        longestPresent = Math.max(longestPresent, currentPresent)
      } else if (r.status === 'present') {
        currentPresent = 1
        longestPresent = Math.max(longestPresent, currentPresent)
      } else {
        currentPresent = 0
      }
      lastDate = d
    }

    return { present, absent, leave, notMarked, percentage, longestPresent }
  }, [afterAdmissionRecords])

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
            <div className="row g-2 mb-3">
              <div className="col-auto">
                <div className="border rounded px-3 py-2 text-center" title="Calculated as: Present ÷ (Present + Absent + Leave) × 100">
                  <div className="fw-bold fs-5">{(profilePercentage ?? insights.percentage)}%</div>
                  <div className="text-muted small">Attendance</div>
                </div>
              </div>
              <div className="col-auto">
                <div className="border rounded px-3 py-2 text-center">
                  <div className="fw-bold fs-5">{lifetimeCounts?.present ?? insights.present}</div>
                  <div className="text-muted small">Present</div>
                </div>
              </div>
              <div className="col-auto">
                <div className="border rounded px-3 py-2 text-center">
                  <div className="fw-bold fs-5">{lifetimeCounts?.absent ?? insights.absent}</div>
                  <div className="text-muted small">Absent</div>
                </div>
              </div>
              <div className="col-auto">
                <div className="border rounded px-3 py-2 text-center">
                  <div className="fw-bold fs-5">{lifetimeCounts?.leave ?? insights.leave}</div>
                  <div className="text-muted small">Leave</div>
                </div>
              </div>
              <div className="col-auto">
                <div className="border rounded px-3 py-2 text-center">
                  <div className="fw-bold fs-5">{(profileNotMarked ?? insights.notMarked)}</div>
                  <div className="text-muted small">Not Marked</div>
                </div>
              </div>
            </div>
            <div className="mb-3 text-muted small">Longest present streak: {insights.longestPresent} day{insights.longestPresent === 1 ? '' : 's'}</div>
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
                  {filteredRecords.map(rec => (
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
                  {filteredRecords.length === 0 && (
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
                    <th>Admin Comment</th>
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
                      <td>{r.admin_comment ?? '—'}</td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted">No requests yet.</td>
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
                <p className="text-xs text-secondary-light mb-2">Corrections can only be requested for Absent or Leave days.</p>
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
