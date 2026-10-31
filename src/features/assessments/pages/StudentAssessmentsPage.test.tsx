import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import { stripHtml } from '../components/QuestionBody'
import StudentAssessmentsPage from './StudentAssessmentsPage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const upcoming = [{ id: 1, scheduled_date: '2026-10-03', status: 'upcoming', assessment: { id: 7, title: 'Unit Test 1', total_marks: 50, subject: { id: 5, subject: 'Maths' }, teacher: { id: 2, name: 'Meera' } } }]
const history = [
  {
    id: 2,
    scheduled_date: '2026-09-20',
    status: 'completed',
    attempted_at: '2026-09-20',
    assessment: { id: 8, title: 'Cells quiz', total_marks: 20, question_paper_released_at: '2026-09-22', subject: { id: 6, subject: 'Science' } },
    result: { marks_obtained: 18, total_marks: 20, percentage: 90, teacher_notes: 'Excellent' },
  },
]

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })
    if (url.endsWith('/student/assessments/upcoming')) return ok(upcoming)
    if (url.endsWith('/student/assessments/history')) return ok(history)
    if (url.endsWith('/files')) return ok({ question_papers: [{ id: 1, type: 'question_paper', path: 'qp/8.pdf', original_name: 'paper.pdf' }], answer_sheets: [{ id: 2, type: 'answer_sheet', path: 'as/8.pdf', original_name: 'mine.pdf' }] })
    if (url.endsWith('/question-paper')) return ok({ total_marks: 20, questions: [{ id: 1, marks: 5, question_html: '<p>Name the powerhouse of the cell.</p>', option_a: 'Nucleus', option_b: 'Mitochondria' }] })
    return ok([])
  })
}

const renderAt = (url = '/students/assessments') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <StudentAssessmentsPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T10:00:00') })
})
afterEach(() => vi.useRealTimers())

describe('StudentAssessmentsPage', () => {
  it('loads upcoming + history with the legacy requests', async () => {
    const get = mockGets()
    renderAt()
    expect(await screen.findByText('Unit Test 1')).toBeTruthy()
    expect(screen.getByText('Tomorrow')).toBeTruthy()
    expect(screen.getByText('18/20 · 90.00%')).toBeTruthy()
    expect(screen.getByText('Excellent')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student\/assessments\/upcoming$/), auth)
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student\/assessments\/history$/), auth)
  })

  it('shows question papers and answer sheets for a completed one on demand', async () => {
    mockGets()
    renderAt()
    const item = (await screen.findByText('Cells quiz')).closest('li')!
    await userEvent.click(within(item).getByRole('button', { name: /Show files/ }))
    expect((await within(item).findByRole('link', { name: /mine.pdf/ })).getAttribute('href')).toMatch(/\/as\/8\.pdf$/)
  })

  it('a test whose date passed with no result shows as waiting, not upcoming', async () => {
    const get = mockGets()
    const base = get.getMockImplementation()!
    get.mockImplementation((url: string, ...rest: unknown[]) =>
      url.endsWith('/student/assessments/upcoming')
        ? Promise.resolve({ data: { success: true, data: [...upcoming, { ...upcoming[0], id: 3, scheduled_date: '2026-09-28', stage: 'awaiting_results', assessment: { ...upcoming[0].assessment, id: 9, title: 'Algebra test' } }] } })
        : (base as (u: string, ...r: unknown[]) => ReturnType<typeof axios.get>)(url, ...rest),
    )
    renderAt()
    const title = await screen.findByText('Waiting for result')
    const card = title.closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getByText('Algebra test')).toBeTruthy()
    expect(within(card).queryByText('Unit Test 1')).toBeNull()
    expect(screen.getByText('Unit Test 1')).toBeTruthy()
  })

  it('opens the released question paper', async () => {
    mockGets()
    renderAt()
    await userEvent.click(await screen.findByRole('button', { name: /View question paper/ }))
    const d = await screen.findByRole('dialog')
    expect(await within(d).findByText('Name the powerhouse of the cell.')).toBeTruthy()
    expect(within(d).getByText('(b) Mitochondria')).toBeTruthy()
  })

  it('deep link loads that upcoming assessment’s files', async () => {
    const get = mockGets()
    renderAt('/students/assessments?assessment=7')
    await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student\/assessments\/7\/files$/), auth))
  })
})

describe('stripHtml', () => {
  it('sanitises before parsing so option HTML cannot run script', () => {
    const spy = vi.fn()
    ;(window as unknown as { __xss: () => void }).__xss = spy
    expect(stripHtml('<img src=x onerror="window.__xss()">Mitochondria')).toBe('Mitochondria')
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('StudentAssessmentsPage — calendar & absent', () => {
  it('missed tests show as Absent; the calendar lists results and absences by day', async () => {
    const absent = { id: 3, scheduled_date: '2026-09-25', status: 'missed', stage: 'absent', attempted_at: null, assessment: { id: 9, title: 'Waves quiz', total_marks: 20, subject: { id: 6, subject: 'Science' } }, result: null }
    vi.spyOn(axios, 'get').mockImplementation((url: string) => {
      const ok = (data: unknown) => Promise.resolve({ data: { success: true, data } })
      if (url.endsWith('/student/assessments/upcoming')) return ok([])
      if (url.endsWith('/student/assessments/history')) return ok([...history, absent])
      return ok([])
    })
    renderAt()
    expect(await screen.findByText('Waves quiz')).toBeTruthy()
    expect(screen.getAllByText('Absent').length).toBeGreaterThan(0) // badge + ring
    expect(screen.getByText('· 1 missed')).toBeTruthy()

    await userEvent.click(screen.getByRole('tab', { name: 'Calendar' }))
    // go back to September 2026 and pick the 25th
    const prev = screen.getByRole('button', { name: 'Previous month' })
    const target = new Date(2026, 8, 1)
    const now = new Date()
    for (let i = 0; i < (now.getFullYear() - target.getFullYear()) * 12 + now.getMonth() - target.getMonth(); i++) await userEvent.click(prev)
    await userEvent.click(screen.getByRole('gridcell', { name: /25\/09\/2026: 1 test/ }))
    const panel = await screen.findByRole('region', { name: 'Tests on 25/09/2026' })
    expect(within(panel).getByText('Waves quiz')).toBeTruthy()
    expect(within(panel).getByText('Absent')).toBeTruthy()
  })
})

