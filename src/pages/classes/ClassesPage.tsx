import { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Icon from '../../components/common/Icon.tsx';

interface CoachingClass {
  id: number;
  name: string;
  tenant_id: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<CoachingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<CoachingClass | null>(null);
  const [name, setName] = useState('');

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
const tenantId = localStorage.getItem('tenant_id');
const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/classes/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingClass) {
        // update
        await axios.put(`${API_BASE_URL}/classes/${editingClass.id}`, { name }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // create
        await axios.post(`${API_BASE_URL}/classes`, { name, tenant_id: tenantId }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setShowModal(false);
      setName('');
      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (cls: CoachingClass) => {
    setEditingClass(cls);
    setName(cls.name);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/classes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchClasses();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Classes</h6>
      </div>

      <div className="row gy-4 mb-24">
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <span className="text-md fw-medium text-secondary-light mb-0">Subjects List</span>
            <Button variant="primary" onClick={() => setShowModal(true)} className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
              <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
              Add New Class
            </Button>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-6">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading subjects...</span>
              </div>
            ) : classes.length === 0 ? (
              <p className="text-center text-muted">No classes found.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Class</th>
                      <th scope="col" className="text-center">Tenant ID</th>
                      <th scope="col" className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((cls) => (
                      <tr key={cls.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <span className="text-lg text-secondary-light fw-semibold flex-grow-1">{cls.name}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          {cls.tenant_id === 0 ? (
                            <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">Default</span>
                          ) : (
                            <span className="bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm">Custom</span>
                          )}
                        </td>
                          <td>
                            {cls.tenant_id !== 0 ? (
                              <>
                                <Button variant="link" onClick={() => handleEdit(cls)}>
                                  <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                                </Button>
                                <Button variant="link" onClick={() => handleDelete(cls.id)}>
                                  <Icon icon="ic:baseline-delete" className="text-danger text-lg" />
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

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingClass ? 'Edit Class' : 'Add Class'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input 
            type="text" 
            placeholder="Class Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>{editingClass ? 'Update' : 'Save'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
