import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Modal, Button } from 'react-bootstrap'
import DOMPurify from 'dompurify'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

interface PaperQuestion {
  id: number
  position: number
  marks: number | null
  question_type?: string | null
  question_html?: string | null
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  difficulty?: string | null
  grade?: number | null
  correct_answer?: string | null
  solution_html?: string | null
  answer_key?: string | null
}

interface AvailableQuestion {
  id: number
  question_type?: string | null
  question_html?: string | null
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  difficulty?: string | null
  grade?: number | null
}

interface PaperResponse {
  assessment_id: number
  title: string
  source: string
  total_marks: number
  topic?: { id: number; name: string } | null
  status: 'none' | 'pending' | 'approved' | 'released'
  approved_at?: string | null
  released_at?: string | null
  questions: PaperQuestion[]
}

interface Props {
  show: boolean
  assessmentId: number | null
  onHide: () => void
  onChanged?: () => void
}

function stripHtml(html?: string | null): string {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || el.innerText || '').trim()
}

function QuestionBody({ q }: { q: PaperQuestion | AvailableQuestion }) {
  const opts = [
    ['A', q.option_a],
    ['B', q.option_b],
    ['C', q.option_c],
    ['D', q.option_d],
  ].filter(([, v]) => !!v)
  return (
    <div>
      <div
        className="text-sm"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(q.question_html || ''),
        }}
      />
      {opts.length > 0 && (
        <ul className="list-unstyled mb-0 mt-1 ms-2">
          {opts.map(([label, v]) => (
            <li key={label} className="text-xs text-secondary-light">
              ({String(label).toLowerCase()}) {stripHtml(String(v))}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function QuestionPaperModal({
  show,
  assessmentId,
  onHide,
  onChanged,
}: Props) {
  const token = localStorage.getItem('authToken')
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' }),
    [token],
  )

  const [paper, setPaper] = useState<PaperResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [marksDraft, setMarksDraft] = useState<Record<number, string>>({})

  // Add-questions panel
  const [showAdd, setShowAdd] = useState(false)
  const [available, setAvailable] = useState<AvailableQuestion[]>([])
  const [availLoading, setAvailLoading] = useState(false)
  const [availQuery, setAvailQuery] = useState('')
  const [availDifficulty, setAvailDifficulty] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const readOnly = paper?.status === 'released'

  const fetchPaper = useCallback(async () => {
    if (!assessmentId) return
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<{ success: boolean; data: PaperResponse }>(
        `${API_BASE_URL}/assessments/${assessmentId}/question-paper`,
        { headers: authHeaders },
      )
      setPaper(res.data.data)
      setMarksDraft(
        Object.fromEntries(
          res.data.data.questions.map((q) => [q.id, String(q.marks ?? '')]),
        ),
      )
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to load the question paper.',
      )
    } finally {
      setLoading(false)
    }
  }, [assessmentId, authHeaders])

  useEffect(() => {
    if (show && assessmentId) {
      setShowAdd(false)
      setSelected(new Set())
      fetchPaper()
    }
  }, [show, assessmentId, fetchPaper])

  const afterChange = async () => {
    await fetchPaper()
    onChanged?.()
  }

  const removeQuestion = async (questionId: number) => {
    if (!assessmentId || readOnly) return
    setBusy(true)
    try {
      await axios.delete(
        `${API_BASE_URL}/assessments/${assessmentId}/question-paper/questions/${questionId}`,
        { headers: authHeaders },
      )
      await afterChange()
    } catch (err) {
      alert(
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to remove the question.',
      )
    } finally {
      setBusy(false)
    }
  }

  const saveMarks = async () => {
    if (!assessmentId || !paper || readOnly) return
    setBusy(true)
    try {
      await axios.put(
        `${API_BASE_URL}/assessments/${assessmentId}/question-paper`,
        {
          questions: paper.questions.map((q) => ({
            question_id: q.id,
            marks: Number(marksDraft[q.id]) || undefined,
          })),
        },
        { headers: authHeaders },
      )
      await afterChange()
    } catch (err) {
      alert(
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to save marks.',
      )
    } finally {
      setBusy(false)
    }
  }

  const setApproval = async (approve: boolean) => {
    if (!assessmentId) return
    setBusy(true)
    try {
      await axios.post(
        `${API_BASE_URL}/assessments/${assessmentId}/question-paper/${approve ? 'approve' : 'unapprove'}`,
        {},
        { headers: authHeaders },
      )
      await afterChange()
    } catch (err) {
      alert(
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to update approval.',
      )
    } finally {
      setBusy(false)
    }
  }

  const printPaper = async () => {
    if (!assessmentId) return
    setBusy(true)
    try {
      const res = await axios.get(
        `${API_BASE_URL}/assessments/${assessmentId}/question-paper/print`,
        { headers: authHeaders, responseType: 'blob' },
      )
      const url = URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' }),
      )
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      alert(
        axios.isAxiosError(err) && err.response?.status === 422
          ? 'Add at least one question before printing.'
          : 'Failed to generate the PDF.',
      )
    } finally {
      setBusy(false)
    }
  }

  const fetchAvailable = useCallback(async () => {
    if (!assessmentId) return
    setAvailLoading(true)
    try {
      const params = new URLSearchParams()
      if (availQuery.trim()) params.set('q', availQuery.trim())
      if (availDifficulty) params.set('difficulty', availDifficulty)
      const res = await axios.get<{ success: boolean; data: AvailableQuestion[] }>(
        `${API_BASE_URL}/assessments/${assessmentId}/question-paper/available?${params.toString()}`,
        { headers: authHeaders },
      )
      setAvailable(res.data.data)
    } catch {
      setAvailable([])
    } finally {
      setAvailLoading(false)
    }
  }, [assessmentId, authHeaders, availQuery, availDifficulty])

  useEffect(() => {
    if (showAdd) fetchAvailable()
  }, [showAdd, fetchAvailable])

  const addSelected = async () => {
    if (!assessmentId || !paper || selected.size === 0) return
    setBusy(true)
    try {
      const merged = [
        ...paper.questions.map((q) => ({ question_id: q.id, marks: q.marks ?? undefined })),
        ...Array.from(selected).map((id) => ({ question_id: id })),
      ]
      await axios.put(
        `${API_BASE_URL}/assessments/${assessmentId}/question-paper`,
        { questions: merged },
        { headers: authHeaders },
      )
      setSelected(new Set())
      setShowAdd(false)
      await afterChange()
    } catch (err) {
      alert(
        axios.isAxiosError(err) && err.response?.data?.message
          ? (err.response.data.message as string)
          : 'Failed to add questions.',
      )
    } finally {
      setBusy(false)
    }
  }

  const totalMarks = paper
    ? paper.questions.reduce((s, q) => s + (Number(marksDraft[q.id]) || 0), 0)
    : 0

  const statusBadge = () => {
    const map: Record<string, string> = {
      none: 'bg-secondary-subtle text-secondary',
      pending: 'bg-warning-subtle text-warning',
      approved: 'bg-success-subtle text-success',
      released: 'bg-info-subtle text-info',
    }
    const label: Record<string, string> = {
      none: 'No paper',
      pending: 'Pending approval',
      approved: 'Approved',
      released: 'Released to students',
    }
    const s = paper?.status ?? 'none'
    return <span className={`badge ${map[s]}`}>{label[s]}</span>
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          Question Paper {statusBadge()}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && <p>Loading…</p>}
        {error && <p className="text-danger-600 text-sm">{error}</p>}

        {!loading && !error && paper && (
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div className="text-sm text-secondary-light">
                {paper.title}
                {paper.topic ? ` — ${paper.topic.name}` : ''} · {paper.questions.length}{' '}
                question(s) · {totalMarks}/{paper.total_marks} marks
              </div>
              <div className="d-flex gap-2">
                {!readOnly && (
                  <Button variant="outline-primary" size="sm" onClick={() => setShowAdd((v) => !v)}>
                    {showAdd ? 'Close' : 'Add questions'}
                  </Button>
                )}
                {paper.status === 'pending' && (
                  <Button variant="success" size="sm" disabled={busy} onClick={() => setApproval(true)}>
                    Approve paper
                  </Button>
                )}
                {paper.status === 'approved' && (
                  <Button variant="outline-secondary" size="sm" disabled={busy} onClick={() => setApproval(false)}>
                    Un-approve
                  </Button>
                )}
              </div>
            </div>

            {readOnly && (
              <div className="alert alert-info py-2 px-3 text-sm">
                Results are in — this paper is now visible to students and can no longer be edited.
              </div>
            )}

            {showAdd && (
              <div className="border rounded p-2 mb-3 bg-neutral-50">
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <input
                    className="form-control form-control-sm"
                    style={{ maxWidth: 240 }}
                    placeholder="Search question text…"
                    value={availQuery}
                    onChange={(e) => setAvailQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAvailable()}
                  />
                  <select
                    className="form-select form-select-sm"
                    style={{ maxWidth: 140 }}
                    value={availDifficulty}
                    onChange={(e) => setAvailDifficulty(e.target.value)}
                  >
                    <option value="">Any difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <Button variant="outline-secondary" size="sm" onClick={fetchAvailable}>
                    Search
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={busy || selected.size === 0}
                    onClick={addSelected}
                  >
                    Add {selected.size > 0 ? `(${selected.size})` : ''}
                  </Button>
                </div>
                {availLoading ? (
                  <p className="text-sm mb-0">Loading…</p>
                ) : available.length === 0 ? (
                  <p className="text-sm text-muted mb-0">No more questions available for this topic.</p>
                ) : (
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {available.map((q) => (
                      <label
                        key={q.id}
                        className="d-flex gap-2 align-items-start py-1 border-bottom"
                        style={{ cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          className="form-check-input mt-1"
                          checked={selected.has(q.id)}
                          onChange={(e) => {
                            setSelected((prev) => {
                              const next = new Set(prev)
                              e.target.checked ? next.add(q.id) : next.delete(q.id)
                              return next
                            })
                          }}
                        />
                        <div className="flex-grow-1">
                          <QuestionBody q={q} />
                          {q.difficulty && (
                            <span className="badge bg-secondary-subtle text-secondary text-xs mt-1">
                              {q.difficulty}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {paper.questions.length === 0 ? (
              <p className="text-muted text-sm">
                No questions on this paper yet. Use “Add questions” to build it.
              </p>
            ) : (
              <ol className="ps-3">
                {paper.questions.map((q) => (
                  <li key={q.id} className="mb-3">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div className="flex-grow-1">
                        <QuestionBody q={q} />
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {q.difficulty && (
                            <span className="badge bg-secondary-subtle text-secondary text-xs">
                              {q.difficulty}
                            </span>
                          )}
                          <span className="text-xs text-secondary-light">
                            Marks:
                          </span>
                          <input
                            type="number"
                            min={1}
                            className="form-control form-control-sm"
                            style={{ width: 70 }}
                            disabled={readOnly}
                            value={marksDraft[q.id] ?? ''}
                            onChange={(e) =>
                              setMarksDraft((d) => ({ ...d, [q.id]: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-danger p-0"
                          disabled={busy}
                          onClick={() => removeQuestion(q.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {paper && paper.questions.length > 0 && (
          <Button variant="outline-dark" onClick={printPaper} disabled={busy}>
            Print / Download PDF
          </Button>
        )}
        {paper && !readOnly && paper.questions.length > 0 && (
          <Button variant="primary" onClick={saveMarks} disabled={busy}>
            Save marks
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
