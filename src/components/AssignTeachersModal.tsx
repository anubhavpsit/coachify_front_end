import { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';

interface Teacher {
  id: number;
  name: string;
  email: string;
}

export default function AssignTeachersModal({
  show,
  onHide,
  studentId,
  onAssigned,
}: {
  show: boolean;
  onHide: () => void;
  studentId: number;
  onAssigned: () => void;
}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

  useEffect(() => {
    if (!show) return;

    const fetchTeachers = async () => {
      try {
    const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_BASE_URL}/teachers`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (res.data.success) {
          setTeachers(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching teachers:', err);
      }
    };

    fetchTeachers();
  }, [show]);

  const handleToggleTeacher = (id: number) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedTeacherIds.length === 0) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `${API_BASE_URL}/students/${studentId}/assign-teachers`,
        { teacher_ids: selectedTeacherIds },
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      onAssigned();
      onHide();
    } catch (err) {
      console.error('Error assigning teachers:', err);
      alert('Failed to assign teachers.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Assign Teachers</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {teachers.length === 0 ? (
          <p>No teachers available.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`teacher-${teacher.id}`}
                  checked={selectedTeacherIds.includes(teacher.id)}
                  onChange={() => handleToggleTeacher(teacher.id)}
                  disabled={saving}
                />
                <label className="form-check-label" htmlFor={`teacher-${teacher.id}`}>
                  {teacher.name} ({teacher.email})
                </label>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleAssign} disabled={saving}>
          {saving ? 'Assigning...' : 'Assign'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
