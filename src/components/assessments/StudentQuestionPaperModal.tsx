import { useEffect, useState } from 'react'
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
}

interface Props {
  show: boolean
  assessmentId: number | null
  title?: string
  onHide: () => void
}

function stripHtml(html?: string | null): string {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || el.innerText || '').trim()
}

export default function StudentQuestionPaperModal({
  show,
  assessmentId,
  title,
  onHide,
}: Props) {
  const token = localStorage.getItem('authToken')
  const [questions, setQuestions] = useState<PaperQuestion[]>([])
  const [totalMarks, setTotalMarks] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!show || !assessmentId) return
    setLoading(true)
    setError(null)
    axios
      .get(`${API_BASE_URL}/student/assessments/${assessmentId}/question-paper`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      .then((res) => {
        setQuestions(res.data.data.questions || [])
        setTotalMarks(res.data.data.total_marks ?? null)
      })
      .catch((err) => {
        setError(
          axios.isAxiosError(err) && err.response?.data?.message
            ? (err.response.data.message as string)
            : 'Failed to load the question paper.',
        )
      })
      .finally(() => setLoading(false))
  }, [show, assessmentId, token])

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>Question Paper{title ? ` — ${title}` : ''}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && <p>Loading…</p>}
        {error && <p className="text-danger-600 text-sm">{error}</p>}
        {!loading && !error && (
          <>
            {totalMarks !== null && (
              <div className="text-sm text-secondary-light mb-2">
                {questions.length} question(s) · {totalMarks} marks
              </div>
            )}
            <ol className="ps-3">
              {questions.map((q) => {
                const opts = [
                  ['a', q.option_a],
                  ['b', q.option_b],
                  ['c', q.option_c],
                  ['d', q.option_d],
                ].filter(([, v]) => !!v)
                return (
                  <li key={q.id} className="mb-3">
                    <div className="d-flex justify-content-between gap-2">
                      <div
                        className="text-sm"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(q.question_html || ''),
                        }}
                      />
                      <span className="text-xs text-secondary-light flex-shrink-0">
                        [{q.marks ?? '—'}]
                      </span>
                    </div>
                    {opts.length > 0 && (
                      <ul className="list-unstyled mb-0 mt-1 ms-2">
                        {opts.map(([label, v]) => (
                          <li key={label} className="text-xs text-secondary-light">
                            ({label}) {stripHtml(String(v))}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
