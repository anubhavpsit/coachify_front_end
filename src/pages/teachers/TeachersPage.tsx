import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Avatar from '../../components/common/Avatar.tsx';
import Icon from '../../components/common/Icon.tsx';
import UserProfileModal from '../../components/UserProfileModal';

interface Teacher {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
  dob?: string | null;
}

function getTodayDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add teacher modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [newTeacherDob, setNewTeacherDob] = useState<string>(getTodayDateValue()); // initialize with today

  // Edit teacher modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher & { password?: string } | null>(null);
  const [editTeacherPassword, setEditTeacherPassword] = useState('');
  const [editTeacherDob, setEditTeacherDob] = useState<string>(''); // will populate on edit

  // Delete teacher modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);

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

  /** Fetch Teachers */
  useEffect(() => {
    if (!userRole) return; // wait until role is set

    const fetchTeachers = async () => {
      try {
        const token = localStorage.getItem('authToken');
        let url = `${API_BASE_URL}/teachers`; // admin sees all teachers

        if (userRole === 'student') {
          url = `${API_BASE_URL}/students/teachers`; // assigned teachers for student
        }

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });

        if (response.data.success) {
          setTeachers(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [API_BASE_URL, userRole]);

  /** Create Teacher */
  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherEmail.trim() || !newTeacherPassword.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/teachers`,
        {
          name: newTeacherName,
          email: newTeacherEmail,
          password: newTeacherPassword,
          dob: newTeacherDob, // send dob
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setTeachers(prev => [...prev, response.data.data]);
        setNewTeacherName('');
        setNewTeacherEmail('');
        setNewTeacherPassword('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert('Failed to save teacher.');
    } finally {
      setSaving(false);
    }
  };

  /** Open Edit Modal */
  const handleOpenEditModal = (teacher: Teacher) => {
    setEditTeacher(teacher);
    setEditTeacherPassword(''); // reset password field
    setEditTeacherDob(teacher.dob || ''); // populate DOB
    setShowEditModal(true);
  };

  /** Update Teacher */
  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeacher) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE_URL}/teachers/${editTeacher.id}`,
        {
          name: editTeacher.name,
          email: editTeacher.email,
          password: editTeacherPassword || undefined, // send only if changed
          dob: editTeacherDob, // send updated DOB
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setTeachers(prev =>
          prev.map(t => (t.id === editTeacher.id ? { ...editTeacher } : t))
        );
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating teacher:', error);
      alert('Failed to update teacher.');
    } finally {
      setSaving(false);
    }
  };

  /** Open Delete Modal */
  const handleOpenDeleteModal = (teacher: Teacher) => {
    setDeleteTeacher(teacher);
    setShowDeleteModal(true);
  };

  /** Delete Teacher */
  const handleDeleteTeacher = async () => {
    if (!deleteTeacher) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/teachers/${deleteTeacher.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });

      setTeachers(prev => prev.filter(t => t.id !== deleteTeacher.id));
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert('Failed to delete teacher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Teachers</h6>
        <Button variant="primary" onClick={() => setShowAddModal(true)}  className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
          <Icon icon="ic:baseline-plus" className="icon text-xl" />
          Add New Teacher
        </Button>
      </div>

      {/* Teachers Table */}
      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light">Teachers List</span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-6">
              <span className="spinner-border spinner-border-sm"></span>
              <span className="ms-2">Loading teachers...</span>
            </div>
          ) : teachers.length === 0 ? (
            <p className="text-center text-muted">No teachers found.</p>
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
                  {teachers.map(teacher => (
                    <tr key={teacher.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar
                            user={teacher}
                            size={32}
                            color={{
                              bg: "bg-success-100",
                              text: "text-success-600",
                            }}
                          />
                          <span>{teacher.name}</span>
                        </div>
                      </td>
                      <td>{teacher.email}</td>
                      <td className="text-center">
                        {teacher.tenant_id !== 0 && (
                          <>
                            <Button
                              variant="link"
                              onClick={() => handleViewUser(teacher.id)}
                            >
                              View
                            </Button>
                            {userRole === 'coaching_admin' && (
                              <>
                                <Button variant="link" onClick={() => handleOpenEditModal(teacher)}>
                                  <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                                </Button>
                                <Button variant="link" onClick={() => handleOpenDeleteModal(teacher)}>
                                  <Icon icon="ic:baseline-delete" className="text-danger text-lg" />
                                </Button>
                              </>
                            )}
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

      {/* Add Teacher Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Teacher</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSaveTeacher}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Teacher Name"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter Teacher Email"
                value={newTeacherEmail}
                onChange={(e) => setNewTeacherEmail(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter Password"
                value={newTeacherPassword}
                onChange={(e) => setNewTeacherPassword(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={newTeacherDob}
                onChange={(e) => setNewTeacherDob(e.target.value)}
              />
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

      {/* Edit Teacher Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Teacher</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleUpdateTeacher}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                value={editTeacher?.name || ''}
                onChange={(e) => editTeacher && setEditTeacher({ ...editTeacher, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                value={editTeacher?.email || ''}
                onChange={(e) => editTeacher && setEditTeacher({ ...editTeacher, email: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter new password (leave blank to keep current)"
                value={editTeacherPassword}
                onChange={(e) => setEditTeacherPassword(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={editTeacherDob}
                onChange={(e) => setEditTeacherDob(e.target.value)}
              />
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

      {/* Delete Teacher Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Teacher</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{deleteTeacher?.name}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteTeacher} disabled={saving}>
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
