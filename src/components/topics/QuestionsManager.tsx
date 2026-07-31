import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import Icon from '../common/Icon.tsx';
import RichTextEditor from './RichTextEditor.tsx';

interface Question {
  id: number;
  tenant_id: number;
  grade: number;
  difficulty: string | null;
  question_html: string;
  solution_html: string | null;
}

interface QuestionsManagerProps {
  /** e.g. '/admin/topics' */
  apiBasePath: string;
  /** Back link to the topics list */
  topicsRoute: string;
  ownTenantId: number;
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const DIFFICULTIES = ['easy', 'medium', 'hard'];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

export default function QuestionsManager({ apiBasePath, topicsRoute, ownTenantId }: QuestionsManagerProps) {
  const { topicId } = useParams<{ topicId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formGrade, setFormGrade] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('');
  const [formQuestionHtml, setFormQuestionHtml] = useState('');
  const [formSolutionHtml, setFormSolutionHtml] = useState('');
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null);

  const token = () => localStorage.getItem('authToken');
  const authHeaders = { Authorization: `Bearer ${token()}`, Accept: 'application/json' };
  const questionsUrl = `${API_BASE_URL}${apiBasePath}/${topicId}/questions`;

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(questionsUrl, {
        params: gradeFilter ? { grade: gradeFilter } : undefined,
        headers: authHeaders,
      });
      setQuestions(response.data?.data ?? []);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, gradeFilter]);

  const resetForm = () => {
    setFormGrade('');
    setFormDifficulty('');
    setFormQuestionHtml('');
    setFormSolutionHtml('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGrade || !formQuestionHtml.trim()) return;
    setSaving(true);
    try {
      await axios.post(
        questionsUrl,
        { grade: formGrade, difficulty: formDifficulty || null, question_html: formQuestionHtml, solution_html: formSolutionHtml },
        { headers: authHeaders },
      );
      setShowAddModal(false);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error creating question:', error);
      alert('Failed to create question.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (question: Question) => {
    setEditQuestion(question);
    setFormGrade(String(question.grade));
    setFormDifficulty(question.difficulty ?? '');
    setFormQuestionHtml(question.question_html ?? '');
    setFormSolutionHtml(question.solution_html ?? '');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestion) return;
    setSaving(true);
    try {
      await axios.put(
        `${questionsUrl}/${editQuestion.id}`,
        { grade: formGrade, difficulty: formDifficulty || null, question_html: formQuestionHtml, solution_html: formSolutionHtml },
        { headers: authHeaders },
      );
      setShowEditModal(false);
      setEditQuestion(null);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteQuestion) return;
    setSaving(true);
    try {
      await axios.delete(`${questionsUrl}/${deleteQuestion.id}`, { headers: authHeaders });
      setShowDeleteModal(false);
      setDeleteQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question.');
    } finally {
      setSaving(false);
    }
  };

  const canManage = (question: Question) => question.tenant_id === ownTenantId;

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <div>
          <Link to={topicsRoute} className="text-sm text-secondary-light d-flex align-items-center gap-1 mb-2">
            <Icon icon="mdi:arrow-left" /> Back to Topics
          </Link>
          <h6 className="fw-semibold mb-0">Questions</h6>
        </div>
      </div>

      <div className="row gy-4 mb-24">
        <div className="card">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <span className="text-md fw-medium text-secondary-light mb-0">Question Bank</span>
            <div className="d-flex align-items-center gap-3">
              <select className="form-select radius-8" style={{ minWidth: 140 }} value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                <option value="">All Grades</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
              <Button variant="primary" onClick={() => setShowAddModal(true)} className="text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2">
                <Icon icon="ic:baseline-plus" className="icon text-xl line-height-1" />
                Add Question
              </Button>
            </div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="text-center py-6">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="ms-2">Loading questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <p className="text-center text-muted">No questions found for this filter.</p>
            ) : (
              <div className="table-responsive">
                <table className="table bordered-table mb-0">
                  <thead>
                    <tr>
                      <th scope="col" className="text-center">Grade</th>
                      <th scope="col" className="text-center">Difficulty</th>
                      <th scope="col">Question</th>
                      <th scope="col" className="text-center">Type</th>
                      <th scope="col" className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((question) => (
                      <tr key={question.id}>
                        <td className="text-center">{question.grade}</td>
                        <td className="text-center text-capitalize">{question.difficulty ?? '-'}</td>
                        <td>
                          <div
                            className="text-truncate"
                            style={{ maxWidth: 400 }}
                            dangerouslySetInnerHTML={{ __html: question.question_html }}
                          />
                        </td>
                        <td className="text-center">
                          {question.tenant_id === 0 ? (
                            <span className="bg-success-focus text-success-main px-24 py-4 rounded-pill fw-medium text-sm">Base</span>
                          ) : (
                            <span className="bg-warning-focus text-warning-main px-24 py-4 rounded-pill fw-medium text-sm">Custom</span>
                          )}
                        </td>
                        <td className="text-center">
                          {canManage(question) ? (
                            <>
                              <Button variant="link" onClick={() => openEdit(question)}>
                                <Icon icon="ic:baseline-edit" className="text-primary text-lg" />
                              </Button>
                              <Button variant="link" onClick={() => { setDeleteQuestion(question); setShowDeleteModal(true); }}>
                                <Icon icon="ic:baseline-delete" className="text-danger text-lg" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted text-xs">Read-only</span>
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
      </div>

      {/* Add Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); resetForm(); }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleAdd}>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Grade</label>
                <select className="form-select radius-8" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} disabled={saving} required>
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Difficulty (optional)</label>
                <select className="form-select radius-8" value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} disabled={saving}>
                  <option value="">None</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d} className="text-capitalize">{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Question</label>
              <RichTextEditor value={formQuestionHtml} onChange={setFormQuestionHtml} disabled={saving} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Solution (hidden from students until unlock delay)</label>
              <RichTextEditor value={formSolutionHtml} onChange={setFormSolutionHtml} disabled={saving} />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setEditQuestion(null); }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleUpdate}>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Grade</label>
                <select className="form-select radius-8" value={formGrade} onChange={(e) => setFormGrade(e.target.value)} disabled={saving} required>
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Difficulty (optional)</label>
                <select className="form-select radius-8" value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} disabled={saving}>
                  <option value="">None</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d} className="text-capitalize">{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Question</label>
              <RichTextEditor value={formQuestionHtml} onChange={setFormQuestionHtml} disabled={saving} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Solution</label>
              <RichTextEditor value={formSolutionHtml} onChange={setFormSolutionHtml} disabled={saving} />
            </div>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditQuestion(null); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Updating...' : 'Update'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this question?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
