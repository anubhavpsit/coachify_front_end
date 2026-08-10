import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import Icon from '../common/Icon.tsx';

interface Chapter {
  id: number;
  name: string;
}

interface Topic {
  id: number;
  subject_id: number;
  chapter_id: number | null;
  grade: number | null;
  name: string;
  explanation_html: string | null;
  chapter?: Chapter | null;
  questions_count?: number;
}

interface Question {
  id: number;
  grade: number;
  difficulty: string | null;
  question_type: string | null;
  question_html: string;
  solution_html: string | null;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  answer_key: string | null;
  needs_image: boolean;
  image_note: string | null;
}

interface LibraryTopicDetailManagerProps {
  backRoute: string;
  backLabel: string;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  long_answer: 'Long Answer',
  fill_in_the_blank: 'Fill in the Blank',
  match_the_following: 'Match the Following',
};

const SUBJECTIVE_TYPES = ['short_answer', 'long_answer', 'fill_in_the_blank', 'match_the_following'];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

const sanitize = (html: string) => DOMPurify.sanitize(html);

export default function LibraryTopicDetailManager({ backRoute, backLabel }: LibraryTopicDetailManagerProps) {
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [topicRes, questionsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/topics/${topicId}`, { headers: authHeaders }),
          axios.get(`${API_BASE_URL}/topics/${topicId}/questions`, { headers: authHeaders }),
        ]);
        setTopic(topicRes.data?.data ?? null);
        setQuestions(questionsRes.data?.data ?? []);
      } catch (err) {
        console.error('Error fetching topic content:', err);
        setError('You do not have access to this topic, or it does not exist.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const toggleReveal = (id: number) => setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div className="text-center py-6">
        <span className="spinner-border spinner-border-sm" role="status" />
        <span className="ms-2">Loading topic...</span>
      </div>
    );
  }

  if (error || !topic) {
    return <p className="text-center text-danger">{error ?? 'Topic not found.'}</p>;
  }

  return (
    <div>
      <div className="mb-24">
        <Link to={backRoute} className="text-sm text-secondary-light d-flex align-items-center gap-1 mb-2">
          <Icon icon="mdi:arrow-left" /> {backLabel}
        </Link>
        <h6 className="fw-semibold mb-0">{topic.name}</h6>
        <span className="text-sm text-muted">
          {topic.chapter?.name ?? 'No chapter'} · {topic.grade ? `Grade ${topic.grade}` : 'All grades'}
        </span>
      </div>

      <div className="card mb-24">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light mb-0">Explanation</span>
        </div>
        <div className="card-body">
          {topic.explanation_html ? (
            <div dangerouslySetInnerHTML={{ __html: sanitize(topic.explanation_html) }} />
          ) : (
            <p className="text-muted mb-0">No explanation has been written for this topic yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light mb-0">Questions ({questions.length})</span>
        </div>
        <div className="card-body">
          {questions.length === 0 ? (
            <p className="text-muted mb-0">No questions have been added for this topic yet.</p>
          ) : (
            <div className="d-flex flex-column gap-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="border radius-8 p-16">
                  <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                    <span className="fw-semibold">Q{idx + 1}.</span>
                    <span className="badge bg-primary-subtle text-primary-emphasis">Grade {q.grade}</span>
                    {q.difficulty && <span className="badge bg-secondary-subtle text-secondary-emphasis text-capitalize">{q.difficulty}</span>}
                    {q.question_type && <span className="badge bg-info-subtle text-info-emphasis">{QUESTION_TYPE_LABELS[q.question_type] ?? q.question_type}</span>}
                    {q.needs_image && <span className="badge bg-danger-subtle text-danger-emphasis">Needs image{q.image_note ? `: ${q.image_note}` : ''}</span>}
                  </div>

                  <div dangerouslySetInnerHTML={{ __html: sanitize(q.question_html) }} />

                  {q.question_type === 'mcq' && (
                    <ul className="list-unstyled mt-2 mb-2">
                      {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                        const value = q[`option_${opt}` as const];
                        if (!value) return null;
                        const isCorrect = q.correct_answer === opt;
                        return (
                          <li key={opt} className={isCorrect && revealed[q.id] ? 'text-success fw-semibold' : ''}>
                            {opt.toUpperCase()}. {value} {isCorrect && revealed[q.id] && <Icon icon="mdi:check-circle" className="ms-1" />}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {(q.solution_html || q.answer_key || q.correct_answer) && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => toggleReveal(q.id)}
                      >
                        {revealed[q.id] ? 'Hide Answer' : 'Show Answer'}
                      </button>
                      {revealed[q.id] && (
                        <div className="mt-2 p-12 bg-neutral-50 radius-8">
                          {q.question_type === 'true_false' && q.correct_answer && (
                            <p className="mb-2"><strong>Correct answer:</strong> {q.correct_answer === 'true' ? 'True' : 'False'}</p>
                          )}
                          {q.question_type && SUBJECTIVE_TYPES.includes(q.question_type) && q.answer_key && (
                            <div>
                              <strong>Answer key:</strong>
                              <div dangerouslySetInnerHTML={{ __html: sanitize(q.answer_key) }} />
                            </div>
                          )}
                          {q.solution_html && (
                            <div>
                              <strong>Solution:</strong>
                              <div dangerouslySetInnerHTML={{ __html: sanitize(q.solution_html) }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
