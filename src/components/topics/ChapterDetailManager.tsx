import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import Icon from '../common/Icon.tsx';

interface Subject {
  id: number;
  subject: string;
}

interface Topic {
  id: number;
  tenant_id: number;
  subject_id: number;
  chapter_id: number | null;
  grade: number | null;
  name: string;
}

interface Chapter {
  id: number;
  tenant_id: number;
  subject_id: number;
  name: string;
  subject?: Subject;
  topics: Topic[];
}

interface ChapterDetailManagerProps {
  /** e.g. '/admin/chapters' */
  apiBasePath: string;
  subjectsTenantId: string;
  chaptersRoute: string;
  questionsRoute: (topicId: number) => string;
  ownTenantId: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function ChapterDetailManager({ apiBasePath, subjectsTenantId, chaptersRoute, questionsRoute, ownTenantId }: ChapterDetailManagerProps) {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);

  const [formSubjectId, setFormSubjectId] = useState('');
  const [formName, setFormName] = useState('');

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };

  const fetchChapter = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}${apiBasePath}/${chapterId}`, { headers: authHeaders });
      const data: Chapter = response.data?.data;
      setChapter(data);
      setFormSubjectId(String(data.subject_id));
      setFormName(data.name);
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/subjects/${subjectsTenantId}`, { headers: authHeaders });
        setSubjects(response.data?.data ?? []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    fetchSubjects();
    fetchChapter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const fetchAvailableTopics = async (chapterData: Chapter) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/topics`, {
        params: { subject_id: chapterData.subject_id },
        headers: authHeaders,
      });
      const topics: Topic[] = response.data?.data ?? [];
      // Only the tenant's own topics for this subject can be attached (base topics can't be reassigned into a custom chapter)
      setAvailableTopics(topics.filter((t) => t.tenant_id === chapterData.tenant_id && t.chapter_id !== chapterData.id));
    } catch (error) {
      console.error('Error fetching available topics:', error);
    }
  };

  useEffect(() => {
    if (!chapter) return;
    fetchAvailableTopics(chapter);
    setSelectedTopicIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.id, chapter?.subject_id, chapter?.topics]);

  const canManage = chapter?.tenant_id === ownTenantId;

  const handleUpdateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapter) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}${apiBasePath}/${chapter.id}`, { subject_id: formSubjectId, name: formName }, { headers: authHeaders });
      fetchChapter();
    } catch (error) {
      console.error('Error updating chapter:', error);
      alert('Failed to update chapter.');
    } finally {
      setSaving(false);
    }
  };

  const handleDetach = async (topicId: number) => {
    if (!chapter) return;
    if (!confirm('Remove this topic from the chapter? The topic itself will not be deleted.')) return;
    try {
      await axios.delete(`${API_BASE_URL}${apiBasePath}/${chapter.id}/topics/${topicId}`, { headers: authHeaders });
      fetchChapter();
    } catch (error) {
      console.error('Error removing topic from chapter:', error);
      alert('Failed to remove topic from chapter.');
    }
  };

  const toggleSelected = (topicId: number) => {
    setSelectedTopicIds((prev) => (prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]));
  };

  const handleAttach = async () => {
    if (!chapter || selectedTopicIds.length === 0) return;
    setAttaching(true);
    try {
      await axios.post(`${API_BASE_URL}${apiBasePath}/${chapter.id}/topics`, { topic_ids: selectedTopicIds }, { headers: authHeaders });
      fetchChapter();
    } catch (error) {
      console.error('Error adding topics to chapter:', error);
      alert('Failed to add topics to chapter.');
    } finally {
      setAttaching(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <span className="spinner-border spinner-border-sm" role="status" />
        <span className="ms-2">Loading chapter...</span>
      </div>
    );
  }

  if (!chapter) {
    return <p className="text-center text-muted">Chapter not found.</p>;
  }

  return (
    <div>
      <div className="mb-24">
        <Link to={chaptersRoute} className="text-sm text-secondary-light d-flex align-items-center gap-1 mb-2">
          <Icon icon="mdi:arrow-left" /> Back to Chapters
        </Link>
        <h6 className="fw-semibold mb-0">{chapter.name}</h6>
      </div>

      {/* Edit chapter */}
      <div className="card mb-24">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light mb-0">Chapter Details</span>
        </div>
        <div className="card-body">
          {canManage ? (
            <form onSubmit={handleUpdateChapter} className="row g-3 align-items-end">
              <div className="col-md-5">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Subject</label>
                <select className="form-select radius-8" value={formSubjectId} onChange={(e) => setFormSubjectId(e.target.value)} disabled={saving} required>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Chapter Name</label>
                <input type="text" className="form-control radius-8" value={formName} onChange={(e) => setFormName(e.target.value)} disabled={saving} required />
              </div>
              <div className="col-md-2">
                <Button type="submit" variant="primary" className="w-100" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
              </div>
            </form>
          ) : (
            <p className="text-muted mb-0">This is a base chapter — read-only. Subject: {chapter.subject?.subject ?? '-'}</p>
          )}
        </div>
      </div>

      {/* Topics in this chapter */}
      <div className="card mb-24">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light mb-0">Topics in this Chapter</span>
        </div>
        <div className="card-body">
          {chapter.topics.length === 0 ? (
            <p className="text-muted mb-0">No topics added yet — use the panel below to add existing topics, or create a new topic and set this chapter on it.</p>
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
                        <Link to={questionsRoute(topic.id)} className="text-primary text-sm fw-medium me-3">Manage Questions</Link>
                        {canManage && (
                          <Button variant="link" className="text-danger text-sm p-0" onClick={() => handleDetach(topic.id)}>Remove</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add topics */}
      {canManage && (
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24">
            <span className="text-md fw-medium text-secondary-light mb-0">Add Topics to this Chapter</span>
          </div>
          <div className="card-body">
            <p className="text-xs text-muted mb-3">Any topic created later under the same subject shows up here — select it and add it to this chapter.</p>
            {availableTopics.length === 0 ? (
              <p className="text-muted mb-0">
                No unassigned topics for this subject. <Link to="/topics" className="text-primary">Create a new topic</Link> and pick this chapter directly on it.
              </p>
            ) : (
              <>
                <div className="border radius-8 p-3 mb-3" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {availableTopics.map((topic) => (
                    <div className="form-check mb-1" key={topic.id}>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`topic-${topic.id}`}
                        checked={selectedTopicIds.includes(topic.id)}
                        onChange={() => toggleSelected(topic.id)}
                      />
                      <label className="form-check-label" htmlFor={`topic-${topic.id}`}>
                        {topic.name} <span className="text-xs text-muted">({topic.grade ? `Grade ${topic.grade}` : 'All grades'})</span>
                        {topic.chapter_id && <span className="text-xs text-muted"> (currently in another chapter)</span>}
                      </label>
                    </div>
                  ))}
                </div>
                <Button variant="success" onClick={handleAttach} disabled={attaching || selectedTopicIds.length === 0}>
                  {attaching ? 'Adding...' : 'Add Selected Topics'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
