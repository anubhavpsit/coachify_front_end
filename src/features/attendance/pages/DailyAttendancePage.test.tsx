import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import DailyAttendancePage from './DailyAttendancePage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const users = [
  { id: 1, name: 'Aarav Mehta', email: 'a@x', role: 'student' },
  { id: 2, name: 'Meera Iyer', email: 'm@x', role: 'teacher' },
]

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 9, name: 'A', email: 'a@x', role, tenant_id: 4, permissions }))
}

function mockGets(holiday = false) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.endsWith('/markable-users')) return Promise.resolve({ data: { data: users } })
    if (url.includes('/attendances?date=')) return Promise.resolve({ data: { data: [{ id: 77, user_id: 1, role: 'student', attendance_date: '2026-09-30', status: 'present' }] } })
    return Promise.resolve({ data: { data: holiday ? [{ name: 'Diwali' }] : [] } })
  })
}

const renderAt = () => render(<MemoryRouter initialEntries={['/dashboard/attendance?date=2026-09-30']}><DailyAttendancePage /></MemoryRouter>)

beforeEach(() => vi.restoreAllMocks())

describe('DailyAttendancePage', () => {
  it('loads the ?date= day with the legacy requests; holiday toggle hidden for staff', async () => {
    login('staff', ['attendance.mark'])
    const get = mockGets()
    renderAt()
    expect(await screen.findByText('Meera Iyer')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/attendances\?date=2026-09-30$/), auth)
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/holidays\?date=2026-09-30$/), auth)
    expect(screen.queryByRole('button', { name: /Mark Holiday/ })).toBeNull()
    expect(screen.getByText('Present: 1')).toBeTruthy()
    expect(screen.getByText('Not Marked: 1')).toBeTruthy()
  })

  it('marks, then saves one POST per record (legacy)', async () => {
    login('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })
    renderAt()
    const row = (await screen.findByText('Meera Iyer')).closest('tr')!
    await userEvent.click(within(row).getByRole('radio', { name: 'Absent' }))
    expect(screen.getByText('Unsaved changes')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Save Attendance/ }))
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/attendances$/), { id: 77, user_id: 1, role: 'student', attendance_date: '2026-09-30', status: 'present' }, auth)
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/attendances$/), { user_id: 2, role: 'teacher', attendance_date: '2026-09-30', status: 'absent' }, auth)
  })

  it('mark-all and holiday lock', async () => {
    login('coaching_admin')
    mockGets(true)
    renderAt()
    expect(await screen.findByText(/Attendance not required for/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Holiday \(No Attendance\)/ })).toHaveProperty('disabled', true)
    expect(screen.getAllByRole('radio').every((r) => (r as HTMLInputElement).disabled)).toBe(true)
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: {} })
    await userEvent.click(screen.getByRole('button', { name: /Unmark Holiday/ }))
    expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/holidays$/), { ...auth, data: { date: '2026-09-30' } })
    await userEvent.click(await screen.findByRole('button', { name: 'Present', pressed: false }))
    expect(screen.getByText('Present: 2')).toBeTruthy()
  })
})
