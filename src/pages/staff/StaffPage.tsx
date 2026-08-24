import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Avatar from '../../components/common/Avatar.tsx';
import Icon from '../../components/common/Icon.tsx';
import UserProfileModal from '../../components/UserProfileModal';

interface Staff {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
  dob?: string | null;
  gender?: string | null;
}

function getTodayDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add staff modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffDob, setNewStaffDob] = useState<string>(getTodayDateValue()); // initialize with today
  const [newStaffGender, setNewStaffGender] = useState<string>('');

  // Edit staff modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff & { password?: string } | null>(null);
  const [editStaffPassword, setEditStaffPassword] = useState('');
  const [editStaffDob, setEditStaffDob] = useState<string>(''); // will populate on edit
  const [editStaffGender, setEditStaffGender] = useState<string>('');

  // Delete staff modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStaff, setDeleteStaff] = useState<Staff | null>(null);

  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const [viewUserId, setViewUserId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

  useEffect(() => {
    const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    setUserRole(authUser.role);
  }, []);

  const handleViewUser = (id: number) => {
    setViewUserId(id);
    setShowProfileModal(true);
  };

  /** Fetch Staff */
  useEffect(() => {
    if (!userRole) return; // wait until role is set

    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem('authToken');

        const response = await axios.get(`${API_BASE_URL}/staff`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });

        if (response.data.success) {
          setStaff(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [API_BASE_URL, userRole]);

  /** Create Staff */
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim() || !newStaffGender) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/staff`,
        {
          name: newStaffName,
          email: newStaffEmail,
          password: newStaffPassword,
          dob: newStaffDob,
          gender: newStaffGender,
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setStaff(prev => [...prev, response.data.data]);
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPassword('');
        setNewStaffGender('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Failed to save staff member.');
    } finally {
      setSaving(false);
    }
  };

  /** Open Edit Modal */
  const handleOpenEditModal = (member: Staff) => {
    setEditStaff(member);
    setEditStaffPassword(''); // reset password field
    setEditStaffDob(member.dob || ''); // populate DOB
    setEditStaffGender(member.gender || '');
    setShowEditModal(true);
  };

  /** Update Staff */
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE_URL}/staff/${editStaff.id}`,
        {
          name: editStaff.name,
          email: editStaff.email,
          password: editStaffPassword || undefined, // send only if changed
          dob: editStaffDob,
          gender: editStaffGender,
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setStaff(prev =>
          prev.map(s => (s.id === editStaff.id ? { ...editStaff } : s))
        );
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Failed to update staff member.');
    } finally {
      setSaving(false);
    }
  };

  /** Open Delete Modal */
  const handleOpenDeleteModal = (member: Staff) => {
    setDeleteStaff(member);
    setShowDeleteModal(true);
  };

  /** Delete Staff */
  const handleDeleteStaff = async () => {
    if (!deleteStaff) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/staff/${deleteStaff.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });

      setStaff(prev => prev.filter(s => s.id !== deleteStaff.id));
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Staff</h6>
        <Button variant="primary" onClick={() => setShowAddModal(true)}  className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
          <Icon icon="ic:baseline-plus" className="icon text-xl" />
          Add New Staff
        </Button>
      </div>

      {/* Staff Table */}
      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light">Staff List</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-6">
              <span className="spinner-border spinner-border-sm"></span>
              <span className="ms-2">Loading staff...</span>
            </div>
          ) : staff.length === 0 ? (
            <p className="text-center text-muted">No staff members found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(member => (
                    <tr key={member.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar
                            user={member}
                            size={32}
                            color={{
                              bg: "bg-success-100",
                              text: "text-success-600",
                            }}
                          />
                          <span>{member.name}</span>
                        </div>
                      </td>
                      <td>{member.email}</td>
                      <td className="text-center">
                        <Button
                          variant="link"
                          onClick={() => handleViewUser(member.id)}
                        >
                          View
                        </Button>
                        {userRole === 'coaching_admin' && (
                          <>
                            <Button variant="link" onClick={() => handleOpenEditModal(member)}>
                              <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                            </Button>
                            <Button variant="link" onClick={() => handleOpenDeleteModal(member)}>
                              <Icon icon="ic:baseline-delete" className="text-danger text-lg" />
                            </Button>
                          </>
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

      {/* Add Staff Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Staff</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSaveStaff}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Staff Name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter Staff Email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter Password"
                value={newStaffPassword}
                onChange={(e) => setNewStaffPassword(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={newStaffDob}
                onChange={(e) => setNewStaffDob(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Gender <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={newStaffGender}
                onChange={(e) => setNewStaffGender(e.target.value)}
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Staff</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleUpdateStaff}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                value={editStaff?.name || ''}
                onChange={(e) => editStaff && setEditStaff({ ...editStaff, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                value={editStaff?.email || ''}
                onChange={(e) => editStaff && setEditStaff({ ...editStaff, email: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter new password (leave blank to keep current)"
                value={editStaffPassword}
                onChange={(e) => setEditStaffPassword(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={editStaffDob}
                onChange={(e) => setEditStaffDob(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Gender <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={editStaffGender}
                onChange={(e) => setEditStaffGender(e.target.value)}
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Staff Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Staff</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{deleteStaff?.name}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteStaff} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      <UserProfileModal
        show={showProfileModal}
        onHide={() => setShowProfileModal(false)}
        userId={viewUserId}
        canEditImage={userRole === 'coaching_admin'}
      />
    </div>
  );
}
