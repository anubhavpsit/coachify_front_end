import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import axios from 'axios'
import ProfilePage from './ProfilePage'

const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }

function signIn(role: string) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 3, name: 'Asha', email: 'a@x', role, tenant_id: 4, permissions: [] }))
}

function mockGets(role: string) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.endsWith('/users/3'))
      return Promise.resolve({
        data: {
          success: true,
          data: { id: 3, name: 'Asha Rao', email: 'a@x', role, created_at: '2026-01-01', attendance_percentage: 82.5, student_profile: { class: '10', subjects: [4], trial_days: 7 } },
        },
      })
    if (url.includes('/student/assessments/history')) return Promise.resolve({ data: { success: true, data: [{ id: 1, result: { percentage: 80 }, attempted_at: '2026-02-01' }] } })
    if (url.includes('/student/fees/summary'))
      return Promise.resolve({ data: { success: true, data: { next_due_date: '2026-10-01', is_overdue: true, days_overdue: 2, last_paid_at: null, last_paid_amount: null } } })
    if (url.includes('/student/fees?limit=10'))
      return Promise.resolve({ data: { success: true, items: [{ id: 9, from_date: '2026-08-01', to_date: '2026-08-31', paid_at: '2026-08-02', amount: 1500, payment_mode: 'upi' }] } })
    if (url.includes('/students/3/subjects')) return Promise.resolve({ data: { data: [{ id: 4, subject: 'Physics' }] } })
    return Promise.reject(new Error(`unexpected ${url}`))
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('ProfilePage', () => {
  it('student: legacy requests, subjects, performance and fees sections', async () => {
    signIn('student')
    const get = mockGets('student')
    render(<ProfilePage />)
    expect(await screen.findByText('Asha Rao')).toBeTruthy()
    expect(await screen.findByText('Physics')).toBeTruthy()
    expect(await screen.findByText('Overdue')).toBeTruthy()
    expect(screen.getByText('Performance')).toBeTruthy()
    expect(screen.getByText('7 day(s)')).toBeTruthy()
    const row = screen.getByRole('row', { name: /UPI/ })
    expect(within(row).getByText('₹1500.00')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/users\/3$/), opts)
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student\/assessments\/history$/), { headers: { Authorization: 'Bearer tok' } })
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student\/fees\/summary$/), opts)
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/students\/3\/subjects$/), opts)
  })

  it('non-student: only profile + attendance, no student requests', async () => {
    signIn('teacher')
    const get = mockGets('teacher')
    render(<ProfilePage />)
    expect(await screen.findByText('Asha Rao')).toBeTruthy()
    expect(screen.getByText('Overall attendance since joining.')).toBeTruthy()
    expect(screen.queryByText('Performance')).toBeNull()
    expect(screen.queryByText('Fees')).toBeNull()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('shows the legacy message when signed out', () => {
    render(<ProfilePage />)
    expect(screen.getByText('You are not authenticated.')).toBeTruthy()
  })

  it('shows the legacy message when the profile fails', async () => {
    signIn('teacher')
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('x'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ProfilePage />)
    expect(await screen.findByText('Unable to load profile.')).toBeTruthy()
  })
})
