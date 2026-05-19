import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Table, Button, Form, Spinner } from 'react-bootstrap';

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
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [holidayName, setHolidayName] = useState<string>('');
  const [authRole, setAuthRole] = useState<string>('');
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
    try {
      const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      if (authUser && authUser.role) setAuthRole(authUser.role);
    } catch {}
    const fetchUsersAndAttendance = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');

        // Fetch users
        const usersRes = await axios.get(`${API_BASE_URL}/attendances/markable-users`, {
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

        // Fetch holiday status for this date
        const holidayRes = await axios.get(`${API_BASE_URL}/admin/holidays?date=${date}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const holidays = holidayRes.data?.data ?? [];
        if (Array.isArray(holidays) && holidays.length > 0) {
          setIsHoliday(true);
          setHolidayName(holidays[0]?.name ?? '');
        } else {
          setIsHoliday(false);
          setHolidayName('');
        }
      } catch (error) {
        console.error('Error fetching users or attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsersAndAttendance();
  }, [API_BASE_URL, date]);

  const handleStatusChange = (
    userId: number,
    status: 'present' | 'absent' | 'leave' | 'not_marked'
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], status },
    }));
  };

  const handleMarkAll = (status: 'present' | 'absent' | 'leave' | 'not_marked') => {
    setAttendance((prev) => {
      const updated = { ...prev };
      users.forEach((u) => {
        updated[u.id] = { ...updated[u.id], status };
      });
      return updated;
    });
  };

  const allHaveStatus = (status: 'present' | 'absent' | 'leave' | 'not_marked') =>
    users.length > 0 && users.every((u) => attendance[u.id]?.status === status);

  // Save attendance
  const handleSaveAttendance = async () => {
    if (isHoliday) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
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

  const toggleHoliday = async () => {
    const token = localStorage.getItem('authToken');
    try {
      if (!isHoliday) {
        await axios.post(
          `${API_BASE_URL}/admin/holidays`,
          { date, name: holidayName || undefined },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsHoliday(true);
      } else {
        await axios.delete(`${API_BASE_URL}/admin/holidays`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { date },
        } as any);
        setIsHoliday(false);
        setHolidayName('');
      }
    } catch (e) {
      alert('Failed to update holiday');
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
        <div className="d-flex align-items-center gap-2">
          <Form.Control
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ maxWidth: '200px' }}
          />
          {authRole === 'coaching_admin' && (
            <Button variant={isHoliday ? 'warning' : 'outline-secondary'} size="sm" onClick={toggleHoliday} style={{ minWidth: '140px' }}>
              {isHoliday ? 'Unmark Holiday' : 'Mark Holiday'}
            </Button>
          )}
        </div>
      </div>
      <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {isHoliday && (
          <div className="alert alert-info d-flex justify-content-between align-items-center">
            <div>
              <strong>Holiday:</strong> Attendance not required for {new Date(date).toLocaleDateString()}.
            </div>
          </div>
        )}
        <Table bordered hover responsive>
          <thead>
            <tr>
              <th>S.no</th>
              <th>Name</th>
              <th>Role</th>
              {(['present', 'absent', 'leave', 'not_marked'] as const).map((status) => (
                <th key={status} className="text-center" style={{ whiteSpace: 'nowrap' }}>
                  <div className="d-flex flex-column align-items-center gap-1">
                    <span>{status === 'not_marked' ? 'Not Marked' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    <Form.Check
                      type="checkbox"
                      checked={allHaveStatus(status)}
                      onChange={() => handleMarkAll(status)}
                      disabled={isHoliday}
                      title={`Mark all ${status}`}
                      className="m-0"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr
                key={user.id}
                className={attendance[user.id]?.status === 'not_marked' && !isHoliday ? 'table-warning' : ''}
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
                    disabled={isHoliday}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="radio"
                    name={`status_${user.id}`}
                    checked={attendance[user.id]?.status === 'absent'}
                    onChange={() => handleStatusChange(user.id, 'absent')}
                    disabled={isHoliday}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="radio"
                    name={`status_${user.id}`}
                    checked={attendance[user.id]?.status === 'leave'}
                    onChange={() => handleStatusChange(user.id, 'leave')}
                    disabled={isHoliday}
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="radio"
                    name={`status_${user.id}`}
                    checked={attendance[user.id]?.status === 'not_marked'}
                    onChange={() => handleStatusChange(user.id, 'not_marked')}
                    disabled={isHoliday}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="d-flex justify-content-end mt-3">
          <Button onClick={handleSaveAttendance} disabled={saving || isHoliday}>
            {isHoliday ? 'Holiday (No Attendance)' : saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>
    </div>
  );
}
