import { useEffect, useState } from 'react'
import axios from 'axios'

type RequestItem = {
  id: number
  attendance_date: string
  current_status?: 'present' | 'absent' | 'leave' | 'not_marked' | null
  requested_status: 'present' | 'absent' | 'leave'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  user?: { id: number; name: string; role: string; profile_img?: string | null }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function CorrectionsAdminPage() {
  const token = window.localStorage.getItem('authToken')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending')
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<number | null>(null)
  const [comment, setComment] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await axios.get(`${API_BASE_URL}/admin/attendance-corrections?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      setItems(res.data.data || [])
    } catch (e) {
      setError('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const act = async (id: number, approved: boolean) => {
    setActingId(id)
    try {
      await axios.patch(`${API_BASE_URL}/admin/attendance-corrections/${id}`, { approved, admin_comment: comment }, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      setComment('')
      await load()
      alert(approved ? 'Approved' : 'Rejected')
    } catch (e) {
      alert('Action failed')
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="card h-100">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h6 className="mb-0">Attendance Correction Requests</h6>
        <select className="form-select" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="card-body">
        {loading && <div>Loading…</div>}
        {error && <div className="text-danger">{error}</div>}
        {!loading && !error && (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Comment</th>
                  <th style={{ width: 220 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id}>
                    <td>{new Date(it.attendance_date).toLocaleDateString()}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {it.user?.profile_img && <img src={it.user.profile_img} width={24} height={24} style={{ borderRadius: 999 }} />}
                        <div>
                          <div className="fw-semibold">{it.user?.name ?? 'User'}</div>
                          <div className="small text-muted text-capitalize">{it.user?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-capitalize">{it.current_status ?? '—'}</td>
                    <td className="text-capitalize">{it.requested_status}</td>
                    <td>{it.reason}</td>
                    <td style={{ minWidth: 200 }}>
                      {it.status === 'pending' ? (
                        <input className="form-control form-control-sm" placeholder="Optional comment" value={comment} onChange={e => setComment(e.target.value)} />
                      ) : (
                        <span className="text-muted small">—</span>
                      )}
                    </td>
                    <td>
                      {it.status === 'pending' ? (
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-success" disabled={actingId === it.id} onClick={() => act(it.id, true)}>
                            {actingId === it.id ? 'Saving…' : 'Approve'}
                          </button>
                          <button className="btn btn-sm btn-outline-danger" disabled={actingId === it.id} onClick={() => act(it.id, false)}>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`badge ${it.status === 'approved' ? 'bg-success' : 'bg-danger'}`}>{it.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">No requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

