import { useEffect, useState } from 'react'
import axios from 'axios'
import { Modal, Button } from 'react-bootstrap'
import Icon from '../../components/common/Icon.tsx'

type Enquiry = {
  id: number
  tenant_id: number
  enquiry_type: 'student' | 'teacher'
  name: string
  contact_number: string
  email?: string | null
  school_name?: string | null
  class_grade?: string | null
  subjects_interested?: string | null
  description?: string | null
  status: 'active' | 'inactive'
  last_communication_at?: string | null
  communications_count?: number
  created_at: string
}

type EnquiryCommunication = {
  id: number
  channel: 'email' | 'whatsapp' | 'sms' | 'other'
  notes?: string | null
  communicated_at?: string | null
  created_at: string
}

type EnquiryDetail = Enquiry & {
  communications?: EnquiryCommunication[]
}

type NewEnquiryForm = {
  enquiry_type: 'student' | 'teacher'
  name: string
  contact_number: string
  email: string
  school_name: string
  class_grade: string
  subjects_interested: string
  description: string
}

type NewCommunicationForm = {
  channel: 'email' | 'whatsapp' | 'sms' | 'other'
  notes: string
  communicated_at: string
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [userRole, setUserRole] = useState<string>('')

  const [newEnquiry, setNewEnquiry] = useState<NewEnquiryForm>({
    enquiry_type: 'student',
    name: '',
    contact_number: '',
    email: '',
    school_name: '',
    class_grade: '',
    subjects_interested: '',
    description: '',
  })

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  )

  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryDetail | null>(
    null,
  )
  const [communicationForm, setCommunicationForm] =
    useState<NewCommunicationForm>({
      channel: 'email',
      notes: '',
      communicated_at: '',
    })
  const [savingCommunication, setSavingCommunication] = useState(false)

  useEffect(() => {
    const authUserRaw = localStorage.getItem('authUser')
    if (authUserRaw) {
      try {
        const authUser = JSON.parse(authUserRaw) as { role?: string }
        setUserRole(authUser.role ?? '')
      } catch {
        setUserRole('')
      }
    }
  }, [])

  useEffect(() => {
    if (userRole !== 'coaching_admin') return

    const loadEnquiries = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          setError('You are not authenticated.')
          setLoading(false)
          return
        }

        const params: string[] = []
        if (statusFilter !== 'all') {
          params.push(`status=${statusFilter}`)
        }
        const query = params.length ? `?${params.join('&')}` : ''

        const response = await axios.get<{
          success: boolean
          data: Enquiry[]
        }>(`${API_BASE_URL}/enquiries${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setEnquiries(response.data.data || [])
        } else {
          setError('Unable to load enquiries.')
        }
      } catch (err) {
        console.error('Error loading enquiries:', err)
        setError('Unable to load enquiries.')
      } finally {
        setLoading(false)
      }
    }

    loadEnquiries()
  }, [statusFilter, userRole])

  if (userRole && userRole !== 'coaching_admin') {
    return (
      <div>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
          <h6 className="fw-semibold mb-0">Enquiries</h6>
        </div>
        <p className="text-danger-600 text-sm">
          You are not authorized to view this page.
        </p>
      </div>
    )
  }

  const handleChangeNewEnquiry = (
    field: keyof NewEnquiryForm,
    value: string,
  ) => {
    setNewEnquiry((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleSaveEnquiry = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newEnquiry.name.trim() || !newEnquiry.contact_number.trim()) {
      alert('Name and contact number are required.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        setError('You are not authenticated.')
        setSaving(false)
        return
      }

      const payload = {
        enquiry_type: newEnquiry.enquiry_type,
        name: newEnquiry.name.trim(),
        contact_number: newEnquiry.contact_number.trim(),
        email: newEnquiry.email.trim() || null,
        school_name: newEnquiry.school_name.trim() || null,
        class_grade: newEnquiry.class_grade.trim() || null,
        subjects_interested: newEnquiry.subjects_interested.trim() || null,
        description: newEnquiry.description.trim() || null,
      }

      const response = await axios.post<{
        success: boolean
        data: Enquiry
      }>(`${API_BASE_URL}/enquiries`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (response.data.success) {
        const created = response.data.data
        setEnquiries((previous) => [created, ...previous])
        setNewEnquiry({
          enquiry_type: 'student',
          name: '',
          contact_number: '',
          email: '',
          school_name: '',
          class_grade: '',
          subjects_interested: '',
          description: '',
        })
      } else {
        setError('Failed to save enquiry.')
      }
    } catch (err) {
      console.error('Error saving enquiry:', err)
      setError('Failed to save enquiry.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (enquiry: Enquiry) => {
    const nextStatus: 'active' | 'inactive' =
      enquiry.status === 'active' ? 'inactive' : 'active'

    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('You are not authenticated.')
        return
      }

      const response = await axios.put<{
        success: boolean
        data: Enquiry
      }>(
        `${API_BASE_URL}/enquiries/${enquiry.id}`,
        { status: nextStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )

      if (response.data.success) {
        const updated = response.data.data
        setEnquiries((previous) =>
          previous.map((item) => (item.id === updated.id ? updated : item)),
        )
      }
    } catch (err) {
      console.error('Error updating enquiry status:', err)
      alert('Failed to update status.')
    }
  }

  const handleOpenDetail = async (enquiryId: number) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('You are not authenticated.')
        return
      }

      const response = await axios.get<{
        success: boolean
        data: EnquiryDetail
      }>(`${API_BASE_URL}/enquiries/${enquiryId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (response.data.success) {
        setSelectedEnquiry(response.data.data)
        setCommunicationForm({
          channel: 'email',
          notes: '',
          communicated_at: '',
        })
        setDetailModalOpen(true)
      }
    } catch (err) {
      console.error('Error loading enquiry details:', err)
      alert('Failed to load enquiry details.')
    }
  }

  const handleSaveCommunication = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedEnquiry) return

    if (!communicationForm.channel) {
      alert('Channel is required.')
      return
    }

    setSavingCommunication(true)
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        alert('You are not authenticated.')
        setSavingCommunication(false)
        return
      }

      const payload = {
        channel: communicationForm.channel,
        notes: communicationForm.notes.trim() || null,
        communicated_at:
          communicationForm.communicated_at.trim() || undefined,
      }

      const response = await axios.post<{
        success: boolean
        data: {
          enquiry: EnquiryDetail
        }
      }>(
        `${API_BASE_URL}/enquiries/${selectedEnquiry.id}/communications`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )

      if (response.data.success) {
        const updatedDetail = response.data.data.enquiry
        setSelectedEnquiry(updatedDetail)
        setCommunicationForm({
          channel: 'email',
          notes: '',
          communicated_at: '',
        })

        // Reflect last communication date in the main list as well
        setEnquiries((previous) =>
          previous.map((item) =>
            item.id === updatedDetail.id
              ? {
                  ...item,
                  last_communication_at:
                    updatedDetail.last_communication_at ?? item.last_communication_at,
                }
              : item,
          ),
        )
      }
    } catch (err) {
      console.error('Error saving communication log:', err)
      alert('Failed to save communication log.')
    } finally {
      setSavingCommunication(false)
    }
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString()
  }

  const filteredEnquiries = enquiries

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Enquiries</h6>
        <ul className="d-flex align-items-center gap-2">
          <li className="fw-medium">
            <span className="d-flex align-items-center gap-1 text-secondary-light">
              <Icon
                icon="solar:home-smile-angle-outline"
                className="icon text-lg"
              />
              Dashboard
            </span>
          </li>
          <li>-</li>
          <li className="fw-medium">Enquiries</li>
        </ul>
      </div>

      {error && (
        <p className="text-danger-600 text-sm mb-3">{error}</p>
      )}

      <div className="card mb-24">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
          <span className="text-md fw-medium text-secondary-light">
            Add Enquiry
          </span>
        </div>
        <div className="card-body">
          <form className="row g-3" onSubmit={handleSaveEnquiry}>
            <div className="col-md-3">
              <label className="form-label fw-semibold text-sm">
                Enquiry Type
              </label>
              <select
                className="form-select"
                value={newEnquiry.enquiry_type}
                onChange={(event) =>
                  handleChangeNewEnquiry(
                    'enquiry_type',
                    event.target.value as 'student' | 'teacher',
                  )
                }
                disabled={saving}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold text-sm">
                Name<span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={newEnquiry.name}
                onChange={(event) =>
                  handleChangeNewEnquiry('name', event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold text-sm">
                Contact Number<span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={newEnquiry.contact_number}
                onChange={(event) =>
                  handleChangeNewEnquiry(
                    'contact_number',
                    event.target.value,
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold text-sm">Email</label>
              <input
                type="email"
                className="form-control"
                value={newEnquiry.email}
                onChange={(event) =>
                  handleChangeNewEnquiry('email', event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold text-sm">
                School Name
              </label>
              <input
                type="text"
                className="form-control"
                value={newEnquiry.school_name}
                onChange={(event) =>
                  handleChangeNewEnquiry('school_name', event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold text-sm">
                Class / Grade
              </label>
              <input
                type="text"
                className="form-control"
                value={newEnquiry.class_grade}
                onChange={(event) =>
                  handleChangeNewEnquiry('class_grade', event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold text-sm">
                Subjects Interested
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Math, Science"
                value={newEnquiry.subjects_interested}
                onChange={(event) =>
                  handleChangeNewEnquiry(
                    'subjects_interested',
                    event.target.value,
                  )
                }
                disabled={saving}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold text-sm">
                Description / Remarks
              </label>
              <textarea
                className="form-control"
                rows={2}
                value={newEnquiry.description}
                onChange={(event) =>
                  handleChangeNewEnquiry('description', event.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="col-12 d-flex justify-content-end mt-2">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Enquiry'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
          <span className="text-md fw-medium text-secondary-light">
            Enquiry List
          </span>
          <div className="d-flex align-items-center gap-2">
            <span className="text-sm text-secondary-light">Status:</span>
            <select
              className="form-select form-select-sm"
              style={{ width: '150px' }}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')
              }
              disabled={loading}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <p>Loading enquiries...</p>
          ) : filteredEnquiries.length === 0 ? (
            <p className="text-muted mb-0">No enquiries found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Last Communication</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnquiries.map((enquiry) => (
                    <tr key={enquiry.id}>
                      <td className="text-capitalize">{enquiry.enquiry_type}</td>
                      <td>{enquiry.name}</td>
                      <td>{enquiry.contact_number}</td>
                      <td>{enquiry.email || '-'}</td>
                      <td className="text-capitalize">{enquiry.status}</td>
                      <td>{formatDateTime(enquiry.last_communication_at)}</td>
                      <td>{formatDateTime(enquiry.created_at)}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenDetail(enquiry.id)}
                          >
                            View
                          </Button>
                          <Button
                            variant={
                              enquiry.status === 'active'
                                ? 'outline-danger'
                                : 'outline-success'
                            }
                            size="sm"
                            onClick={() => handleToggleStatus(enquiry)}
                          >
                            {enquiry.status === 'active'
                              ? 'Mark Inactive'
                              : 'Mark Active'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        show={detailModalOpen}
        onHide={() => setDetailModalOpen(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Enquiry Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEnquiry && (
            <div className="row g-3">
              <div className="col-md-6">
                <h6 className="fw-semibold mb-2">Basic Information</h6>
                <div className="mb-2">
                  <span className="text-secondary-light text-sm">Type:</span>{' '}
                  <span className="text-sm text-capitalize">
                    {selectedEnquiry.enquiry_type}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-secondary-light text-sm">Name:</span>{' '}
                  <span className="text-sm">{selectedEnquiry.name}</span>
                </div>
                <div className="mb-2">
                  <span className="text-secondary-light text-sm">
                    Contact:
                  </span>{' '}
                  <span className="text-sm">
                    {selectedEnquiry.contact_number}
                  </span>
                </div>
                {selectedEnquiry.email && (
                  <div className="mb-2">
                    <span className="text-secondary-light text-sm">
                      Email:
                    </span>{' '}
                    <span className="text-sm">{selectedEnquiry.email}</span>
                  </div>
                )}
                {selectedEnquiry.school_name && (
                  <div className="mb-2">
                    <span className="text-secondary-light text-sm">
                      School:
                    </span>{' '}
                    <span className="text-sm">
                      {selectedEnquiry.school_name}
                    </span>
                  </div>
                )}
                {selectedEnquiry.class_grade && (
                  <div className="mb-2">
                    <span className="text-secondary-light text-sm">
                      Class / Grade:
                    </span>{' '}
                    <span className="text-sm">
                      {selectedEnquiry.class_grade}
                    </span>
                  </div>
                )}
                {selectedEnquiry.subjects_interested && (
                  <div className="mb-2">
                    <span className="text-secondary-light text-sm">
                      Subjects:
                    </span>{' '}
                    <span className="text-sm">
                      {selectedEnquiry.subjects_interested}
                    </span>
                  </div>
                )}
                {selectedEnquiry.description && (
                  <div className="mb-2">
                    <span className="text-secondary-light text-sm">
                      Remarks:
                    </span>{' '}
                    <span className="text-sm">
                      {selectedEnquiry.description}
                    </span>
                  </div>
                )}
                <div className="mb-2">
                  <span className="text-secondary-light text-sm">Status:</span>{' '}
                  <span className="text-sm text-capitalize">
                    {selectedEnquiry.status}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-secondary-light text-sm">
                    Last Communication:
                  </span>{' '}
                  <span className="text-sm">
                    {formatDateTime(selectedEnquiry.last_communication_at)}
                  </span>
                </div>
              </div>

              <div className="col-md-6">
                <h6 className="fw-semibold mb-2">Communication Logs</h6>
                <form className="mb-3" onSubmit={handleSaveCommunication}>
                  <div className="row g-2 align-items-end">
                    <div className="col-4">
                      <label className="form-label fw-semibold text-sm">
                        Channel
                      </label>
                      <select
                        className="form-select form-select-sm"
                        value={communicationForm.channel}
                        onChange={(event) =>
                          setCommunicationForm((previous) => ({
                            ...previous,
                            channel:
                              event.target.value as NewCommunicationForm['channel'],
                          }))
                        }
                        disabled={savingCommunication}
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-8">
                      <label className="form-label fw-semibold text-sm">
                        Notes
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={communicationForm.notes}
                        onChange={(event) =>
                          setCommunicationForm((previous) => ({
                            ...previous,
                            notes: event.target.value,
                          }))
                        }
                        disabled={savingCommunication}
                      />
                    </div>
                    <div className="col-6 mt-2">
                      <label className="form-label fw-semibold text-sm">
                        Date &amp; Time (optional)
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={communicationForm.communicated_at}
                        onChange={(event) =>
                          setCommunicationForm((previous) => ({
                            ...previous,
                            communicated_at: event.target.value,
                          }))
                        }
                        disabled={savingCommunication}
                      />
                    </div>
                    <div className="col-6 mt-4 d-flex justify-content-end">
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        disabled={savingCommunication}
                      >
                        {savingCommunication
                          ? 'Saving...'
                          : 'Add Communication'}
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="border rounded p-2" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {selectedEnquiry.communications &&
                  selectedEnquiry.communications.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {selectedEnquiry.communications.map((log) => (
                        <li
                          key={log.id}
                          className="mb-2 pb-2 border-bottom last:border-0"
                        >
                          <div className="d-flex justify-content-between">
                            <span className="badge bg-neutral-100 text-capitalize text-xs">
                              {log.channel}
                            </span>
                            <span className="text-xs text-secondary-light">
                              {formatDateTime(log.communicated_at || log.created_at)}
                            </span>
                          </div>
                          {log.notes && (
                            <div className="mt-1 text-sm">{log.notes}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted text-sm mb-0">
                      No communication logs yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}
