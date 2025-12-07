import { useEffect, useState } from 'react';
import axios from 'axios';
import Icon from '../../components/common/Icon.tsx';
import { Modal, Button } from 'react-bootstrap';

interface Student {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');

  // Edit student modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editStudentPassword, setEditStudentPassword] = useState('');

  // Delete student modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  const [saving, setSaving] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/students`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        if (response.data.success) {
          setStudents(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [API_BASE_URL]);

  // Add student
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim() || !newStudentPassword.trim()) return;

    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/students`,
        {
          name: newStudentName,
          email: newStudentEmail,
          password: newStudentPassword,
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setStudents(prev => [...prev, response.data.data]);
        setNewStudentName('');
        setNewStudentEmail('');
        setNewStudentPassword('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to save student.');
    } finally {
      setSaving(false);
    }
  };

  // Open edit modal
  const handleOpenEditModal = (student: Student) => {
    setEditStudent(student);
    setEditStudentPassword('');
    setShowEditModal(true);
  };

  // Update student
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;

    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE_URL}/students/${editStudent.id}`,
        {
          name: editStudent.name,
          email: editStudent.email,
          password: editStudentPassword || undefined,
        },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setStudents(prev =>
          prev.map(s => (s.id === editStudent.id ? { ...editStudent, password: undefined } : s))
        );
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Failed to update student.');
    } finally {
      setSaving(false);
    }
  };

  // Open delete modal
  const handleOpenDeleteModal = (student: Student) => {
    setDeleteStudent(student);
    setShowDeleteModal(true);
  };

  // Delete student
  const handleDeleteStudent = async () => {
    if (!deleteStudent) return;

    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/students/${deleteStudent.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      setStudents(prev => prev.filter(s => s.id !== deleteStudent.id));
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Students</h6>
        <Button variant="primary" onClick={() => setShowAddModal(true)} className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
          <iconify-icon icon="ic:baseline-plus" className="icon text-xl line-height-1"></iconify-icon>
          Add New Student
        </Button>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light">Students List</span>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="text-center py-6">
              <span className="spinner-border spinner-border-sm"></span>
              <span className="ms-2">Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <p className="text-center text-muted">No students found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th className="text-center">Type</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td className="text-center">
                        {student.tenant_id === 0 ? (
                          <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">
                            Default
                          </span>
                        ) : (
                          <span className="bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {student.tenant_id !== 0 && (
                          <>
                            <Button variant="link" onClick={() => handleOpenEditModal(student)}>
                              <iconify-icon icon="ic:baseline-edit" className="text-primary text-lg"></iconify-icon>
                            </Button>
                            <Button variant="link" onClick={() => handleOpenDeleteModal(student)}>
                              <iconify-icon icon="ic:baseline-delete" className="text-danger text-lg"></iconify-icon>
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

      {/* Add Student Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSaveStudent}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Student Name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter Student Email"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter Password"
                value={newStudentPassword}
                onChange={(e) => setNewStudentPassword(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Student Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleUpdateStudent}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Name</label>
              <input
                type="text"
                className="form-control"
                value={editStudent?.name || ''}
                onChange={(e) => editStudent && setEditStudent({ ...editStudent, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                value={editStudent?.email || ''}
                onChange={(e) => editStudent && setEditStudent({ ...editStudent, email: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password (Leave blank to keep current)</label>
              <input
                type="password"
                className="form-control"
                value={editStudentPassword}
                onChange={(e) => setEditStudentPassword(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Updating...' : 'Update'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Student Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{deleteStudent?.name}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteStudent} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
