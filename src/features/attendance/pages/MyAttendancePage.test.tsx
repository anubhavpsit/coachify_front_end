import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import MyAttendancePage from './MyAttendancePage'

const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }

beforeEach(() => {
  vi.restoreAllMocks()
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-20T10:00:00') })
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 3, name: 'S', email: 's@x', role: 'student', tenant_id: 4, permissions: [] }))
})
afterEach(() => vi.useRealTimers())

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.includes('/my/attendance?')) return Promise.resolve({ data: { data: [
      { user_id: 3, role: 'student', attendance_date: '2026-09-01T00:00:00Z', status: 'present' },
      { user_id: 3, role: 'student', attendance_date: '2026-09-02', status: 'absent' },
      { user_id: 3, role: 'student', attendance_date: '2026-09-03', status: 'leave' },
    ] } })
    if (url.includes('/attendance-corrections/mine')) return Promise.resolve({ data: { data: [
      { id: 1, attendance_date: '2026-09-03', current_status: 'leave', requested_status: 'present', reason: 'Was in class', status: 'pending', created_at: '' },
    ] } })
    if (url.includes('/admin/holidays')) return Promise.resolve({ data: { data: [] } })
    return Promise.resolve({ data: { data: { attendance_percentage: 50, created_at: '2026-08-01' } } })
  })
}

describe('MyAttendancePage', () => {
  it('requests the month with the legacy URLs and lists only correctable days', async () => {
    const get = mockGets()
    render(<MyAttendancePage />)
    expect(await screen.findByText('Was in class')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/my\/attendance\?month=9&year=2026$/), opts)
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/holidays\?from=2026-09-01&to=2026-09-30$/), opts)
    const rows = screen.getAllByRole('button', { name: 'Request Correction' })
    expect(rows).toHaveLength(1) // 02 absent; 03 already requested; 01 present
  })

  it('reason must be at least 5 characters; then posts the legacy body', async () => {
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })
    render(<MyAttendancePage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Request Correction' }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByLabelText(/^Reason/), 'sick')
    await userEvent.click(within(d).getByRole('button', { name: 'Submit Request' }))
    expect(await within(d).findByText('Reason must be at least 5 characters.')).toBeTruthy()
    await userEvent.type(within(d).getByLabelText(/^Reason/), ' leave')
    await userEvent.click(within(d).getByRole('button', { name: 'Submit Request' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ attendance_date: '2026-09-02', requested_status: 'present', reason: 'sick leave' })
  })
})
