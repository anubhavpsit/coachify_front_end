import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import type { PendingAction } from '../services/widgetsService'
import PendingActionsCard from './PendingActionsCard'
import TeacherActivityGapsCard from './TeacherActivityGapsCard'
import { EMPTY_FILTERS, buildFilterOptions, filterPendingActions, isNotifiable } from './pendingActionsFilters'

const A: PendingAction[] = [
  { type: 'attendance_missing', date: '2026-09-29', title: 'Mark attendance', description: 'Today', action_route: '/dashboard/attendance' },
  { type: 'assessment_overdue', title: 'Overdue test', description: 'Maths', for_teacher_id: 7, for_teacher_name: 'Ms Rao', subject_name: 'Maths' },
  { type: 'subject_gap', title: 'Gap', description: 'Science', for_teacher_id: 8, student_id: 3, student_name: 'Ravi' },
]

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 1, permissions }))
}

beforeEach(() => vi.restoreAllMocks())

describe('pending action filters (legacy logic)', () => {
  it('filters by type, date and role/user', () => {
    expect(filterPendingActions(A, { ...EMPTY_FILTERS, type: 'subject_gap' })).toEqual([A[2]])
    // a date filter drops undated actions
    expect(filterPendingActions(A, { ...EMPTY_FILTERS, date: '2026-09-29' })).toEqual([A[0]])
    expect(filterPendingActions(A, { ...EMPTY_FILTERS, role: 'teacher' })).toEqual([A[1], A[2]])
    expect(filterPendingActions(A, { ...EMPTY_FILTERS, role: 'teacher', userId: '8' })).toEqual([A[2]])
    expect(filterPendingActions(A, { ...EMPTY_FILTERS, role: 'student' })).toEqual([A[2]])
  })
  it('builds options', () => {
    const o = buildFilterOptions(A)
    expect(o.types).toHaveLength(3)
    expect(o.teachers).toEqual([{ id: 7, name: 'Ms Rao' }, { id: 8, name: 'Teacher #8' }])
    expect(o.students).toEqual([{ id: 3, name: 'Ravi' }])
  })
  it('notifiable only with permission + teacher + known reason', () => {
    expect(isNotifiable(A[1], true)).toBe(true)
    expect(isNotifiable(A[1], false)).toBe(false)
    expect(isNotifiable(A[0], true)).toBe(false)
  })
})

describe('PendingActionsCard', () => {
  it('hides Notify without dashboard.notify_pending_actions', async () => {
    login('staff', ['dashboard.pending_actions'])
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: A } })
    render(<MemoryRouter><PendingActionsCard /></MemoryRouter>)
    expect(await screen.findByText('Overdue test')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Notify/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Open/ })).toBeTruthy()
  })

  it('notifies with the legacy payload', async () => {
    login('staff', ['dashboard.pending_actions', 'dashboard.notify_pending_actions'])
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: A } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, message: 'Reminder sent to Ms Rao.' } })
    render(<MemoryRouter><PendingActionsCard /></MemoryRouter>)
    await userEvent.click(await screen.findByTitle('Notify Ms Rao'))
    expect(post).toHaveBeenCalledWith(
      expect.stringMatching(/\/dashboard\/pending-actions\/notify$/),
      { teacher_id: 7, reason: 'assessment_overdue', student_name: undefined, subject_name: 'Maths' },
      { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } },
    )
    expect(await screen.findByText('Reminder sent to Ms Rao.')).toBeTruthy()
    expect(screen.getByTitle('Notify Ms Rao')).toHaveProperty('disabled', true)
  })
})

describe('TeacherActivityGapsCard', () => {
  const gaps = { from: '2026-09-01', to: '2026-09-30', teachers: [{ teacher_id: 7, teacher_name: 'Ms Rao', missing_dates: ['2026-09-02'], missing_days_count: 1 }] }

  it('notify button requires dashboard.notify_activity_gaps', async () => {
    login('staff', ['dashboard.activity_gaps'])
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: gaps } })
    render(<TeacherActivityGapsCard />)
    expect(await screen.findByText('Ms Rao')).toBeTruthy()
    expect(screen.queryByTitle('Notify Ms Rao')).toBeNull()
  })

  it('shows the API error message on a failed reminder', async () => {
    login('coaching_admin')
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: gaps } })
    const err = Object.assign(new Error('x'), { isAxiosError: true, response: { data: { message: 'Already reminded today.' } } })
    vi.spyOn(axios, 'post').mockRejectedValue(err)
    render(<TeacherActivityGapsCard />)
    await userEvent.click(await screen.findByTitle('Notify Ms Rao'))
    expect(await screen.findByText('Already reminded today.')).toBeTruthy()
    await waitFor(() => expect(screen.getByTitle('Notify Ms Rao').textContent).toContain('Retry'))
  })

  it('renders nothing when there are no gaps', async () => {
    login('coaching_admin')
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: { ...gaps, teachers: [] } } })
    const { container } = render(<TeacherActivityGapsCard />)
    await waitFor(() => expect(get).toHaveBeenCalled())
    await waitFor(() => expect(container.innerHTML).toBe(''))
  })
})
