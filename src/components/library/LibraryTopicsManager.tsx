import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface Subject {
  id: number;
  subject: string;
}

interface Chapter {
  id: number;
  name: string;
}

interface Topic {
  id: number;
  subject_id: number;
  chapter_id: number | null;
  grade: number | null;
  name: string;
  chapter?: Chapter | null;
}

interface LibraryTopicsManagerProps {
  topicDetailRoute: (topicId: number) => string;
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function LibraryTopicsManager({ topicDetailRoute }: LibraryTopicsManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [chapterFilter, setChapterFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [filterChapters, setFilterChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/teacher/subjects`, { headers: authHeaders });
        const data: Subject[] = response.data?.data ?? [];
        setSubjects(data);
        if (data.length > 0) setSubjectFilter(String(data[0].id));
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!subjectFilter) {
      setFilterChapters([]);
      return;
    }
    const fetchChapters = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/chapters`, {
          params: { subject_id: subjectFilter },
          headers: authHeaders,
        });
        setFilterChapters(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching chapters:', error);
      }
    };
    fetchChapters();
    setChapterFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter]);

  useEffect(() => {
    if (!subjectFilter) {
      setTopics([]);
      return;
    }
    const fetchTopics = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/topics`, {
          params: {
            subject_id: subjectFilter,
            ...(chapterFilter ? { chapter_id: chapterFilter } : {}),
            ...(gradeFilter ? { grade: gradeFilter } : {}),
          },
          headers: authHeaders,
        });
        setTopics(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching topics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter, chapterFilter, gradeFilter]);

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Content Library — Topics</h6>
      </div>

      <div className="row gy-4 mb-24">
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <span className="text-md fw-medium text-secondary-light mb-0">Topics</span>
            <div className="d-flex align-items-center flex-wrap gap-3">
              <select
                className="form-select radius-8"
                style={{ minWidth: 160 }}
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                {subjects.length === 0 && <option value="">No subjects assigned</option>}
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject}</option>
                ))}
              </select>
              <select
                className="form-select radius-8"
                style={{ minWidth: 160 }}
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
                disabled={!subjectFilter}
              >
                <option value="">All Chapters</option>
                <option value="none">No chapter</option>
                {filterChapters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="form-select radius-8"
                style={{ minWidth: 140 }}
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                disabled={!subjectFilter}
              >
                <option value="">All Grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="card-body">
            {!subjectFilter ? (
              <p className="text-center text-muted mb-0">
                No subjects are assigned to you yet — this list follows the subjects taken by your assigned students.
              </p>
            ) : loading ? (
              <div className="text-center py-6">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading topics...</span>
              </div>
            ) : topics.length === 0 ? (
              <p className="text-center text-muted mb-0">No topics found for this filter.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Topic</th>
                      <th scope="col">Chapter</th>
                      <th scope="col" className="text-center">Grade</th>
                      <th scope="col" className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((topic) => (
                      <tr key={topic.id}>
                        <td>{topic.name}</td>
                        <td>{topic.chapter?.name ?? '-'}</td>
                        <td className="text-center">{topic.grade ? `Grade ${topic.grade}` : 'All'}</td>
                        <td className="text-center">
                          <Link to={topicDetailRoute(topic.id)} className="text-primary text-sm fw-medium">
                            View
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
