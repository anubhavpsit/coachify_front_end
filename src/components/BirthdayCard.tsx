import { useEffect, useState } from 'react';
import axios from 'axios';

interface BirthdayUser {
  id: number;
  name: string;
  role: string; // 'student' or 'teacher'
  dob: string;
}

interface BirthdayCardProps {
  title?: string;
  maxHeight?: string; // e.g., '300px' for scrollable area
}

export default function BirthdayCard({ title = 'Birthday this month', maxHeight = '300px' }: BirthdayCardProps) {
  const [users, setUsers] = useState<BirthdayUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/dashboard/birthdays/current-month`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching birthday users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, [API_BASE_URL]);

  return (
    <div className="col-xxl-4 col-md-6">
      <div className="card">
        <div className="card-header">
          <div className="d-flex align-items-center flex-wrap gap-2 justify-content-between">
            <h6 className="mb-2 fw-bold text-lg mb-0">{title}</h6>
          </div>
        </div>
        <div
          className="card-body"
          style={{ maxHeight, overflowY: users.length > 4 ? 'auto' : 'visible' }} // scroll if more than 4 users
        >
          {loading ? (
            <p>Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-muted">No birthdays this month.</p>
          ) : (
            users.map(user => (
              <div className="d-flex align-items-center justify-content-between gap-3 mb-24" key={user.id}>
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h6 className="text-md mb-0 fw-medium">{user.name}</h6>
                    <span className="text-sm text-secondary-light fw-medium">{user.role}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
