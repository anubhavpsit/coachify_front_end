import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import StudentActivitiesPage from './StudentActivitiesPage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const rows = [
  {
    id: 11,
    activity_date: '2026-10-02',
    chapter: null,
    topic: null,
    topic_id: 7,
    chapter_model: { id: 2, name: 'Linear Equations' },
    topic_model: { id: 7, name: 'Solving for x' },
    notes: 'Ten board examples',
    homework: 'Ex 4.2 Q1-8',
    remarks: 'Good effort',
    homework_status: 'partial',
    teacher: { id: 2, name: 'Meera' },
    subject: { id: 5, subject: 'Maths' },
    attachments: [{ id: 1, original_name: 'board.jpg', path: 'p' }],
  },
  { id: 12, activity_date: '2026-10-01', chapter: 'Cells', topic: 'Plant cells', topic_id: null, notes: null, homework: null, remarks: null, homework_status: null, subject: { id: 6, subject: 'Science' } },
]

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T10:00:00') })
})
afterEach(() => vi.useRealTimers())

const renderIt = () =>
  render(
    <MemoryRouter>
      <StudentActivitiesPage />
    </MemoryRouter>,
  )

describe('StudentActivitiesPage', () => {
  it('loads with the legacy request and shows covered / homework / remarks', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: rows } })
    renderIt()
    const card = await screen.findByRole('article', { name: /Maths/ })
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student\/daily-activities$/), { ...auth, params: {} })
    expect(within(card).getByText('Linear Equations › Solving for x')).toBeTruthy()
    expect(within(card).getByText('Partial')).toBeTruthy()
    expect(within(card).getByText('Good effort')).toBeTruthy()
    expect(within(card).getByRole('link', { name: /View Explanation/ }).getAttribute('href')).toBe('/students/activities/11/topic')
    // Legacy text columns still work.
    expect(screen.getByText('Cells › Plant cells')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Today' })).toBeTruthy()
    expect(screen.getByText('1 homework task is not marked done yet.')).toBeTruthy()
  })

  it('date shortcuts send the date param; subject chips filter locally', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: rows } })
    renderIt()
    await screen.findByRole('article', { name: /Maths/ })
    await userEvent.click(screen.getByRole('button', { name: 'Yesterday' }))
    await waitFor(() => expect(get).toHaveBeenLastCalledWith(expect.stringMatching(/\/student\/daily-activities$/), { ...auth, params: { date: '2026-10-01' } }))
    await userEvent.click(await screen.findByRole('button', { name: 'Science' }))
    expect(screen.queryByRole('article', { name: /Maths/ })).toBeNull()
  })
})
