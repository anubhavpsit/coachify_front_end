import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import Icon from '../common/Icon.tsx';

interface Subject {
  id: number;
  subject: string;
}

interface Topic {
  id: number;
  name: string;
  grade: number | null;
}

interface Chapter {
  id: number;
  tenant_id: number;
  subject_id: number;
  name: string;
  subject?: Subject;
  topics: Topic[];
}

interface LibraryChapterDetailManagerProps {
  chaptersRoute: string;
  topicDetailRoute: (topicId: number) => string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function LibraryChapterDetailManager({ chaptersRoute, topicDetailRoute }: LibraryChapterDetailManagerProps) {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };

  useEffect(() => {
    const fetchChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/chapters/${chapterId}`, { headers: authHeaders });
        setChapter(response.data?.data ?? null);
      } catch (err) {
        console.error('Error fetching chapter:', err);
        setError('You do not have access to this chapter, or it does not exist.');
      } finally {
        setLoading(false);
      }
    };
    fetchChapter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  if (loading) {
    return (
      <div className="text-center py-6">
        <span className="spinner-border spinner-border-sm" role="status" />
        <span className="ms-2">Loading chapter...</span>
      </div>
    );
  }

  if (error || !chapter) {
    return <p className="text-center text-danger">{error ?? 'Chapter not found.'}</p>;
  }

  return (
    <div>
      <div className="mb-24">
        <Link to={chaptersRoute} className="text-sm text-secondary-light d-flex align-items-center gap-1 mb-2">
          <Icon icon="mdi:arrow-left" /> Back to Chapters
        </Link>
        <h6 className="fw-semibold mb-0">{chapter.name}</h6>
        <span className="text-sm text-muted">{chapter.subject?.subject}</span>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light mb-0">Topics in this Chapter</span>
        </div>
        <div className="card-body">
          {chapter.topics.length === 0 ? (
            <p className="text-muted mb-0">No topics have been added to this chapter yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th scope="col">Topic</th>
                    <th scope="col" className="text-center">Grade</th>
                    <th scope="col" className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chapter.topics.map((topic) => (
                    <tr key={topic.id}>
                      <td>{topic.name}</td>
                      <td className="text-center">{topic.grade ? `Grade ${topic.grade}` : 'All'}</td>
                      <td className="text-center">
                        <Link to={topicDetailRoute(topic.id)} className="text-primary text-sm fw-medium">
                          View
                        </Link>
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
  );
}
