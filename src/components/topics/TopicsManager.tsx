import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import Icon from '../common/Icon.tsx';
import RichTextEditor from './RichTextEditor.tsx';

interface Subject {
  id: number;
  subject: string;
}

interface Chapter {
  id: number;
  subject_id: number;
  tenant_id: number;
  name: string;
}

interface Topic {
  id: number;
  tenant_id: number;
  subject_id: number;
  chapter_id: number | null;
  grade: number | null;
  name: string;
  explanation_html: string | null;
  subject?: Subject;
  chapter?: Chapter | null;
}

interface TopicsManagerProps {
  /** e.g. '/admin/topics' — base (tenant_id 0) topics are managed separately in the server-rendered super admin panel */
  apiBasePath: string;
  /** the tenant's own id, used to fetch its subject list */
  subjectsTenantId: string;
  /** Route to the question bank for a given topic, e.g. `/topics/${id}/questions` */
  questionsRoute: (topicId: number) => string;
  ownTenantId: number;
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function TopicsManager({ apiBasePath, subjectsTenantId, questionsRoute, ownTenantId }: TopicsManagerProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [chapterFilter, setChapterFilter] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [filterChapters, setFilterChapters] = useState<Chapter[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formSubjectId, setFormSubjectId] = useState('');
  const [formChapterId, setFormChapterId] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formName, setFormName] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formChapters, setFormChapters] = useState<Chapter[]>([]);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [deleteTopic, setDeleteTopic] = useState<Topic | null>(null);

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/subjects/${subjectsTenantId}`, { headers: authHeaders });
        setSubjects(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectsTenantId]);

  // Chapters for the list filter — follows the selected subject filter (or all if none selected)
  useEffect(() => {
    const fetchFilterChapters = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/chapters`, {
          params: subjectFilter ? { subject_id: subjectFilter } : undefined,
          headers: authHeaders,
        });
        setFilterChapters(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching chapters:', error);
      }
    };
    fetchFilterChapters();
    setChapterFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter]);

  // Chapters for the Add/Edit form — follows the selected form subject
  useEffect(() => {
    const fetchFormChapters = async () => {
      if (!formSubjectId) {
        setFormChapters([]);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/chapters`, {
          params: { subject_id: formSubjectId },
          headers: authHeaders,
        });
        setFormChapters(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching chapters:', error);
      }
    };
    fetchFormChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSubjectId]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}${apiBasePath}`, {
        params: {
          ...(subjectFilter ? { subject_id: subjectFilter } : {}),
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

  useEffect(() => {
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBasePath, subjectFilter, chapterFilter, gradeFilter]);

  const resetForm = () => {
    setFormSubjectId('');
    setFormChapterId('');
    setFormGrade('');
    setFormName('');
    setFormExplanation('');
  };

  const buildPayload = () => ({
    subject_id: formSubjectId,
    chapter_id: formChapterId || null,
    grade: formGrade || null,
    name: formName,
    explanation_html: formExplanation,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectId || !formName.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}${apiBasePath}`, buildPayload(), { headers: authHeaders });
      setShowAddModal(false);
      resetForm();
      fetchTopics();
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('Failed to create topic.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (topic: Topic) => {
    setEditTopic(topic);
    setFormSubjectId(String(topic.subject_id));
    setFormChapterId(topic.chapter_id ? String(topic.chapter_id) : '');
    setFormGrade(topic.grade ? String(topic.grade) : '');
    setFormName(topic.name);
    setFormExplanation(topic.explanation_html ?? '');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTopic) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}${apiBasePath}/${editTopic.id}`, buildPayload(), { headers: authHeaders });
      setShowEditModal(false);
      setEditTopic(null);
      resetForm();
      fetchTopics();
    } catch (error) {
      console.error('Error updating topic:', error);
      alert('Failed to update topic.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTopic) return;
    setSaving(true);
    try {
      await axios.delete(`${API_BASE_URL}${apiBasePath}/${deleteTopic.id}`, { headers: authHeaders });
      setShowDeleteModal(false);
      setDeleteTopic(null);
      fetchTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete topic.');
    } finally {
      setSaving(false);
    }
  };

  const canManage = (topic: Topic) => topic.tenant_id === ownTenantId;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Topics</h6>
      </div>

      <div className="row gy-4 mb-24">
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <span className="text-md fw-medium text-secondary-light mb-0">Topics List</span>
            <div className="d-flex align-items-center flex-wrap gap-3">
              <select
                className="form-select radius-8"
                style={{ minWidth: 160 }}
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject}</option>
                ))}
              </select>
              <select
                className="form-select radius-8"
                style={{ minWidth: 160 }}
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
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
              >
                <option value="">All Grades</option>
                <option value="none">All grades (shared)</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
              <Button variant="primary" onClick={() => setShowAddModal(true)} className="text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
                <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
                Add Topic
              </Button>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-6">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading topics...</span>
              </div>
            ) : topics.length === 0 ? (
              <p className="text-center text-muted">No topics found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Topic</th>
                      <th scope="col">Chapter</th>
                      <th scope="col" className="text-center">Grade</th>
                      <th scope="col">Subject</th>
                      <th scope="col" className="text-center">Type</th>
                      <th scope="col" className="text-center">Questions</th>
                      <th scope="col" className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((topic) => (
                      <tr key={topic.id}>
                        <td>{topic.name}</td>
                        <td>{topic.chapter?.name ?? '-'}</td>
                        <td className="text-center">{topic.grade ? `Grade ${topic.grade}` : 'All'}</td>
                        <td>{topic.subject?.subject ?? subjects.find((s) => s.id === topic.subject_id)?.subject ?? '-'}</td>
                        <td className="text-center">
                          {topic.tenant_id === 0 ? (
                            <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">Base</span>
                          ) : (
                            <span className="bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm">Custom</span>
                          )}
                        </td>
                        <td className="text-center">
                          <Link to={questionsRoute(topic.id)} className="text-primary text-sm fw-medium">
                            Manage
                          </Link>
                        </td>
                        <td className="text-center">
                          {canManage(topic) ? (
                            <>
                              <Button variant="link" onClick={() => openEdit(topic)}>
                                <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                              </Button>
                              <Button variant="link" onClick={() => { setDeleteTopic(topic); setShowDeleteModal(true); }}>
                                <Icon icon="ic:baseline-delete" className="text-danger text-lg" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted text-xs">Read-only</span>
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
      </div>

      {/* Add Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); resetForm(); }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Topic</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleAdd}>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Subject</label>
              <select className="form-select radius-8" value={formSubjectId} onChange={(e) => { setFormSubjectId(e.target.value); setFormChapterId(''); }} disabled={saving} required>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Chapter (optional)</label>
                <select className="form-select radius-8" value={formChapterId} onChange={(e) => setFormChapterId(e.target.value)} disabled={saving || !formSubjectId}>
                  <option value="">No chapter</option>
                  {formChapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Grade (optional)</label>
                <select className="form-select radius-8" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} disabled={saving}>
                  <option value="">All grades (shared)</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Topic Name</label>
              <input
                type="text"
                className="form-control radius-8"
                placeholder="e.g. Profit and Loss"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Explanation</label>
              <RichTextEditor value={formExplanation} onChange={setFormExplanation} disabled={saving} />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setEditTopic(null); }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Topic</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleUpdate}>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Subject</label>
              <select className="form-select radius-8" value={formSubjectId} onChange={(e) => { setFormSubjectId(e.target.value); setFormChapterId(''); }} disabled={saving} required>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Chapter (optional)</label>
                <select className="form-select radius-8" value={formChapterId} onChange={(e) => setFormChapterId(e.target.value)} disabled={saving || !formSubjectId}>
                  <option value="">No chapter</option>
                  {formChapters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Grade (optional)</label>
                <select className="form-select radius-8" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} disabled={saving}>
                  <option value="">All grades (shared)</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Topic Name</label>
              <input
                type="text"
                className="form-control radius-8"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Explanation</label>
              <RichTextEditor value={formExplanation} onChange={setFormExplanation} disabled={saving} />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditTopic(null); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Updating...' : 'Update'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Topic</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the topic: <strong>{deleteTopic?.name}</strong>? Its questions will also be removed.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
