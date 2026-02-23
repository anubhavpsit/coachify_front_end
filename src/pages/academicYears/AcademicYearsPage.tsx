import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button, Modal } from 'react-bootstrap'

type Year = {
  id: number
  name: string
  starts_on: string
  ends_on: string
  is_current: boolean
}

export default function AcademicYearsPage() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'
  const [years, setYears] = useState<Year[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{name: string; starts_on: string; ends_on: string; is_current: boolean}>({name:'',starts_on:'',ends_on:'',is_current:false})
  const [editId, setEditId] = useState<number | null>(null)

  const token = localStorage.getItem('authToken')

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/academic-years`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      if (res.data?.success && Array.isArray(res.data?.data)) setYears(res.data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const resetForm = () => setForm({ name: '', starts_on: '', ends_on: '', is_current: false })

  const openAdd = () => { resetForm(); setShowAdd(true) }
  const openEdit = (y: Year) => {
    setEditId(y.id)
    setForm({ name: y.name, starts_on: y.starts_on?.slice(0,10), ends_on: y.ends_on?.slice(0,10), is_current: !!y.is_current })
    setShowEdit(true)
  }

  const createYear = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.post(`${API_BASE_URL}/academic-years`, form, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      setShowAdd(false)
      await load()
    } catch {
      alert('Failed to create year')
    } finally {
      setSaving(false)
    }
  }

  const updateYear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId) return
    setSaving(true)
    try {
      await axios.put(`${API_BASE_URL}/academic-years/${editId}`, form, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      setShowEdit(false)
      await load()
    } catch {
      alert('Failed to update year')
    } finally {
      setSaving(false)
    }
  }

  const setCurrent = async (id: number) => {
    try {
      await axios.patch(`${API_BASE_URL}/academic-years/${id}/current`, {}, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      await load()
    } catch {
      alert('Failed to set current year')
    }
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-24">
        <h6 className="fw-semibold mb-0">Academic Years</h6>
        <Button variant="primary" onClick={openAdd} className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8">Add Year</Button>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light">List</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-6"><span className="spinner-border spinner-border-sm"></span><span className="ms-2">Loading...</span></div>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Starts</th>
                    <th>Ends</th>
                    <th>Current</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(y => (
                    <tr key={y.id}>
                      <td>{y.name}</td>
                      <td>{y.starts_on?.slice(0,10)}</td>
                      <td>{y.ends_on?.slice(0,10)}</td>
                      <td>{y.is_current ? 'Yes' : 'No'}</td>
                      <td className="text-center">
                        <Button variant="link" onClick={() => openEdit(y)}>Edit</Button>
                        {!y.is_current && (
                          <Button variant="link" onClick={() => setCurrent(y.id)}>Set Current</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton><Modal.Title>Add Academic Year</Modal.Title></Modal.Header>
        <Modal.Body>
          <form onSubmit={createYear}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input className="form-control" value={form.name} onChange={(e)=> setForm({...form, name: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Starts On</label>
              <input type="date" className="form-control" value={form.starts_on} onChange={(e)=> setForm({...form, starts_on: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Ends On</label>
              <input type="date" className="form-control" value={form.ends_on} onChange={(e)=> setForm({...form, ends_on: e.target.value})} />
            </div>
            <div className="form-check">
              <input id="isCurrentAdd" type="checkbox" className="form-check-input" checked={form.is_current} onChange={(e)=> setForm({...form, is_current: e.target.checked})} />
              <label htmlFor="isCurrentAdd" className="form-check-label">Set as current</label>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={()=> setShowAdd(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Modal.Header closeButton><Modal.Title>Edit Academic Year</Modal.Title></Modal.Header>
        <Modal.Body>
          <form onSubmit={updateYear}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input className="form-control" value={form.name} onChange={(e)=> setForm({...form, name: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Starts On</label>
              <input type="date" className="form-control" value={form.starts_on} onChange={(e)=> setForm({...form, starts_on: e.target.value})} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Ends On</label>
              <input type="date" className="form-control" value={form.ends_on} onChange={(e)=> setForm({...form, ends_on: e.target.value})} />
            </div>
            <div className="form-check">
              <input id="isCurrentEdit" type="checkbox" className="form-check-input" checked={form.is_current} onChange={(e)=> setForm({...form, is_current: e.target.checked})} />
              <label htmlFor="isCurrentEdit" className="form-check-label">Set as current</label>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={()=> setShowEdit(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Updating...' : 'Update'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  )
}

