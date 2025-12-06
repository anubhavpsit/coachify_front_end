import { useEffect, useState } from 'react';
import axios from 'axios';
import Icon from '../../components/common/Icon.tsx';
import { Modal, Button } from 'react-bootstrap';

interface Subject {
  id: number;
  subject: string;
  tenant_id: number;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [newSubject, setNewSubject] = useState('');
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
  const tenantId = sessionStorage.getItem('tenant_id');

  // Inside your SubjectsPage component, add these new states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);


  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/subjects/${tenantId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        if (response.data.success || response.data.status) {
          setSubjects(response.data.data || response.data.subjects || []);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [API_BASE_URL, tenantId]);

  // Add subject
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/subjects`,
        { subject: newSubject },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success || response.data.status) {
        setSubjects((prev) => [...prev, response.data.data]);
        setNewSubject('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  // Edit subject
  const handleOpenEditModal = (subject: Subject) => {
    setEditSubject(subject);
    setShowEditModal(true);
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubject) return;

    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await axios.put(
        `${API_BASE_URL}/subjects/${editSubject.id}`,
        { subject: editSubject.subject },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );

      if (response.data.success || response.data.status) {
        // Update the subject in the list
        setSubjects((prev) =>
          prev.map((subj) => (subj.id === editSubject.id ? { ...subj, subject: editSubject.subject } : subj))
        );
        setEditSubject(null);
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating subject:', error);
      alert('Failed to update subject.');
    } finally {
      setSaving(false);
    }
  };

  // Function to open delete modal
  const handleOpenDeleteModal = (subject: Subject) => {
    setDeleteSubject(subject);
    setShowDeleteModal(true);
  };

  // Function to delete subject
  const handleDeleteSubject = async () => {
    if (!deleteSubject) return;
    setSaving(true);

    try {
      const token = sessionStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/subjects/${deleteSubject.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      // Remove subject from the list
      setSubjects((prev) => prev.filter((subj) => subj.id !== deleteSubject.id));
      setShowDeleteModal(false);
      setDeleteSubject(null);
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Subjects</h6>
      </div>

      <div className="row gy-4 mb-24">
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <span className="text-md fw-medium text-secondary-light mb-0">Subjects List</span>
            <Button variant="primary" onClick={() => setShowAddModal(true)} className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
              <iconify-icon icon="ic:baseline-plus" className="icon text-xl line-height-1"></iconify-icon>
              Add New Subject
            </Button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-6">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading subjects...</span>
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-center text-muted">No subjects found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Subject</th>
                      <th scope="col" className="text-center">Tenant ID</th>
                      <th scope="col" className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="text-lg text-secondary-light fw-semibold flex-grow-1">{subject.subject}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          {subject.tenant_id === 0 ? (
                            <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">Default</span>
                          ) : (
                            <span className="bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm">Custom</span>
                          )}
                        </td>
                        <td className="text-center">
                          {subject.tenant_id !== 0 ? (
                            <>
                              <Button variant="link" onClick={() => handleOpenEditModal(subject)}>
                                <iconify-icon icon="ic:baseline-edit" className="text-primary text-lg"></iconify-icon>
                              </Button>
                              <Button variant="link" onClick={() => handleOpenDeleteModal(subject)}>
                                <iconify-icon icon="ic:baseline-delete" className="text-danger text-lg"></iconify-icon>
                              </Button>
                              </>
                            ) : (
                              <></>
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

      {/* Add Subject Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Subject</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSaveSubject}>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Subject Name</label>
              <input
                type="text"
                className="form-control radius-8"
                placeholder="Enter Subject Name"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Subject Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Subject</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleUpdateSubject}>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Subject Name</label>
              <input
                type="text"
                className="form-control radius-8"
                placeholder="Enter Subject Name"
                value={editSubject?.subject || ''}
                onChange={(e) => editSubject && setEditSubject({ ...editSubject, subject: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Updating...' : 'Update'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Subject</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the subject: <strong>{deleteSubject?.subject}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteSubject} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
