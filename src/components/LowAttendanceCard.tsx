import { useEffect, useState } from 'react';
import axios from 'axios';
import Avatar from './common/Avatar.tsx';
interface UserAttendance {
  id: number;
  name: string;
  role: string;
  attendance_percentage: number;
}

export default function LowAttendanceCard() {
  const [users, setUsers] = useState<UserAttendance[]>([]);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

  useEffect(() => {
    const fetchLowAttendance = async () => {
      const token = sessionStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/attendance/low-percentage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.data);
    };

    fetchLowAttendance();
  }, []);

  return (
    <div className="col-xxl-4 col-md-6">
      <div className="card">
        <div className="card-header">
          <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
            <h6 className="mb-2 fw-bold text-lg mb-0">Low Attendance Users</h6>
          </div>
        </div>

        <div className="card-body" style={{ maxHeight: "300px", overflowY: users.length > 4 ? 'auto' : 'visible' }}>
          {users.map(user => (
            <div key={user.id} className="d-flex align-items-center justify-content-between gap-3 mb-3">
              <div className="d-flex align-items-center gap-2">
                <Avatar
                  user={user}
                  size={32}
                  color={
                    user.role === "teacher"
                      ? { bg: "bg-success-100", text: "text-success-600" }
                      : { bg: "bg-info-100", text: "text-info-600" }
                  }
                />

                <div className="d-flex flex-column">
                  <h6 className="text-md mb-0 fw-medium">
                    {user.name}
                  </h6>
                  <span className="text-sm text-secondary-light fw-medium">
                    {user.role}
                  </span>
                </div>
              </div>
              <span className="fw-semibold">{user.attendance_percentage}%</span>
            </div>
          ))}
          {users.length === 0 && <p className="text-center text-muted">No users below threshold</p>}
        </div>
      </div>
    </div>
  );
}
