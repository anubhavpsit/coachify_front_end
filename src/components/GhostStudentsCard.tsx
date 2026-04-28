import { useEffect, useState } from 'react';
import axios from 'axios';

type GhostStudent = {
  id: number;
  name: string;
  email: string;
  class: string | null;
  status?: string;
};

type CoachingClass = {
  id: number;
  name: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
const DAYS = 30;

export default function GhostStudentsCard() {
  const [students, setStudents] = useState<GhostStudent[]>([]);
  const [classes, setClasses] = useState<CoachingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenant_id');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [ghostRes, classRes] = await Promise.all([
          axios.get<{ success: boolean; data: GhostStudent[] }>(
            `${API_BASE_URL}/dashboard/ghost-students?days=${DAYS}`,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
          axios.get<{ data: CoachingClass[] }>(
            `${API_BASE_URL}/classes/${tenantId}`,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ]);
        if (ghostRes.data.success) setStudents(ghostRes.data.data);
        setClasses(classRes.data.data || []);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token, tenantId]);

  const getClassName = (classIdOrName: string | null) => {
    if (!classIdOrName) return '—';
    const found = classes.find((c) => String(c.id) === String(classIdOrName));
    return found ? found.name : classIdOrName;
  };

  const handleMarkInactive = async (student: GhostStudent) => {
    if (!window.confirm(`Mark "${student.name}" as inactive?`)) return;

    setMarkingId(student.id);
    try {
      await axios.post(
        `${API_BASE_URL}/students/${student.id}/mark-inactive`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } catch {
      alert('Failed to mark student inactive. Please try again.');
    } finally {
      setMarkingId(null);
    }
  };

  if (!loading && students.length === 0) return null;

  return (
    <div className="col-12">
      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <span className="w-32-px h-32-px bg-warning-100 text-warning-600 d-flex justify-content-center align-items-center rounded-circle">
              <i className="ri-ghost-line"></i>
            </span>
            <span className="text-md fw-semibold">
              Ghost Students
              <span className="ms-2 badge bg-warning-100 text-warning-600 fw-medium text-xs">
                {students.length} not seen in {DAYS}+ days
              </span>
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-20">
              <span className="spinner-border spinner-border-sm text-warning-600"></span>
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
                            <div className="d-flex align-items-center gap-2">
                              <span className="fw-medium text-md">{s.name}</span>
                              {s.status && (
                                <span className={`badge text-xs fw-medium ${s.status === 'active' ? 'bg-success-100 text-success-600' : 'bg-secondary-100 text-secondary-600'}`}>
                                  {s.status}
                                </span>
                              )}
                            </div>
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
                          className="btn btn-sm btn-outline-danger-600 radius-8 px-14 py-4 text-sm"
                          disabled={markingId === s.id}
                          onClick={() => handleMarkInactive(s)}
                        >
                          {markingId === s.id ? (
                            <span className="spinner-border spinner-border-sm me-1"></span>
                          ) : (
                            <i className="ri-user-unfollow-line me-1"></i>
                          )}
                          Mark Inactive
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
    </div>
  );
}
