import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button, Modal } from 'react-bootstrap';
import Icon from '../../components/common/Icon.tsx';
import { ROLES } from '../../constants/roles';

interface AssessmentResultRow {
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  teacher_notes?: string | null;
}

interface AssessmentAssignmentRow {
  id: number;
  student_id: number;
  scheduled_date: string;
  status: string;
  student?: { id: number; name: string };
  result?: AssessmentResultRow;
}

interface Assessment {
  id: number;
  title: string;
  description?: string | null;
  subject_id: number;
  class_id?: number | null;
  teacher_id?: number | null;
  total_marks: number;
  scheduled_date?: string | null;
  status: string;
  is_admin_approved?: boolean;
  approved_at?: string | null;
  subject?: { id: number; subject: string };
  class?: { id: number; name: string };
  teacher?: { id: number; name: string };
  assignments?: AssessmentAssignmentRow[];
}

interface StudentOption {
  id: number;
  name: string;
  classId: number | null;
}

interface StudentApiResponseItem {
  id: number;
  name: string;
  student_profile?: {
    class?: number | string | null;
  } | null;
  studentProfile?: {
    class?: number | string | null;
  } | null;
}

type AssessmentFileType = 'question_paper' | 'answer_sheet' | 'other';

interface AssessmentFileRow {
  id: number;
  type: AssessmentFileType;
  path: string;
  original_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  student_id?: number | null;
  uploaded_at?: string | null;
  student?: { id: number; name: string } | null;
  file_type?: 'image' | 'pdf' | 'other';
  url?: string | null;
  is_admin_approved?: boolean;
  approved_at?: string | null;
}

