import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import AssignTeachersModal from '../../components/AssignTeachersModal';
import Avatar from '../../components/common/Avatar.tsx';
import Icon from '../../components/common/Icon.tsx';
import { ROLES } from '../../constants/roles'
import UserProfileModal from '../../components/UserProfileModal';

interface StudentProfile {
  class: number | null;
  subjects: number[];
  phone: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
  current_class_id?: number | null;
  current_class_name?: string | null;
  student_profile?: StudentProfile | null;
  dob?: string | null;
  created_at?: string | null;
}

interface StudentForm {
  name: string;
  email: string;
  password: string;
  class: number | '';
  subjects: number[];
  phone: string;
  dob: string;
}

interface StudentFallbackData {
  classId: number | null;
  subjects: number[];
  phone: string;
  createdAt?: string;
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
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<Array<{ id: number; name: string; is_current: boolean }>>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | ''>('');
  const [userRole, setUserRole] = useState<string>('');
  //const [dob, setDob] = useState<string>(getTodayDateValue())

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
  const tenantId = localStorage.getItem('tenant_id');

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
  const [subjects, setSubjects] = useState<{ id: number; subject: string }[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const [viewUserId, setViewUserId] = useState<number | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  // Bulk promote
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [bulkFromYearId, setBulkFromYearId] = useState<number | ''>('');
  const [bulkFromClassId, setBulkFromClassId] = useState<number | ''>('');
  const [bulkToYearId, setBulkToYearId] = useState<number | ''>('');
  const [bulkToClassId, setBulkToClassId] = useState<number | ''>('');
  const [promoting, setPromoting] = useState(false);

  // Single-student promote
  const [showSinglePromoteModal, setShowSinglePromoteModal] = useState(false);
  const [promoteStudentId, setPromoteStudentId] = useState<number | null>(null);
  const [singleToYearId, setSingleToYearId] = useState<number | ''>('');
  const [singleToClassId, setSingleToClassId] = useState<number | ''>('');
  const [promotingSingle, setPromotingSingle] = useState(false);

  const formatAddedOn = (isoString?: string | null) => {
    if (!isoString) return '-';
    const parsedDate = new Date(isoString);
    if (Number.isNaN(parsedDate.getTime())) return '-';
    return parsedDate.toLocaleString();
  };

  const getStudentTimestamp = (student: Student) => {
    if (!student.created_at) return 0;
    const timestamp = Date.parse(student.created_at);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const sortStudentsByCreatedAt = (list: Student[]) => {
    return [...list].sort((a, b) => getStudentTimestamp(b) - getStudentTimestamp(a));
  };

  const enrichStudentData = (student: Student, fallback: StudentFallbackData): Student => {
    const normalizedClass =
      typeof student.student_profile?.class === 'number'
        ? student.student_profile.class
        : fallback.classId;
    const serverSubjects = student.student_profile?.subjects;
    const normalizedSubjects =
      Array.isArray(serverSubjects) && serverSubjects.length > 0
        ? serverSubjects
        : fallback.subjects;
    const serverPhone = student.student_profile?.phone;
    const normalizedPhone =
      typeof serverPhone === 'string' && serverPhone.trim().length > 0
        ? serverPhone
        : fallback.phone;
    const normalizedCreatedAt =
      student.created_at ?? fallback.createdAt ?? new Date().toISOString();

    return {
      ...student,
      created_at: normalizedCreatedAt,
      student_profile: {
        ...(student.student_profile ?? {}),
        class: normalizedClass,
        subjects: normalizedSubjects,
        phone: normalizedPhone,
      } as StudentProfile,
    };
  };

  const handleOpenAssignModal = (studentId: number) => {
    setSelectedStudentId(studentId);
    setShowAssignModal(true);
  };

  const handleOpenSinglePromote = (student: Student) => {
    setPromoteStudentId(student.id);
    const currentYear = academicYears.find(y => y.is_current);
    setSingleToYearId(currentYear ? currentYear.id : '');
    const inferredClass = (student.current_class_id ?? student.student_profile?.class) || '';
    setSingleToClassId(typeof inferredClass === 'number' ? inferredClass : '');
    setShowSinglePromoteModal(true);
  };

  const handleViewUser = (id: number) => {
    setViewUserId(id);
    setShowProfileModal(true);
  };

  useEffect(() => {
    // Load academic years
    const fetchYears = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_BASE_URL}/academic-years`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (res.data?.success && Array.isArray(res.data.data)) {
          setAcademicYears(res.data.data);
          const cur = res.data.data.find((y: any) => !!y.is_current);
          if (cur) setSelectedYearId(cur.id);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchYears();
    const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    setUserRole(authUser.role);
  }, []);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('authToken');
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
        const token = localStorage.getItem('authToken');
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
    const fetchStudents = async () => {
      if (!userRole) return; // wait until userRole is set
      try {
        const token = localStorage.getItem('authToken');
        console.dir("userRole")
        console.dir(userRole)
        console.dir("userRole")
        let url = `${API_BASE_URL}/students`;
        if (userRole == 'teacher') {
          url = `${API_BASE_URL}/teachers/students`; // my students for teacher
        }
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          params: selectedYearId ? { academic_year_id: selectedYearId } : {},
        });

        if (response.data.success) {
          const fetchedStudents = Array.isArray(response.data.data)
            ? (response.data.data as Student[])
            : [];
          setStudents(sortStudentsByCreatedAt(fetchedStudents));
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [API_BASE_URL, userRole, selectedYearId]);


  const handleSubjectToggle = (subjectId: number, type: 'add' | 'edit') => {
    if (type === 'add') {
      setNewStudentForm(prev => ({
        ...prev,
        subjects: prev.subjects.includes(subjectId)
          ? prev.subjects.filter(s => s !== subjectId)
          : [...prev.subjects, subjectId],
      }));
    } else {
      setEditStudentForm(prev => prev ? {
        ...prev,
        subjects: prev.subjects.includes(subjectId)
          ? prev.subjects.filter(s => s !== subjectId)
          : [...prev.subjects, subjectId],
      } : null);
    }
  };

  // Add student
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name.trim() || !newStudentForm.email.trim() || !newStudentForm.password.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/students`,
        newStudentForm,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success) {
        const createdStudent: Student = response.data.data;
        const fallbackClass = newStudentForm.class === '' ? null : Number(newStudentForm.class);
        const enrichedStudent = enrichStudentData(createdStudent, {
          classId: fallbackClass,
          subjects: newStudentForm.subjects,
          phone: newStudentForm.phone,
          createdAt: createdStudent.created_at ?? new Date().toISOString(),
        });

        setStudents(prev => sortStudentsByCreatedAt([enrichedStudent, ...prev]));
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
    // Prefer the resolved current_class_id for the selected/current academic year.
    const inferredClassId = (student.current_class_id ?? (
      typeof student.student_profile?.class === 'number' ? student.student_profile.class : null
    )) || '';
    setEditStudentForm({
      name: student.name,
      email: student.email,
      password: '',
      class: inferredClassId,
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
      const token = localStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE_URL}/students/${editStudentId}`,
        editStudentForm,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success && editStudentForm) {
        const updatedStudent: Student = response.data.data;
        const fallbackClass = editStudentForm.class === '' ? null : Number(editStudentForm.class);
        const existingStudent = students.find(s => s.id === editStudentId);
        const enrichedStudent = enrichStudentData(updatedStudent, {
          classId: fallbackClass,
          subjects: editStudentForm.subjects,
          phone: editStudentForm.phone,
          createdAt: existingStudent?.created_at ?? undefined,
        });

        setStudents(prev =>
          sortStudentsByCreatedAt(
            prev.map(s =>
              s.id === editStudentId ? enrichedStudent : s
            )
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
      const token = localStorage.getItem('authToken');
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
        <div className="d-flex align-items-center gap-2">
          <div className="d-flex align-items-center gap-2">
            <label className="text-sm text-secondary">Year</label>
            <select
              className="form-select form-select-sm"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Current</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (current)' : ''}</option>
              ))}
            </select>
          </div>
          {userRole === ROLES.COACHING_ADMIN && (
            <Button variant="primary" onClick={() => setShowAddModal(true)} className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
              <Icon icon="ic:baseline-plus" className="icon text-xl" />
              Add New Student
            </Button>
          )}
          {userRole === ROLES.COACHING_ADMIN && (
            <Button variant="outline-primary" onClick={() => {
              setBulkFromYearId(selectedYearId || '');
              const cur = academicYears.find(y => y.is_current);
              setBulkToYearId(cur?.id || '');
              setShowPromoteModal(true);
            }} className="btn btn-outline-primary text-sm btn-sm px-12 py-12 radius-8 ms-2">
              <Icon icon="mdi:arrow-up-bold" className="icon text-xl" />
              Bulk Promote
            </Button>
          )}
        </div>
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
                    <th>Added On</th>
                    <th className="text-center">Profile</th>
                    {userRole === ROLES.COACHING_ADMIN && (
                      <>
                        <th>Phone</th>
                        <th className="text-center">Actions</th>
                      </>
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
                        {classes.find(c => c.id == (student.current_class_id ?? student.student_profile?.class))?.name
                          || (typeof student.current_class_name === 'string' && student.current_class_name.trim() !== ''
                                ? student.current_class_name
                                : '-')}
                      </td>
                      <td>
                        {student.student_profile?.subjects
                          ?.map((subId) => subjects.find(s => s.id === subId)?.subject)
                          .filter(Boolean) // remove undefined if subject not found
                          .join(', ') || '-'}
                      </td>
                      <td>{formatAddedOn(student.created_at)}</td>
                      <td className="text-center">
                        <Button
                          variant="link"
                          onClick={() => handleViewUser(student.id)}
                        >
                          View
                        </Button>
                      </td>
                      {userRole === ROLES.COACHING_ADMIN && (
                        <>
                          <td>{student.student_profile?.phone || '-'}</td>
                          <td className="text-center">
                            {student.tenant_id !== 0 && (
                              <>
                                <Button variant="link" onClick={() => handleOpenEditModal(student)}>Edit</Button>
                        <Button variant="link" onClick={() => handleOpenDeleteModal(student)}>Delete</Button>
                        <Button variant="link" onClick={() => handleOpenAssignModal(student.id)} >Assign Teachers</Button>
                        <Button variant="link" onClick={() => handleOpenSinglePromote(student)} >Promote</Button>
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
                          </td>
                        </>
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
                onChange={(e) =>
                  setNewStudentForm({
                    ...newStudentForm,
                    class: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
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

      {/* Bulk Promote Modal */}
      <Modal show={showPromoteModal} onHide={() => setShowPromoteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Bulk Promote Students</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label fw-semibold">From Academic Year</label>
            <select className="form-control" value={bulkFromYearId} onChange={(e)=> setBulkFromYearId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Current</option>
              {academicYears.map(y => (<option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (current)' : ''}</option>))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">From Class</label>
            <select className="form-control" value={bulkFromClassId} onChange={(e)=> setBulkFromClassId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Select Class</option>
              {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">To Academic Year</label>
            <select className="form-control" value={bulkToYearId} onChange={(e)=> setBulkToYearId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Current</option>
              {academicYears.map(y => (<option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (current)' : ''}</option>))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">To Class</label>
            <select className="form-control" value={bulkToClassId} onChange={(e)=> setBulkToClassId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Select Class</option>
              {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=> setShowPromoteModal(false)} disabled={promoting}>Cancel</Button>
          <Button variant="primary" disabled={promoting || !bulkFromClassId || !bulkToYearId || !bulkToClassId} onClick={async ()=>{
            setPromoting(true);
            try {
              const token = localStorage.getItem('authToken');
              // Load students for source year
              const res = await axios.get(`${API_BASE_URL}/students`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                params: { academic_year_id: bulkFromYearId || undefined },
              });
              const list: any[] = Array.isArray(res.data?.data) ? res.data.data : [];
              const targets = list.filter(s => (s.current_class_id ?? s?.student_profile?.class) == bulkFromClassId);
              for (const s of targets) {
                await axios.post(`${API_BASE_URL}/students/${s.id}/promote`, {
                  to_academic_year_id: bulkToYearId,
                  to_class_id: bulkToClassId,
                }, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
              }
              // Refresh main list
              setShowPromoteModal(false);
              // trigger reload by touching selectedYearId state
              setSelectedYearId(prev => prev === '' ? '' : Number(prev));
            } catch (e) {
              alert('Bulk promote failed.');
            } finally {
              setPromoting(false);
            }
          }}>{promoting ? 'Promoting...' : 'Promote'}</Button>
        </Modal.Footer>
      </Modal>

      {/* Single Promote Modal */}
      <Modal show={showSinglePromoteModal} onHide={() => setShowSinglePromoteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Promote Student</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label fw-semibold">To Academic Year</label>
            <select className="form-control" value={singleToYearId} onChange={(e)=> setSingleToYearId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Current</option>
              {academicYears.map(y => (<option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (current)' : ''}</option>))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">To Class</label>
            <select className="form-control" value={singleToClassId} onChange={(e)=> setSingleToClassId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Select Class</option>
              {classes.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=> setShowSinglePromoteModal(false)} disabled={promotingSingle}>Cancel</Button>
          <Button variant="primary" disabled={promotingSingle || !promoteStudentId || !singleToYearId || !singleToClassId} onClick={async ()=>{
            if (!promoteStudentId) return;
            setPromotingSingle(true);
            try {
              const token = localStorage.getItem('authToken');
              await axios.post(`${API_BASE_URL}/students/${promoteStudentId}/promote`, {
                to_academic_year_id: singleToYearId,
                to_class_id: singleToClassId,
              }, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
              setShowSinglePromoteModal(false);
              // trigger reload by touching selectedYearId state
              setSelectedYearId(prev => prev === '' ? '' : Number(prev));
            } catch (e) {
              alert('Promote failed.');
            } finally {
              setPromotingSingle(false);
            }
          }}>{promotingSingle ? 'Promoting...' : 'Promote'}</Button>
        </Modal.Footer>
      </Modal>

      <UserProfileModal
        show={showProfileModal}
        onHide={() => setShowProfileModal(false)}
        userId={viewUserId}
        canEditImage={userRole === ROLES.COACHING_ADMIN}
      />
    </div>
  );
}
