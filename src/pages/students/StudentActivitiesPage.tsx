import { useEffect, useState } from 'react';
import axios from 'axios';

interface Activity {
  id: number;
  activity_date: string;
  chapter: string | null;
  topic: string | null;
  notes: string | null;
  homework: string | null;
  homework_status?: 'not_done' | 'partial' | 'done' | null;
  teacher?: { id: number; name: string } | null;
  subject?: { id: number; subject: string } | null;
}

export default function StudentActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filterDate, setFilterDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';
  const token = localStorage.getItem('authToken');

  const loadActivities = async (date?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = {};
      if (date) params.date = date;

      const res = await axios.get(`${API_BASE_URL}/student/daily-activities`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (res.data.success) {
        setActivities(res.data.data || []);
      }
    } catch (error) {
      console.error('Error loading student activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities(filterDate || undefined);
  }, [filterDate]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold mb-4">My Daily Activities</h2>

      <div className="border p-4 mb-4 rounded bg-gray-50">
        <label className="block font-semibold mb-1">Filter by Date</label>
        <input
          type="date"
          className="w-full border p-2 mb-3"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <p className="text-sm text-gray-500">
          Clear the date to see all your activities.
        </p>
      </div>

      {loading ? (
        <p>Loading activities...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Teacher</th>
                <th className="border px-2 py-1">Subject</th>
                <th className="border px-2 py-1">Chapter</th>
                <th className="border px-2 py-1">Topic</th>
                <th className="border px-2 py-1">Homework</th>
                <th className="border px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td
                    className="border px-2 py-2 text-center text-gray-500"
                    colSpan={7}
                  >
                    No activities found.
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id}>
                    <td className="border px-2 py-1">{act.activity_date}</td>
                    <td className="border px-2 py-1">
                      {act.teacher?.name ?? '-'}
                    </td>
                    <td className="border px-2 py-1">
                      {act.subject?.subject ?? '-'}
                    </td>
                    <td className="border px-2 py-1">{act.chapter ?? '-'}</td>
                    <td className="border px-2 py-1">{act.topic ?? '-'}</td>
                    <td className="border px-2 py-1">{act.homework ?? '-'}</td>
                    <td className="border px-2 py-1">
                      {act.homework_status === 'done'
                        ? 'Done'
                        : act.homework_status === 'partial'
                        ? 'Partial'
                        : act.homework_status === 'not_done'
                        ? 'Not done'
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
