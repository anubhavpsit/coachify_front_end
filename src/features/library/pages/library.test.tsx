import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import LibraryChapterDetailPage from './LibraryChapterDetailPage'
import LibraryChaptersPage from './LibraryChaptersPage'
import LibraryTopicDetailPage from './LibraryTopicDetailPage'
import LibraryTopicsPage from './LibraryTopicsPage'

const headers = { Authorization: 'Bearer tok', Accept: 'application/json' }
const subjects = [
  { id: 5, subject: 'Maths' },
  { id: 6, subject: 'Science' },
]
const question = {
  id: 1,
  tenant_id: 0,
  grade: 7,
  difficulty: 'easy',
  question_type: 'mcq',
  question_html: '<p>2 + 2 = ?</p><img src=x onerror="window.__xss()">',
  solution_html: '<p>Count on.</p>',
  option_a: '3',
  option_b: '4',
  option_c: '5',
  option_d: '6',
  correct_answer: 'b',
  answer_key: null,
  needs_image: false,
  image_note: null,
}

function mockGets(subjectList = subjects) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const ok = (d: unknown) => Promise.resolve({ data: { success: true, data: d } })
    if (url.endsWith('/teacher/subjects')) return ok(subjectList)
    if (url.endsWith('/chapters')) return ok([{ id: 2, tenant_id: 0, subject_id: 5, name: 'Linear Equations', topics_count: 3, subject: subjects[0] }])
    if (url.endsWith('/chapters/2')) return ok({ id: 2, tenant_id: 0, subject_id: 5, name: 'Linear Equations', subject: subjects[0], topics: [{ id: 7, name: 'Solving for x', grade: null }] })
    if (url.endsWith('/topics')) return ok([{ id: 7, subject_id: 5, chapter_id: 2, grade: 7, name: 'Solving for x', chapter: { id: 2, name: 'Linear Equations' } }])
    if (url.endsWith('/topics/7')) return ok({ id: 7, subject_id: 5, chapter_id: 2, grade: null, name: 'Solving for x', explanation_html: '<p>Balance both sides.</p>', chapter: { id: 2, name: 'Linear Equations' } })
    if (url.endsWith('/topics/7/questions')) return ok([question])
    return ok([])
  })
}

const at = (path: string, route: string, el: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={route} element={el} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
})

describe('Library (teacher)', () => {
  it('chapters: legacy requests, cards link to the chapter', async () => {
    const get = mockGets()
    at('/library/chapters', '/library/chapters', <LibraryChaptersPage />)
    const link = await screen.findByRole('link', { name: /Linear Equations/ })
    expect(link.getAttribute('href')).toBe('/library/chapters/2')
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/teacher\/subjects$/), { headers })
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/chapters$/), { params: undefined, headers })
    await userEvent.click(screen.getByRole('button', { name: 'Science' }))
    await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/chapters$/), { params: { subject_id: '6' }, headers }))
  })

  it('shows the legacy message when the teacher has no subjects', async () => {
    mockGets([])
    at('/library/chapters', '/library/chapters', <LibraryChaptersPage />)
    expect(await screen.findByText(/No subjects are assigned to you yet/)).toBeTruthy()
  })

  it('topics: first subject preselected (legacy) and sent with the request', async () => {
    const get = mockGets()
    at('/library/topics', '/library/topics', <LibraryTopicsPage />)
    expect(await screen.findByRole('link', { name: /Solving for x/ })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/topics$/), { params: { subject_id: '5' }, headers })
    expect(screen.getByRole('button', { name: 'Maths' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('chapter detail lists its topics', async () => {
    mockGets()
    at('/library/chapters/2', '/library/chapters/:chapterId', <LibraryChapterDetailPage />)
    expect(await screen.findByRole('heading', { name: 'Linear Equations' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Solving for x/ }).getAttribute('href')).toBe('/library/topics/7')
  })

  it('topic detail: sanitised HTML; answers only after "Show answer"', async () => {
    const xss = vi.fn()
    ;(window as unknown as { __xss: () => void }).__xss = xss
    mockGets()
    at('/library/topics/7', '/library/topics/:topicId', <LibraryTopicDetailPage />)
    expect(await screen.findByText('Balance both sides.')).toBeTruthy()
    expect(document.querySelector('img[onerror]')).toBeNull()
    expect(xss).not.toHaveBeenCalled()
    const q = screen.getByText('2 + 2 = ?').closest('li')!
    expect(within(q).queryByLabelText('Correct')).toBeNull()
    expect(within(q).queryByText('Count on.')).toBeNull()
    await userEvent.click(within(q).getByRole('button', { name: /Show answer/ }))
    expect(within(q).getByLabelText('Correct')).toBeTruthy()
    expect(within(q).getByText('Count on.')).toBeTruthy()
  })
})
