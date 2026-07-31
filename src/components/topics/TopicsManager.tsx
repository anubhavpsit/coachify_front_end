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

interface Topic {
  id: number;
  tenant_id: number;
  subject_id: number;
  name: string;
  explanation_html: string | null;
  subject?: Subject;
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function TopicsManager({ apiBasePath, subjectsTenantId, questionsRoute, ownTenantId }: TopicsManagerProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formSubjectId, setFormSubjectId] = useState('');
  const [formName, setFormName] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
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

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}${apiBasePath}`, {
        params: subjectFilter ? { subject_id: subjectFilter } : undefined,
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
  }, [apiBasePath, subjectFilter]);

  const resetForm = () => {
    setFormSubjectId('');
    setFormName('');
    setFormExplanation('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectId || !formName.trim()) return;
    setSaving(true);
    try {
      await axios.post(
        `${API_BASE_URL}${apiBasePath}`,
        { subject_id: formSubjectId, name: formName, explanation_html: formExplanation },
        { headers: authHeaders },
      );
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
    setFormName(topic.name);
    setFormExplanation(topic.explanation_html ?? '');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTopic) return;
    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}${apiBasePath}/${editTopic.id}`,
        { subject_id: formSubjectId, name: formName, explanation_html: formExplanation },
        { headers: authHeaders },
      );
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
            <div className="d-flex align-items-center gap-3">
              <select
                className="form-select radius-8"
                style={{ minWidth: 180 }}
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject}</option>
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
              <select className="form-select radius-8" value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} disabled={saving} required>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject}</option>
                ))}
              </select>
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
              <small className="text-muted">Save the topic first, then edit it to add images to the explanation.</small>
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
              <select className="form-select radius-8" value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} disabled={saving} required>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.subject}</option>
                ))}
              </select>
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
              <RichTextEditor
                value={formExplanation}
                onChange={setFormExplanation}
                disabled={saving}
                imageUploadUrl={editTopic ? `${apiBasePath}/${editTopic.id}/image` : undefined}
              />
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
