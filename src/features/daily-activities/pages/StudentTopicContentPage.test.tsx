import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { formatCountdown } from '../lib/countdown'
import StudentTopicContentPage from './StudentTopicContentPage'

const headers = { Authorization: 'Bearer tok', Accept: 'application/json' }
const base = {
  topic: { id: 7, name: 'Solving for x', explanation_html: '<p>Keep both sides balanced.</p><img src=x onerror="window.__xss()">' },
  chapter_number: null,
  chapter: { id: 2, name: 'Linear Equations' },
  grade_unknown: false,
  questions: [{ id: 1, grade: 7, difficulty: 'easy', question_html: '<p>Solve 3x + 5 = 20</p>', solution_html: '<p>x = 5</p>' }],
  solutions_visible: true,
  solution_unlock_at: null,
}

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/students/activities/11/topic']}>
      <Routes>
        <Route path="/students/activities/:activityId/topic" element={<StudentTopicContentPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
})
afterEach(() => vi.useRealTimers())

describe('StudentTopicContentPage', () => {
  it('loads with the legacy request; HTML sanitised; solution behind a toggle', async () => {
    const xss = vi.fn()
    ;(window as unknown as { __xss: () => void }).__xss = xss
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: base } })
    renderAt()
    expect(await screen.findByRole('heading', { name: 'Solving for x' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student\/daily-activities\/11\/topic-content$/), { headers })
    expect(screen.getByText('Linear Equations')).toBeTruthy()
    expect(document.querySelector('img[onerror]')).toBeNull()
    expect(xss).not.toHaveBeenCalled()
    expect(screen.queryByText('x = 5')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Show solution/ }))
    expect(screen.getByText('x = 5')).toBeTruthy()
  })

  it('locked solutions show the countdown and no solution button', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T10:00:00Z') })
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { ...base, solutions_visible: false, solution_unlock_at: '2026-10-03T13:30:00Z' } } })
    renderAt()
    const alert = await screen.findByText(/Solutions unlock/)
    expect(within(alert).getByText('in 1d 3h 30m')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Show solution/ })).toBeNull()
  })

  it('shows the API message when the activity has no topic', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: false, message: 'This activity has no linked topic.' } })
    renderAt()
    expect(await screen.findByText('This activity has no linked topic.')).toBeTruthy()
  })

  it('formatCountdown keeps the legacy format', () => {
    expect(formatCountdown(0)).toBe('unlocking...')
    expect(formatCountdown(90_000)).toBe('2m')
    expect(formatCountdown((2 * 24 * 60 + 3 * 60 + 15) * 60_000)).toBe('2d 3h 15m')
  })
})
