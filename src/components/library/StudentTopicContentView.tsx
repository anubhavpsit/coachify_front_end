import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Icon from '../common/Icon.tsx';

interface TopicContentQuestion {
  id: number;
  grade: number;
  difficulty: string | null;
  question_html: string;
  solution_html: string | null;
}

interface TopicContentResponse {
  topic: {
    id: number;
    name: string;
    explanation_html: string | null;
  };
  chapter_number: number | null;
  chapter: { id: number; name: string } | null;
  grade_unknown: boolean;
  questions: TopicContentQuestion[];
  solutions_visible: boolean;
  solution_unlock_at: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

const sanitize = (html: string) => DOMPurify.sanitize(html);

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'unlocking...';
  const totalMinutes = Math.ceil(msRemaining / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

export default function StudentTopicContentView() {
  const { activityId } = useParams<{ activityId: string }>();
  const [content, setContent] = useState<TopicContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/student/daily-activities/${activityId}/topic-content`, { headers: authHeaders });
        if (response.data?.success) {
          setContent(response.data.data);
        } else {
          setError(response.data?.message ?? 'This activity has no linked topic.');
        }
      } catch (err) {
        console.error('Error fetching topic content:', err);
        setError('Could not load this topic. It may not be linked to your account.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  useEffect(() => {
    if (!content || content.solutions_visible || !content.solution_unlock_at) return;
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [content]);

  if (loading) {
    return (
      <div className="text-center py-6">
        <span className="spinner-border spinner-border-sm" role="status" />
        <span className="ms-2">Loading...</span>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div style={{ padding: '12px 16px', maxWidth: '860px', margin: '0 auto' }}>
        <Link to="/students/activities" className="text-sm text-secondary-light d-flex align-items-center gap-1 mb-3">
          <Icon icon="mdi:arrow-left" /> Back to My Activities
        </Link>
        <p className="text-center text-danger">{error ?? 'Topic not found.'}</p>
      </div>
    );
  }

  const unlockAtMs = content.solution_unlock_at ? new Date(content.solution_unlock_at).getTime() : null;
  const msRemaining = unlockAtMs !== null ? unlockAtMs - now : null;

  return (
    <div style={{ padding: '12px 16px', maxWidth: '860px', margin: '0 auto' }}>
      <Link to="/students/activities" className="text-sm text-secondary-light d-flex align-items-center gap-1 mb-3">
        <Icon icon="mdi:arrow-left" /> Back to My Activities
      </Link>

      <h6 className="fw-semibold mb-1">{content.topic.name}</h6>
      {content.chapter ? (
        <p className="text-sm text-muted mb-3">{content.chapter.name}</p>
      ) : content.chapter_number ? (
        <p className="text-sm text-muted mb-3">Chapter {content.chapter_number}</p>
      ) : null}

      {content.grade_unknown && (
        <div className="alert alert-warning">
          Your class/grade isn't set yet, so you're seeing questions for all grades on this topic. Ask your coaching admin to set your grade for a tailored set.
        </div>
      )}

      <div className="card mb-24">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light mb-0">Explanation</span>
        </div>
        <div className="card-body">
          {content.topic.explanation_html ? (
            <div dangerouslySetInnerHTML={{ __html: sanitize(content.topic.explanation_html) }} />
          ) : (
            <p className="text-muted mb-0">No explanation has been added for this topic yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light mb-0">Practice Questions ({content.questions.length})</span>
        </div>
        <div className="card-body">
          {content.questions.length === 0 ? (
            <p className="text-muted mb-0">No practice questions are available for this topic yet.</p>
          ) : (
            <>
              {!content.solutions_visible && (
                <div className="alert alert-info d-flex align-items-center gap-2">
                  <Icon icon="mdi:lock-clock-outline" />
                  <span>
                    Solutions unlock {msRemaining !== null ? `in ${formatCountdown(msRemaining)}` : 'once this activity is approved'}.
                  </span>
                </div>
              )}
              <div className="d-flex flex-column gap-4">
                {content.questions.map((q, idx) => (
                  <div key={q.id} className="border radius-8 p-16">
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                      <span className="fw-semibold">Q{idx + 1}.</span>
                      <span className="badge bg-primary-subtle text-primary-emphasis">Grade {q.grade}</span>
                      {q.difficulty && <span className="badge bg-secondary-subtle text-secondary-emphasis text-capitalize">{q.difficulty}</span>}
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: sanitize(q.question_html) }} />
                    {content.solutions_visible && q.solution_html && (
                      <div className="mt-2 p-12 bg-neutral-50 radius-8">
                        <strong>Solution:</strong>
                        <div dangerouslySetInnerHTML={{ __html: sanitize(q.solution_html) }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
