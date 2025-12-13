import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import AssignTeachersModal from '../../components/AssignTeachersModal';
import Avatar from '../../components/common/Avatar.tsx';
import { ROLES } from '../../constants/roles'

interface StudentProfile {
  class: string;
  subjects: string[];
  phone: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
  student_profile?: StudentProfile | null;
}

interface StudentForm {
  name: string;
  email: string;
  password: string;
  class: string;
  subjects: string[];
  phone: string;
}

function getTodayDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [myStudents, setMyStudents] = useState<Student[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  //const [dob, setDob] = useState<string>(getTodayDateValue())

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
  const tenantId = sessionStorage.getItem('tenant_id');

  // Add student modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState<StudentForm>({
    name: '',
    email: '',
    password: '',
    class: '',
    subjects: [],
    phone: '',
    dob: '',
  });

  // Edit student modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudentForm, setEditStudentForm] = useState<StudentForm | null>(null);
  const [editStudentId, setEditStudentId] = useState<number | null>(null);

  // Delete student modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const handleOpenAssignModal = (studentId: number) => {
    setSelectedStudentId(studentId);
    setShowAssignModal(true);
  };

  useEffect(() => {
    const authUser = JSON.parse(sessionStorage.getItem('authUser') || '{}');
    setUserRole(authUser.role);
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/subjects/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (response.data.status) {
          setSubjects(response.data.data); // expecting an array of strings
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    fetchSubjects();
  }, [API_BASE_URL]);


  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/classes/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (response.data.success) {
          setClasses(response.data.data); // expecting an array of strings
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    fetchClasses();
  }, [API_BASE_URL]);


  // Fetch students
  useEffect(() => {
    const fetchStudentsOld = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/students`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        if (response.data.success) {
          setStudents(response.data.data || []);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    const fetchStudents = async () => {
      if (!userRole) return; // wait until userRole is set
      try {
        const token = sessionStorage.getItem('authToken');
        console.dir("userRole")
        console.dir(userRole)
        console.dir("userRole")
        let url = `${API_BASE_URL}/students`; 
        if (userRole == 'teacher') {
          url = `${API_BASE_URL}/teachers/students`; // my students for teacher
        }
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        if (response.data.success) {
          setStudents(response.data.data);
          // if (userRole === 'teacher') setStudents(response.data.data);
          // else setStudents(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [API_BASE_URL, userRole]);


  const handleSubjectToggle = (subject: string, type: 'add' | 'edit') => {
    if (type === 'add') {
      setNewStudentForm(prev => ({
        ...prev,
        subjects: prev.subjects.includes(subject)
          ? prev.subjects.filter(s => s !== subject)
          : [...prev.subjects, subject],
      }));
    } else {
      setEditStudentForm(prev => prev ? {
        ...prev,
        subjects: prev.subjects.includes(subject)
          ? prev.subjects.filter(s => s !== subject)
          : [...prev.subjects, subject],
      } : null);
    }
  };

  // Add student
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name.trim() || !newStudentForm.email.trim() || !newStudentForm.password.trim()) return;

    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/students`,
        newStudentForm,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setStudents(prev => [...prev, response.data.data]);
        setNewStudentForm({ name: '', email: '', password: '', class: '', subjects: [], phone: '', dob: '' });
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
    setEditStudentId(student.id);
    setEditStudentForm({
      name: student.name,
      email: student.email,
      password: '',
      class: student.student_profile?.class || '',
      subjects: student.student_profile?.subjects || [],
      phone: student.student_profile?.phone || '',
      dob: student.dob || '',
    });
    setShowEditModal(true);
  };

  // Update student
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentForm || editStudentId === null) return;

    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE_URL}/students/${editStudentId}`,
        editStudentForm,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        setStudents(prev =>
          prev.map(s =>
            s.id === editStudentId ? response.data.data : s
          )
        );
        setEditStudentForm(null);
        setEditStudentId(null);
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
      setDeleteStudent(null);
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
        {userRole === ROLES.COACHING_ADMIN ? (
        <Button variant="primary" onClick={() => setShowAddModal(true)} className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
          <iconify-icon icon="ic:baseline-plus" className="icon text-xl"></iconify-icon>
          Add New Student
        </Button>
        ) : (
          <></>  
          )}
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
                    <th>Class</th>
                    <th>Subjects</th>
                    {userRole === ROLES.COACHING_ADMIN ? (
                      <>
                        <th>Phone</th>
                        <th className="text-center">Actions</th>
                      </>
                    ) : (
                      <></>      
                    )}
                  </tr>
                </thead>
                <tbody>
                  {students.filter(s => s !== null).map(student => (
                    <tr key={student.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <Avatar
                            user={student}
                            size={32}
                            color={{
                              bg: "bg-info-100",
                              text: "text-info-600",
                            }}
                          />
                          <span>{student.name}</span>
                        </div>
                      </td>
                      <td>{student.email}</td>
                      <td>
                        {classes.find(c => c.id == student.student_profile?.class)?.name || '-'}
                      </td>
                      <td>
                        {student.student_profile?.subjects
                          ?.map((subId) => subjects.find(s => s.id === subId)?.subject)
                          .filter(Boolean) // remove undefined if subject not found
                          .join(', ') || '-'}
                      </td>
                      {userRole === ROLES.COACHING_ADMIN ? (
                      <><td>{student.student_profile?.phone || '-'}</td>
                      <td className="text-center">
                        {student.tenant_id !== 0 && (
                          <>
                            <Button variant="link" onClick={() => handleOpenEditModal(student)}>Edit</Button>
                            <Button variant="link" onClick={() => handleOpenDeleteModal(student)}>Delete</Button>
                            <Button variant="link" onClick={() => handleOpenAssignModal(student.id)} >Assign Teachers</Button>
{selectedStudentId && (
  <AssignTeachersModal
    show={showAssignModal}
    onHide={() => setShowAssignModal(false)}
    studentId={selectedStudentId}
    onAssigned={() => {
      // optionally refresh students list or show a success message
    }}
  />
)}
                          </>
                        )}
                      </td></> 
                    ) : (
                      <></>  
                      )}
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
                value={newStudentForm.name}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                value={newStudentForm.email}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control"
                value={newStudentForm.password}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date of birth</label>
              <input
                type="date"
                className="form-control"
                value={newStudentForm.dob || getTodayDateValue()}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, dob: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Class</label>
              <select
                className="form-control"
                value={newStudentForm.class}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, class: e.target.value })}
                disabled={saving}
              >
                <option value="">Select Class</option>
                  {classes.map((cls, index) => (
                    <option key={index} value={cls.id}>{cls.name}</option>
                  ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Subjects</label>
              <div className="d-flex flex-wrap gap-2">
                {subjects.map((sub, index) => (
                  <div className="form-check" key={index}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={newStudentForm.subjects.includes(sub.id)}
                      onChange={() => handleSubjectToggle(sub.id, 'add')}
                      disabled={saving}
                    />
                    <label className="form-check-label">{sub.subject}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Phone</label>
              <input
                type="text"
                className="form-control"
                value={newStudentForm.phone}
                onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
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
                value={editStudentForm?.name || ''}
                onChange={(e) => editStudentForm && setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                className="form-control"
                value={editStudentForm?.email || ''}
                onChange={(e) => editStudentForm && setEditStudentForm({ ...editStudentForm, email: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Password (leave blank to keep current)</label>
              <input
                type="password"
                className="form-control"
                value={editStudentForm?.password || ''}
                onChange={(e) => editStudentForm && setEditStudentForm({ ...editStudentForm, password: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={editStudentForm?.dob || ''}
                onChange={(e) => editStudentForm && setEditStudentForm({ ...editStudentForm, dob: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Class</label>
              <select
                className="form-control"
                value={editStudentForm?.class || ''}
                onChange={(e) => editStudentForm && setEditStudentForm({ ...editStudentForm, class: Number(e.target.value) })}
                disabled={saving}
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>

            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Subjects</label>
              <div className="d-flex flex-wrap gap-2">
                {subjects.map((sub, index) => (
                  <div className="form-check" key={index}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={editStudentForm?.subjects.includes(sub.id) || false}
                      onChange={() => handleSubjectToggle(sub.id, 'edit')}
                      disabled={saving}
                    />
                    <label className="form-check-label">{sub.subject}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Phone</label>
              <input
                type="text"
                className="form-control"
                value={editStudentForm?.phone || ''}
                onChange={(e) => editStudentForm && setEditStudentForm({ ...editStudentForm, phone: e.target.value })}
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