export default function AssessmentsPage() {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
const STORAGE_BASE_URL =
  import.meta.env.VITE_STORAGE_BASE_URL ?? 'http://coachify.local/storage';

const getAssessmentFileUrl = (file: AssessmentFileRow) => {
  if (file.url) return file.url;
  return `${STORAGE_BASE_URL}/${file.path}`;
};

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newTotalMarks, setNewTotalMarks] = useState('');
  const [newDate, setNewDate] = useState('');

  const [subjects, setSubjects] = useState<{ id: number; subject: string }[]>(
    [],
  );
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  const [assignModalAssessment, setAssignModalAssessment] =
    useState<Assessment | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assignDate, setAssignDate] = useState('');

  const [resultsModalAssessment, setResultsModalAssessment] =
    useState<Assessment | null>(null);
  const [resultsRows, setResultsRows] = useState<
    {
      student_id: number;
      student_name: string;
      marks_obtained: string;
      total_marks: string;
      teacher_notes: string;
      answerFile?: File | null;
    }[]
  >([]);

  const [userRole, setUserRole] = useState<string>('');
  const isAdmin = userRole === ROLES.COACHING_ADMIN;

  const [filesModalAssessment, setFilesModalAssessment] =
    useState<Assessment | null>(null);
  const [assessmentFiles, setAssessmentFiles] = useState<AssessmentFileRow[]>(
    [],
  );
  const [uploadAssessmentFile, setUploadAssessmentFile] = useState<
    File | null
  >(null);
  const [uploadAssessmentFileType, setUploadAssessmentFileType] =
    useState<AssessmentFileType>('question_paper');
  const [previewAssessmentFile, setPreviewAssessmentFile] =
    useState<AssessmentFileRow | null>(null);

  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenant_id');

  useEffect(() => {
    try {
      const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      if (authUser?.role) {
        setUserRole(authUser.role);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/assessments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (response.data.success) {
        setAssessments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAssessmentApproval = async (
    assessmentId: number,
    approved = true,
  ) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/assessments/${assessmentId}/approval`,
        { approved },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      if (response.data.success) {
        const updated = response.data.data as Assessment;
        setAssessments(prev =>
          prev.map(asm => (asm.id === assessmentId ? updated : asm)),
        );
        if (assignModalAssessment && assignModalAssessment.id === assessmentId) {
          setAssignModalAssessment(updated);
        }
        if (filesModalAssessment && filesModalAssessment.id === assessmentId) {
          setFilesModalAssessment(updated);
        }
      }
    } catch (error) {
      console.error('Error updating approval:', error);
      alert('Failed to update approval.');
    }
  };

  const fetchSubjectsAndClasses = async () => {
    try {
      if (!tenantId) return;
      const [subjectsRes, classesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/subjects/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/classes/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (subjectsRes.data.status) {
        setSubjects(subjectsRes.data.data || []);
      }
      if (classesRes.data.success) {
        setClasses(classesRes.data.data || []);
      }
    } catch (error) {
      console.error('Error loading subjects/classes:', error);
    }
  };

  const fetchStudents = async () => {
    setStudentsLoaded(false);
    try {
      const url =
        userRole === 'teacher'
          ? `${API_BASE_URL}/teachers/students`
          : `${API_BASE_URL}/students`;

      const response = await axios.get<{
        success: boolean;
        data: StudentApiResponseItem[];
      }>(
        url,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.data.success) {
        const list = (response.data.data || []).map(item => {
          const profile = item.student_profile ?? item.studentProfile ?? null;
          const rawClass = profile?.class ?? null;
          let classId: number | null = null;
          if (rawClass !== null && rawClass !== undefined) {
            const parsed = Number(rawClass);
            classId = Number.isNaN(parsed) ? null : parsed;
          }

          const student: StudentOption = {
            id: item.id,
            name: item.name,
            classId,
          };
          return student;
        });
        setStudents(list);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setStudentsLoaded(true);
    }
  };

  const assignClassId = useMemo(() => {
    const raw =
      assignModalAssessment?.class_id ?? assignModalAssessment?.class?.id ?? null;
    if (raw === null || raw === undefined) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }, [assignModalAssessment]);

  const filteredStudents = useMemo(() => {
    if (assignClassId === null) return students;
    return students.filter(st => st.classId === assignClassId);
  }, [assignClassId, students]);

  useEffect(() => {
    if (assignClassId === null || !studentsLoaded) return;
    setSelectedStudentIds(prev =>
      prev.filter(id =>
        students.some(st => st.id === id && st.classId === assignClassId),
      ),
    );
  }, [assignClassId, students, studentsLoaded]);

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    fetchSubjectsAndClasses();
  }, [tenantId]);

  useEffect(() => {
    if (!userRole) return;
    fetchStudents();
  }, [userRole]);

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newSubjectId || !newTotalMarks) return;

    setSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/assessments`,
        {
          title: newTitle,
          description: newDescription || null,
          subject_id: Number(newSubjectId),
          class_id: newClassId ? Number(newClassId) : null,
          total_marks: Number(newTotalMarks),
          scheduled_date: newDate || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      );

      if (response.data.success) {
        setAssessments(prev => [response.data.data, ...prev]);
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewSubjectId('');
        setNewClassId('');
        setNewTotalMarks('');
        setNewDate('');
      }
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert('Failed to create assessment');
    } finally {
      setSaving(false);
    }
  };

  const loadAssessmentDetails = async (id: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/assessments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (response.data.success) {
        return response.data.data as Assessment;
      }
    } catch (error) {
      console.error('Error loading assessment details:', error);
    }
    return null;
  };

  const openAssignModal = async (assessment: Assessment) => {
    setAssignModalAssessment(assessment);
    setSelectedStudentIds([]);
    setAssignDate(assessment.scheduled_date || '');

    const detailed = await loadAssessmentDetails(assessment.id);
    if (detailed) {
      setAssignModalAssessment(detailed);
      const assignedIds = (detailed.assignments || []).map(a => a.student_id);
      setSelectedStudentIds(assignedIds);
    }
  };

  const fetchAssessmentFiles = async (id: number) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/assessments/${id}/files`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setAssessmentFiles(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading assessment files:', error);
    }
  };

  const updateAttachmentApproval = async (
    attachmentId: number,
    approved = true,
  ) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/assessments/files/${attachmentId}/approval`,
        { approved },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (filesModalAssessment) {
        await fetchAssessmentFiles(filesModalAssessment.id);
      }
    } catch (error) {
      console.error('Error updating attachment approval:', error);
      alert('Failed to update attachment approval.');
    }
  };

  const openFilesModal = async (assessment: Assessment) => {
    setFilesModalAssessment(assessment);
    setAssessmentFiles([]);
    setUploadAssessmentFile(null);
    setUploadAssessmentFileType('question_paper');

    const detailed = await loadAssessmentDetails(assessment.id);
    if (detailed) {
      setFilesModalAssessment(detailed);
    }

    await fetchAssessmentFiles(assessment.id);
  };

  const openResultsModal = async (assessment: Assessment) => {
    const detailed = await loadAssessmentDetails(assessment.id);
    if (!detailed) return;

    const rows = (detailed.assignments || []).map(a => ({
      student_id: a.student_id,
      student_name: a.student?.name || `Student #${a.student_id}`,
      marks_obtained: a.result ? String(a.result.marks_obtained) : '',
      total_marks: a.result
        ? String(a.result.total_marks)
        : detailed.total_marks
        ? String(detailed.total_marks)
        : '',
      teacher_notes: a.result?.teacher_notes || '',
    }));

    setResultsRows(rows);
    setResultsModalAssessment(detailed);
  };

  const toggleStudentSelection = (id: number) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleAssign = async () => {
    if (!assignModalAssessment || !assignDate || selectedStudentIds.length === 0)
      return;

    setSaving(true);
    try {
      const assignments = selectedStudentIds.map(studentId => ({
        student_id: studentId,
        scheduled_date: assignDate,
      }));

      const response = await axios.post(
        `${API_BASE_URL}/assessments/${assignModalAssessment.id}/assign`,
        { assignments },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert('Students assigned successfully');
        setAssignModalAssessment(null);
      }
    } catch (error) {
      console.error('Error assigning students:', error);
      alert('Failed to assign students');
    } finally {
      setSaving(false);
    }
  };

  const handleResultsChange = (
    index: number,
    field: 'marks_obtained' | 'total_marks' | 'teacher_notes',
    value: string,
  ) => {
    setResultsRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveResults = async () => {
    if (!resultsModalAssessment) return;

    const results = resultsRows
      .filter(row => row.marks_obtained !== '')
      .map(row => ({
        student_id: row.student_id,
        marks_obtained: Number(row.marks_obtained),
        total_marks: row.total_marks ? Number(row.total_marks) : undefined,
        teacher_notes: row.teacher_notes || undefined,
      }));

    if (results.length === 0) return;

    setSaving(true);
    try {
      // First, save marks and notes
      const response = await axios.post(
        `${API_BASE_URL}/assessments/${resultsModalAssessment.id}/results`,
        { results },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.data.success) {
        throw new Error('Failed to save results');
      }

      // Then, upload any answer sheet files selected per student
      const rowsWithFiles = resultsRows.filter(row => row.answerFile);
      for (const row of rowsWithFiles) {
        if (!row.answerFile) continue;

        const formData = new FormData();
        formData.append('file', row.answerFile);

        await axios.post(
          `${API_BASE_URL}/assessments/${resultsModalAssessment.id}/students/${row.student_id}/files`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              // Let axios set proper multipart boundary
            },
          },
        );
      }

      alert('Results and files saved successfully');
      setResultsModalAssessment(null);
    } catch (error) {
      console.error('Error saving results or files:', error);
      alert('Failed to save results or files');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAssessmentFile = async () => {
    if (!filesModalAssessment || !uploadAssessmentFile) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadAssessmentFile);
      formData.append('type', uploadAssessmentFileType);

      const response = await axios.post(
        `${API_BASE_URL}/assessments/${filesModalAssessment.id}/files`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (response.data.success) {
        setUploadAssessmentFile(null);
        await fetchAssessmentFiles(filesModalAssessment.id);
      }
    } catch (error) {
      console.error('Error uploading assessment file:', error);
      alert('Failed to upload file');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Assessments</h6>
        <Button
          variant="primary"
          className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Icon icon="ic:baseline-plus" className="icon text-xl" />
          Create Assessment
        </Button>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light">
            Assessments List
          </span>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-6">
              <span className="spinner-border spinner-border-sm"></span>
              <span className="ms-2">Loading assessments...</span>
            </div>
          ) : assessments.length === 0 ? (
            <p className="text-center text-muted">No assessments found.</p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Teacher</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map(asm => (
                    <tr key={asm.id}>
                      <td>{asm.title}</td>
                      <td>{asm.subject?.subject ?? '-'}</td>
                      <td>{asm.class?.name ?? '-'}</td>
                      <td>{asm.teacher?.name ?? '-'}</td>
                      <td>{asm.scheduled_date ?? '-'}</td>
                      <td className="text-capitalize">{asm.status}</td>
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span
                            className={
                              asm.is_admin_approved
                                ? 'badge bg-success-subtle text-success'
                                : 'badge bg-warning-subtle text-warning'
                            }
                          >
                            {asm.is_admin_approved ? 'Approved' : 'Pending'}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm px-0 text-decoration-none"
                              onClick={() =>
                                updateAssessmentApproval(
                                  asm.id,
                                  !asm.is_admin_approved,
                                )
                              }
                            >
                              {asm.is_admin_approved
                                ? 'Mark as pending'
                                : 'Approve'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="link"
                          onClick={() => openAssignModal(asm)}
                        >
                          <Icon
                            icon="mdi:account-multiple-plus"
                            className="text-primary text-lg"
                          />
                        </Button>
                        <Button
                          variant="link"
                          onClick={() => openResultsModal(asm)}
                        >
                          <Icon
                            icon="mdi:clipboard-text-outline"
                            className="text-success text-lg"
                          />
                        </Button>
                        <Button
                          variant="link"
                          onClick={() => openFilesModal(asm)}
                        >
                          <Icon
                            icon="mdi:paperclip"
                            className="text-secondary text-lg"
                          />
                        </Button>
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
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Assessment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleCreateAssessment}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Title</label>
              <input
                type="text"
                className="form-control"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Subject</label>
              <select
                className="form-control"
                value={newSubjectId}
                onChange={e => setNewSubjectId(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subject}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Class</label>
              <select
                className="form-control"
                value={newClassId}
                onChange={e => setNewClassId(e.target.value)}
              >
                <option value="">Select Class (optional)</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Total Marks</label>
              <input
                type="number"
                className="form-control"
                value={newTotalMarks}
                onChange={e => setNewTotalMarks(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Scheduled Date</label>
              <input
                type="date"
                className="form-control"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
              ></textarea>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <Modal
        show={!!assignModalAssessment}
        onHide={() => setAssignModalAssessment(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Assign Students - {assignModalAssessment?.title ?? ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label fw-semibold">Scheduled Date</label>
            <input
              type="date"
              className="form-control"
              value={assignDate}
              onChange={e => setAssignDate(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-semibold">Select Students</label>
            <div className="border rounded p-2"
              style={{ maxHeight: '260px', overflowY: 'auto' }}
            >
              {filteredStudents.length === 0 ? (
                <p className="text-muted mb-0">
                  {studentsLoaded
                    ? 'No students available for this class.'
                    : 'Loading students...'}
                </p>
              ) : (
                filteredStudents.map(st => (
                  <div key={st.id} className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`student-${st.id}`}
                      checked={selectedStudentIds.includes(st.id)}
                      onChange={() => toggleStudentSelection(st.id)}
                    />
                    <label
                      className="form-check-label ms-1"
                      htmlFor={`student-${st.id}`}
                    >
                      {st.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setAssignModalAssessment(null)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssign} disabled={saving}>
            {saving ? 'Assigning...' : 'Assign'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={!!resultsModalAssessment}
        onHide={() => setResultsModalAssessment(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Enter Results - {resultsModalAssessment?.title ?? ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resultsRows.length === 0 ? (
            <p className="text-muted mb-0">No students assigned yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Marks Obtained</th>
                    <th>Total Marks</th>
                    <th>Teacher Notes</th>
                    <th>Answer Sheet</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsRows.map((row, index) => (
                    <tr key={row.student_id}>
                      <td>{row.student_name}</td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={row.marks_obtained}
                          onChange={e =>
                            handleResultsChange(
                              index,
                              'marks_obtained',
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={row.total_marks}
                          onChange={e =>
                            handleResultsChange(
                              index,
                              'total_marks',
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <textarea
                          className="form-control form-control-sm"
                          rows={1}
                          value={row.teacher_notes}
                          onChange={e =>
                            handleResultsChange(
                              index,
                              'teacher_notes',
                              e.target.value,
                            )
                          }
                        ></textarea>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="file"
                            className="form-control form-control-sm"
                            onChange={e =>
                              setResultsRows(prev => {
                                const updated = [...prev];
                                updated[index] = {
                                  ...updated[index],
                                  answerFile: e.target.files?.[0] || null,
                                };
                                return updated;
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setResultsModalAssessment(null)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveResults} disabled={saving}>
            {saving ? 'Saving...' : 'Save Results'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={!!filesModalAssessment}
        onHide={() => setFilesModalAssessment(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Files - {filesModalAssessment?.title ?? ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label fw-semibold">Upload Question Paper / Document</label>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <select
                className="form-select w-auto"
                value={uploadAssessmentFileType}
                onChange={e =>
                  setUploadAssessmentFileType(
                    e.target.value as AssessmentFileType,
                  )
                }
              >
                <option value="question_paper">Question Paper</option>
                <option value="other">Other</option>
              </select>
              <input
                type="file"
                className="form-control"
                onChange={e =>
                  setUploadAssessmentFile(e.target.files?.[0] || null)
                }
              />
              <Button
                variant="primary"
                disabled={!uploadAssessmentFile || saving}
                onClick={handleUploadAssessmentFile}
              >
                {saving ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>

          <div>
            <h6 className="fw-semibold mb-2">Uploaded Files</h6>
            {assessmentFiles.length === 0 ? (
              <p className="text-muted mb-0">No files uploaded yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>File</th>
                      <th>Student</th>
                      <th>Uploaded At</th>
                      <th>Approval</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentFiles.map(file => {
                      const url = getAssessmentFileUrl(file);
                      return (
                        <tr key={file.id}>
                          <td className="text-capitalize">{file.type}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-link btn-sm px-0"
                              onClick={() => setPreviewAssessmentFile(file)}
                            >
                              {file.original_name}
                            </button>
                            <div>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs"
                              >
                                Download
                              </a>
                            </div>
                          </td>
                          <td>
                            {file.student
                              ? file.student.name
                              : file.student_id
                              ? `Student #${file.student_id}`
                              : '-'}
                          </td>
                          <td>{file.uploaded_at ?? '-'}</td>
                          <td>
                            <div className="d-flex flex-column gap-1">
                              <span
                                className={
                                  file.is_admin_approved
                                    ? 'badge bg-success-subtle text-success'
                                    : 'badge bg-warning-subtle text-warning'
                                }
                              >
                                {file.is_admin_approved ? 'Approved' : 'Pending'}
                              </span>
                              {isAdmin && (
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm px-0 text-decoration-none"
                                  onClick={() =>
                                    updateAttachmentApproval(
                                      file.id,
                                      !file.is_admin_approved,
                                    )
                                  }
                                >
                                  {file.is_admin_approved
                                    ? 'Mark as pending'
                                    : 'Approve'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setFilesModalAssessment(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={!!previewAssessmentFile}
        onHide={() => setPreviewAssessmentFile(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Attachment Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {previewAssessmentFile ? (
            previewAssessmentFile.file_type === 'pdf' ? (
              <iframe
                title="Assessment File PDF"
                src={`${getAssessmentFileUrl(previewAssessmentFile)}#toolbar=0`}
                className="w-100"
                style={{ minHeight: '70vh' }}
              ></iframe>
            ) : (
              <img
                src={getAssessmentFileUrl(previewAssessmentFile)}
                alt={previewAssessmentFile.original_name}
                className="w-100"
                style={{ maxHeight: '70vh', objectFit: 'contain' }}
              />
            )
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setPreviewAssessmentFile(null)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
