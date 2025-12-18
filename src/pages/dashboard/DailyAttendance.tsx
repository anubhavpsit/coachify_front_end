import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Table, Button, Form, Spinner } from 'react-bootstrap';
import { ROLES } from '../../constants/roles';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher';
}

interface Attendance {
  id?: number;
  user_id: number;
  role: 'student' | 'teacher';
  attendance_date: string;
  status: 'present' | 'absent' | 'leave' | 'not_marked';
  reason?: string | null;
}

export default function DailyAttendance() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Record<number, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState<string>(() => {
    const fromQuery = searchParams.get('date');

    if (fromQuery && !Number.isNaN(Date.parse(fromQuery))) {
      return fromQuery;
    }

    return new Date().toISOString().split('T')[0];
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

  // Fetch users and initialize attendance
  useEffect(() => {
    const fetchUsersAndAttendance = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('authToken');

        // Fetch users
        const usersRes = await axios.get(`${API_BASE_URL}/users?roles=student,teacher`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usersData: User[] = usersRes.data.data || [];
        setUsers(usersData);

        // Fetch attendance for the selected date
        const attendanceRes = await axios.get(`${API_BASE_URL}/attendances?date=${date}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const attendanceData: Attendance[] = attendanceRes.data.data || [];

        // Map attendance records to user_id => Attendance
        const attendanceMap: Record<number, Attendance> = {};
        usersData.forEach((user) => {
          const record = attendanceData.find((att) => att.user_id === user.id);
          attendanceMap[user.id] = record
            ? { ...record }
            : { user_id: user.id, role: user.role, attendance_date: date, status: 'not_marked' };
        });

        setAttendance(attendanceMap);
      } catch (error) {
        console.error('Error fetching users or attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndAttendance();
  }, [API_BASE_URL, date]);

  // Handle status change
  const handleStatusChange = (
    userId: number,
    status: 'present' | 'absent' | 'leave' | 'not_marked'
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        status,
      },
    }));
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('authToken');
      const requests = Object.values(attendance).map((att) =>
        axios.post(`${API_BASE_URL}/attendances`, att, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      await Promise.all(requests);
      alert('Attendance saved successfully');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <Spinner animation="border" />
        <span className="ms-2">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Daily Attendance</h6>
        <Form.Control
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ maxWidth: '200px' }}
        />
      </div>
      <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <Table bordered hover responsive>
          <thead>
            <tr>
              <th>S.no</th>
              <th>Name</th>
              <th>Role</th>
              <th className="text-center">Present</th>
              <th className="text-center">Absent</th>
              <th className="text-center">Leave</th>
              <th className="text-center">Not Marked</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr
                key={user.id}
                className={attendance[user.id]?.status === 'not_marked' ? 'table-warning' : ''}
              >
                <td>{index + 1}</td>
                <td>{user.name}</td>
                <td>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
                <td className="text-center">
                  <Form.Check
                    type="radio"
                    name={`status_${user.id}`}
                    checked={attendance[user.id]?.status === 'present'}
                    onChange={() => handleStatusChange(user.id, 'present')}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="radio"
                    name={`status_${user.id}`}
                    checked={attendance[user.id]?.status === 'absent'}
                    onChange={() => handleStatusChange(user.id, 'absent')}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="radio"
                    name={`status_${user.id}`}
                    checked={attendance[user.id]?.status === 'leave'}
                    onChange={() => handleStatusChange(user.id, 'leave')}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="radio"
                    name={`status_${user.id}`}
                    checked={attendance[user.id]?.status === 'not_marked'}
                    onChange={() => handleStatusChange(user.id, 'not_marked')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="d-flex justify-content-end mt-3">
          <Button onClick={handleSaveAttendance} disabled={saving}>
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>
    </div>
  );
}
