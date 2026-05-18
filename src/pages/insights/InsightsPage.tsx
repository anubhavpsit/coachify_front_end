import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Button } from 'react-bootstrap'

type SubjectItem = {
  subject_id: number
  subject: string
  activity_count: number
  days_count: number
  share: number
  series: number[]
  dates: string[]
}

type SubjectsResp = {
  from: string
  to: string
  window_days: number
  items: SubjectItem[]
  focus: { overfocus: boolean; underfocus: boolean; notes: string[] }
}

type ChapterItem = { chapter: string; activity_count: number }

type WindowOption = { label: string; days: number | null }

const WINDOW_OPTIONS: WindowOption[] = [
  { label: 'Today', days: 1 },
  { label: '3d', days: 3 },
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: 'All', days: null },
]

export default function InsightsPage() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'
  const [windowDays, setWindowDays] = useState<number | null>(7)
  const [loading, setLoading] = useState(false)
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [focusNotes, setFocusNotes] = useState<string[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null)
  const [chapters, setChapters] = useState<ChapterItem[]>([])

  const token = localStorage.getItem('authToken')

  const buildParams = (days: number | null) => {
    if (days === null) return { all: 'true' }
    return { window_days: days }
  }

  const loadSubjects = async (days: number | null = windowDays) => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/insights/activities/subjects`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: buildParams(days),
      })
      if (res.data?.success) {
        const d: SubjectsResp = res.data.data
        setSubjects(d.items)
        setFocusNotes(d.focus?.notes || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadChapters = async (sid: number) => {
    setSelectedSubjectId(sid)
    try {
      const res = await axios.get(`${API_BASE_URL}/insights/activities/chapters`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        params: { ...buildParams(windowDays), subject_id: sid },
      })
      if (res.data?.success) {
        setChapters(res.data.data.items || [])
      }
    } catch {
      // noop
    }
  }

  useEffect(() => { loadSubjects(windowDays) }, [windowDays])

  const total = useMemo(() => subjects.reduce((s, i) => s + i.activity_count, 0), [subjects])

  const windowLabel = windowDays === null
    ? 'all time'
    : windowDays === 1
    ? 'today'
    : `last ${windowDays} days`

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-24">
        <h6 className="fw-semibold mb-0">Insights ({windowLabel})</h6>
        <div className="d-flex align-items-center gap-2">
          {WINDOW_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              size="sm"
              variant={windowDays === opt.days ? 'primary' : 'outline-primary'}
              onClick={() => setWindowDays(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
          <Button size="sm" variant="outline-secondary" onClick={() => loadSubjects(windowDays)}>Refresh</Button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <span className="text-md fw-medium text-secondary-light">Subject Coverage</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-6"><span className="spinner-border spinner-border-sm"></span><span className="ms-2">Loading...</span></div>
              ) : subjects.length === 0 ? (
                <p className="text-muted">No activity in this window.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table bordered-table mb-0">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th className="text-end">Count</th>
                        <th className="text-end">Share</th>
                        <th className="text-center">Chapters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((s) => (
                        <tr key={s.subject_id}>
                          <td>{s.subject}</td>
                          <td className="text-end">{s.activity_count}</td>
                          <td className="text-end">{total>0 ? Math.round((s.activity_count/total)*100):0}%</td>
                          <td className="text-center">
                            <Button variant="link" onClick={()=> loadChapters(s.subject_id)}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {focusNotes.length>0 && (
                <div className="alert alert-warning mt-3">
                  {focusNotes.map((n,i)=> <div key={i}>{n}</div>)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <span className="text-md fw-medium text-secondary-light">Chapters {selectedSubjectId? '' : '(select subject)'} </span>
            </div>
            <div className="card-body">
              {selectedSubjectId === null ? (
                <p className="text-muted">Choose a subject to see chapters.</p>
              ) : chapters.length === 0 ? (
                <p className="text-muted">No chapter activity in this window.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table bordered-table mb-0">
                    <thead>
                      <tr>
                        <th>Chapter</th>
                        <th className="text-end">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chapters.map((c, idx) => (
                        <tr key={idx}>
                          <td>{c.chapter}</td>
                          <td className="text-end">{c.activity_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
