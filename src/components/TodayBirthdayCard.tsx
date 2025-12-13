import { useEffect, useState } from 'react';
import axios from 'axios';
import Slider from "react-slick";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface BirthdayUser {
  id: number;
  name: string;
  role: string; // student / teacher
  dob: string;
}

interface BirthdayCardProps {
  title?: string;
}

export default function TodayBirthdayCard({
  title = 'Today Birthdays',
}: BirthdayCardProps) {

  const [users, setUsers] = useState<BirthdayUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

  useEffect(() => {
    const fetchTodaysBirthdays = async () => {
      try {
        const token = sessionStorage.getItem('authToken');

        const response = await axios.get(
          `${API_BASE_URL}/dashboard/birthday/today`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching today birthday users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysBirthdays();
  }, [API_BASE_URL]);

  const sliderSettings = {
    infinite: users.length > 1,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    dots: false,
    speed: 600,
    autoplay: false,
  };

  return (
    <div className="col-xxl-4 col-md-6">
      <div className="card radius-12 overflow-hidden">

        <div className="card-header">
          <div className="d-flex align-items-center justify-content-between">
            <h6 className="fw-bold text-lg mb-0">{title}</h6>
          </div>
        </div>

        <div className="card-body p-16">
          {loading ? (
            <p>Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-muted">No birthdays today 🎂</p>
          ) : (
            <Slider {...sliderSettings}>
              {users.map(user => (
                <div key={user.id}>
                  <div className="card radius-12 shadow-sm">
                    <div className="card-body text-center">

                      <h6 className="mb-4">{user.name}</h6>

                      <p className="text-sm mb-2 text-secondary">
                        Role: {user.role}
                      </p>

                      <span className="badge bg-primary">
                        🎉 Birthday Today
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          )}
        </div>

      </div>
    </div>
  );
}
