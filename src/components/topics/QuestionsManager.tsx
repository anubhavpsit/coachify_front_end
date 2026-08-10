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

interface QuestionsManagerProps {
  /** e.g. '/admin/topics' */
  apiBasePath: string;
  /** Back link to the topics list */
  topicsRoute: string;
  ownTenantId: number;
}

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUESTION_TYPES = [
  { value: '', label: 'Not set' },
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'long_answer', label: 'Long Answer' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank' },
  { value: 'match_the_following', label: 'Match the Following' },
];
const SUBJECTIVE_TYPES = ['short_answer', 'long_answer', 'fill_in_the_blank', 'match_the_following'];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

interface QuestionFormState {
  grade: string;
  difficulty: string;
  questionType: string;
  questionHtml: string;
  solutionHtml: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  answerKey: string;
  needsImage: boolean;
  imageNote: string;
}

const emptyForm: QuestionFormState = {
  grade: '', difficulty: '', questionType: '', questionHtml: '', solutionHtml: '',
  optionA: '', optionB: '', optionC: '', optionD: '', correctAnswer: '', answerKey: '',
  needsImage: false, imageNote: '',
};

export default function QuestionsManager({ apiBasePath, topicsRoute, ownTenantId }: QuestionsManagerProps) {
  const { topicId } = useParams<{ topicId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [form, setForm] = useState<QuestionFormState>(emptyForm);
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
    setForm(emptyForm);
    setUploadedUrl('');
  };

  const buildPayload = () => ({
    grade: form.grade,
    difficulty: form.difficulty || null,
    question_type: form.questionType || null,
    question_html: form.questionHtml,
    solution_html: form.solutionHtml || null,
    option_a: form.questionType === 'mcq' ? form.optionA : null,
    option_b: form.questionType === 'mcq' ? form.optionB : null,
    option_c: form.questionType === 'mcq' ? form.optionC : null,
    option_d: form.questionType === 'mcq' ? form.optionD : null,
    correct_answer: (form.questionType === 'mcq' || form.questionType === 'true_false') ? form.correctAnswer : null,
    answer_key: SUBJECTIVE_TYPES.includes(form.questionType) ? form.answerKey : null,
    needs_image: form.needsImage,
    image_note: form.imageNote || null,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.grade || !form.questionHtml.trim()) return;
    setSaving(true);
    try {
      await axios.post(questionsUrl, buildPayload(), { headers: authHeaders });
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
    setForm({
      grade: String(question.grade),
      difficulty: question.difficulty ?? '',
      questionType: question.question_type ?? '',
      questionHtml: question.question_html ?? '',
      solutionHtml: question.solution_html ?? '',
      optionA: question.option_a ?? '',
      optionB: question.option_b ?? '',
      optionC: question.option_c ?? '',
      optionD: question.option_d ?? '',
      correctAnswer: question.correct_answer ?? '',
      answerKey: question.answer_key ?? '',
      needsImage: question.needs_image ?? false,
      imageNote: question.image_note ?? '',
    });
    setUploadedUrl('');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestion) return;
    setSaving(true);
    try {
      await axios.put(`${questionsUrl}/${editQuestion.id}`, buildPayload(), { headers: authHeaders });
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

  const handleImageUpload = async (file: File) => {
    if (!editQuestion) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await axios.post(`${questionsUrl}/${editQuestion.id}/image`, formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
      });
      setUploadedUrl(response.data?.url ?? '');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const canManage = (question: Question) => question.tenant_id === ownTenantId;

  const questionTypeFields = (
    <>
      <div className="mb-3">
        <label className="form-label fw-semibold text-primary-light text-sm mb-2">Question Type (optional)</label>
        <select
          className="form-select radius-8"
          value={form.questionType}
          onChange={(e) => setForm({ ...form, questionType: e.target.value, correctAnswer: '' })}
          disabled={saving}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {form.questionType === 'mcq' && (
        <div className="row">
          <div className="col-6 mb-3">
            <label className="form-label fw-semibold text-primary-light text-sm mb-2">Option A</label>
            <input type="text" className="form-control radius-8" value={form.optionA} onChange={(e) => setForm({ ...form, optionA: e.target.value })} disabled={saving} required />
          </div>
          <div className="col-6 mb-3">
            <label className="form-label fw-semibold text-primary-light text-sm mb-2">Option B</label>
            <input type="text" className="form-control radius-8" value={form.optionB} onChange={(e) => setForm({ ...form, optionB: e.target.value })} disabled={saving} required />
          </div>
          <div className="col-6 mb-3">
            <label className="form-label fw-semibold text-primary-light text-sm mb-2">Option C</label>
            <input type="text" className="form-control radius-8" value={form.optionC} onChange={(e) => setForm({ ...form, optionC: e.target.value })} disabled={saving} required />
          </div>
          <div className="col-6 mb-3">
            <label className="form-label fw-semibold text-primary-light text-sm mb-2">Option D</label>
            <input type="text" className="form-control radius-8" value={form.optionD} onChange={(e) => setForm({ ...form, optionD: e.target.value })} disabled={saving} required />
          </div>
          <div className="col-6 mb-3">
            <label className="form-label fw-semibold text-primary-light text-sm mb-2">Correct Answer</label>
            <select className="form-select radius-8" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} disabled={saving} required>
              <option value="">Select correct option</option>
              <option value="a">A</option>
              <option value="b">B</option>
              <option value="c">C</option>
              <option value="d">D</option>
            </select>
          </div>
        </div>
      )}

      {form.questionType === 'true_false' && (
        <div className="mb-3">
          <label className="form-label fw-semibold text-primary-light text-sm mb-2">Correct Answer</label>
          <select className="form-select radius-8" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} disabled={saving} required>
            <option value="">Select correct answer</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )}

      {SUBJECTIVE_TYPES.includes(form.questionType) && (
        <div className="mb-3">
          <label className="form-label fw-semibold text-primary-light text-sm mb-2">Answer Key</label>
          <textarea
            className="form-control radius-8"
            rows={3}
            value={form.answerKey}
            onChange={(e) => setForm({ ...form, answerKey: e.target.value })}
            disabled={saving}
            required
          />
        </div>
      )}

      <div className="row align-items-center">
        <div className="col-4 mb-3">
          <div className="form-check mt-4">
            <input
              type="checkbox"
              className="form-check-input"
              id="needsImage"
              checked={form.needsImage}
              onChange={(e) => setForm({ ...form, needsImage: e.target.checked })}
              disabled={saving}
            />
            <label className="form-check-label" htmlFor="needsImage">Needs Image</label>
          </div>
        </div>
        {form.needsImage && (
          <div className="col-8 mb-3">
            <label className="form-label fw-semibold text-primary-light text-sm mb-2">Image Note</label>
            <input type="text" className="form-control radius-8" value={form.imageNote} onChange={(e) => setForm({ ...form, imageNote: e.target.value })} disabled={saving} placeholder="What image is needed?" />
          </div>
        )}
      </div>
    </>
  );

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
                      <th scope="col" className="text-center">Q. Type</th>
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
                        <td className="text-center">
                          {QUESTION_TYPES.find((t) => t.value === question.question_type)?.label ?? '-'}
                          {question.needs_image && (
                            <div><span className="badge bg-danger-subtle text-danger-emphasis mt-1">Needs image</span></div>
                          )}
                        </td>
                        <td>
                          <div
                            className="text-truncate"
                            style={{ maxWidth: 350 }}
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
                <select className="form-select radius-8" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} disabled={saving} required>
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Difficulty (optional)</label>
                <select className="form-select radius-8" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} disabled={saving}>
                  <option value="">None</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d} className="text-capitalize">{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Question</label>
              <RichTextEditor value={form.questionHtml} onChange={(html) => setForm({ ...form, questionHtml: html })} disabled={saving} />
            </div>
            {questionTypeFields}
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Solution (hidden from students until unlock delay)</label>
              <RichTextEditor value={form.solutionHtml} onChange={(html) => setForm({ ...form, solutionHtml: html })} disabled={saving} />
            </div>
            <p className="text-xs text-muted">Image upload becomes available once the question is first saved.</p>
            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }} disabled={saving}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => { setShowEditModal(false); setEditQuestion(null); resetForm(); }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleUpdate}>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Grade</label>
                <select className="form-select radius-8" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} disabled={saving} required>
                  <option value="">Select grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 mb-3">
                <label className="form-label fw-semibold text-primary-light text-sm mb-2">Difficulty (optional)</label>
                <select className="form-select radius-8" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} disabled={saving}>
                  <option value="">None</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d} className="text-capitalize">{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Question</label>
              <RichTextEditor value={form.questionHtml} onChange={(html) => setForm({ ...form, questionHtml: html })} disabled={saving} />
            </div>
            {questionTypeFields}
            <div className="mb-3">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Solution</label>
              <RichTextEditor value={form.solutionHtml} onChange={(html) => setForm({ ...form, solutionHtml: html })} disabled={saving} />
            </div>

            <div className="mb-3 p-3 border radius-8 bg-neutral-50">
              <label className="form-label fw-semibold text-primary-light text-sm mb-2">Upload Image</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="form-control radius-8"
                disabled={uploading}
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
              />
              {uploading && <p className="text-xs text-muted mt-2 mb-0">Uploading...</p>}
              {uploadedUrl && (
                <div className="mt-2">
                  <p className="text-xs text-muted mb-1">Uploaded — copy this into the Question or Solution as an image:</p>
                  <input type="text" readOnly className="form-control form-control-sm" value={uploadedUrl} onFocus={(e) => e.target.select()} />
                </div>
              )}
            </div>

            <div className="d-flex justify-content-end gap-3 mt-3">
              <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditQuestion(null); resetForm(); }} disabled={saving}>Cancel</Button>
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
