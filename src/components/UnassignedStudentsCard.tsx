import { useEffect, useState } from 'react';
import axios from 'axios';
import AssignTeachersModal from './AssignTeachersModal';

type UnassignedStudent = {
  id: number;
  name: string;
  email: string;
  class: string | null;
  status?: string;
  created_at?: string | null;
};

type CoachingClass = {
  id: number;
  name: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function UnassignedStudentsCard() {
  const [students, setStudents] = useState<UnassignedStudent[]>([]);
  const [classes, setClasses] = useState<CoachingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignStudentId, setAssignStudentId] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenant_id');

  const loadStudents = async () => {
    try {
      const res = await axios.get<{ success: boolean; data: UnassignedStudent[] }>(
        `${API_BASE_URL}/dashboard/unassigned-students`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) setStudents(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const [, classRes] = await Promise.all([
          loadStudents(),
          axios.get<{ data: CoachingClass[] }>(`${API_BASE_URL}/classes/${tenantId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setClasses(classRes.data.data || []);
      } catch {
        // errors surfaced via empty state; loadStudents already stopped its own spinner
      }
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tenantId]);

  const getClassName = (classIdOrName: string | null) => {
    if (!classIdOrName) return '—';
    const found = classes.find((c) => String(c.id) === String(classIdOrName));
    return found ? found.name : classIdOrName;
  };

  const handleOpenAssign = (studentId: number) => {
    setAssignStudentId(studentId);
    setShowAssignModal(true);
  };

  const handleAssigned = () => {
    // The assigned student now has a teacher, so drop them from this list.
    setStudents((prev) => prev.filter((s) => s.id !== assignStudentId));
  };

  if (!loading && students.length === 0) return null;

  return (
    <div className="col-12">
      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="w-32-px h-32-px bg-danger-100 text-danger-600 d-flex justify-content-center align-items-center rounded-circle">
              <i className="ri-user-unfollow-line"></i>
            </span>
            <span className="text-md fw-semibold">
              Unassigned Students
              <span className="ms-2 badge bg-danger-100 text-danger-600 fw-medium text-xs">
                {students.length} with no teacher
              </span>
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-20">
              <span className="spinner-border spinner-border-sm text-danger-600"></span>
              <span className="ms-2 text-secondary-light text-sm">Loading…</span>
            </div>
          ) : (
            <div style={{ maxHeight: '350px', overflowY: students.length > 5 ? 'auto' : 'visible' }}>
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="fw-medium text-md">{s.name}</span>
                            <span className="text-sm text-secondary-light">{s.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm text-secondary-light">
                            {getClassName(s.class)}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary radius-8 px-14 py-4 text-sm"
                            onClick={() => handleOpenAssign(s.id)}
                          >
                            <i className="ri-user-add-line me-1"></i>
                            Assign Teacher
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {assignStudentId && (
        <AssignTeachersModal
          show={showAssignModal}
          onHide={() => setShowAssignModal(false)}
          studentId={assignStudentId}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
