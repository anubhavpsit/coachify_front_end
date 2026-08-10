import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface Subject {
  id: number;
  subject: string;
}

interface Chapter {
  id: number;
  tenant_id: number;
  subject_id: number;
  name: string;
  subject?: Subject;
  topics_count?: number;
}

interface LibraryChaptersManagerProps {
  chapterDetailRoute: (chapterId: number) => string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function LibraryChaptersManager({ chapterDetailRoute }: LibraryChaptersManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/teacher/subjects`, { headers: authHeaders });
        setSubjects(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/chapters`, {
          params: subjectFilter ? { subject_id: subjectFilter } : undefined,
          headers: authHeaders,
        });
        setChapters(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching chapters:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter]);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Content Library — Chapters</h6>
      </div>

      <div className="row gy-4 mb-24">
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <span className="text-md fw-medium text-secondary-light mb-0">Chapters</span>
            <select
              className="form-select radius-8"
              style={{ minWidth: 200 }}
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="">All my subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject}</option>
              ))}
            </select>
          </div>
          <div className="card-body">
            {subjects.length === 0 && !loading ? (
              <p className="text-center text-muted mb-0">
                No subjects are assigned to you yet — this list follows the subjects taken by your assigned students.
              </p>
            ) : loading ? (
              <div className="text-center py-6">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading chapters...</span>
              </div>
            ) : chapters.length === 0 ? (
              <p className="text-center text-muted mb-0">No chapters found for this subject.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Chapter</th>
                      <th scope="col">Subject</th>
                      <th scope="col" className="text-center">Topics</th>
                      <th scope="col" className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((chapter) => (
                      <tr key={chapter.id}>
                        <td>{chapter.name}</td>
                        <td>{chapter.subject?.subject ?? subjects.find((s) => s.id === chapter.subject_id)?.subject ?? '-'}</td>
                        <td className="text-center">{chapter.topics_count ?? 0}</td>
                        <td className="text-center">
                          <Link to={chapterDetailRoute(chapter.id)} className="text-primary text-sm fw-medium">
                            View Topics
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
