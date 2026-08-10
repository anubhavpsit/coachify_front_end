import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import Icon from '../common/Icon.tsx';

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

interface ChaptersManagerProps {
  /** e.g. '/admin/chapters' */
  apiBasePath: string;
  /** the tenant's own id, used to fetch its subject list */
  subjectsTenantId: string;
  /** Route to a chapter's topic-management page, e.g. `/chapters/${id}` */
  chapterRoute: (chapterId: number) => string;
  ownTenantId: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function ChaptersManager({ apiBasePath, subjectsTenantId, chapterRoute, ownTenantId }: ChaptersManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formSubjectId, setFormSubjectId] = useState('');
  const [formName, setFormName] = useState('');
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const [deleteChapter, setDeleteChapter] = useState<Chapter | null>(null);

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

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}${apiBasePath}`, {
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

  useEffect(() => {
    fetchChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBasePath, subjectFilter]);

  const resetForm = () => {
    setFormSubjectId('');
    setFormName('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubjectId || !formName.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API_BASE_URL}${apiBasePath}`, { subject_id: formSubjectId, name: formName }, { headers: authHeaders });
      setShowAddModal(false);
      resetForm();
      fetchChapters();
    } catch (error) {
      console.error('Error creating chapter:', error);
      alert('Failed to create chapter.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (chapter: Chapter) => {
    setEditChapter(chapter);
    setFormSubjectId(String(chapter.subject_id));
    setFormName(chapter.name);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChapter) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}${apiBasePath}/${editChapter.id}`, { subject_id: formSubjectId, name: formName }, { headers: authHeaders });
      setShowEditModal(false);
      setEditChapter(null);
      resetForm();
      fetchChapters();
    } catch (error) {
      console.error('Error updating chapter:', error);
      alert('Failed to update chapter.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteChapter) return;
    setSaving(true);
    try {
      await axios.delete(`${API_BASE_URL}${apiBasePath}/${deleteChapter.id}`, { headers: authHeaders });
      setShowDeleteModal(false);
      setDeleteChapter(null);
      fetchChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter.');
    } finally {
      setSaving(false);
    }
  };

  const canManage = (chapter: Chapter) => chapter.tenant_id === ownTenantId;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Chapters</h6>
      </div>

      <div className="row gy-4 mb-24">
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <span className="text-md fw-medium text-secondary-light mb-0">Chapters List</span>
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
                Add Chapter
              </Button>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-6">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading chapters...</span>
              </div>
            ) : chapters.length === 0 ? (
              <p className="text-center text-muted">No chapters found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Chapter</th>
                      <th scope="col">Subject</th>
                      <th scope="col" className="text-center">Type</th>
                      <th scope="col" className="text-center">Topics</th>
                      <th scope="col" className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((chapter) => (
                      <tr key={chapter.id}>
                        <td>{chapter.name}</td>
                        <td>{chapter.subject?.subject ?? subjects.find((s) => s.id === chapter.subject_id)?.subject ?? '-'}</td>
                        <td className="text-center">
                          {chapter.tenant_id === 0 ? (
                            <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">Base</span>
                          ) : (
                            <span className="bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm">Custom</span>
                          )}
                        </td>
                        <td className="text-center">
                          <Link to={chapterRoute(chapter.id)} className="text-primary text-sm fw-medium">
                            {chapter.topics_count ?? 0} topic{chapter.topics_count === 1 ? '' : 's'}
                          </Link>
                        </td>
                        <td className="text-center">
                          {canManage(chapter) ? (
                            <>
                              <Button variant="link" onClick={() => openEdit(chapter)}>
                                <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                              </Button>
                              <Button variant="link" onClick={() => { setDeleteChapter(chapter); setShowDeleteModal(true); }}>
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
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); resetForm(); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Chapter</Modal.Title>
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
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Chapter Name</label>
              <input
                type="text"
                className="form-control radius-8"
                placeholder="e.g. Rational And Irrational Numbers"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setEditChapter(null); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Chapter</Modal.Title>
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
              <p className="text-xs text-muted mt-1 mb-0">Changing the subject only affects the chapter itself — topics already added stay assigned.</p>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Chapter Name</label>
              <input
                type="text"
                className="form-control radius-8"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                disabled={saving}
                required
              />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditChapter(null); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Updating...' : 'Update'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Chapter</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the chapter: <strong>{deleteChapter?.name}</strong>? Its topics will not be deleted — they'll just be unlinked from this chapter.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
