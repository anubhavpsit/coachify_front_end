import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import PendingFeesCard from './PendingFeesCard'

const fee = { student_id: 5, student_name: 'Isha Verma', class: '2', phone: '9876543210', last_paid_to_date: null, due_date: '2026-08-01', days_overdue: 60 }

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
})

describe('PendingFeesCard', () => {
  it('lists pending fees and opens the summary', async () => {
    const get = vi.spyOn(axios, 'get').mockImplementation((url: string) => {
      if (url.includes('/classes/')) return Promise.resolve({ data: { data: [{ id: 2, name: 'Class 9' }] } })
      if (url.includes('/summary')) return Promise.resolve({ data: { success: true, data: { student: { name: 'Isha Verma' }, summary: { total_paid: 1500, days_overdue: 60 }, fees: [] } } })
      return Promise.resolve({ data: { success: true, data: [fee], meta: { today: '2026-09-30' } } })
    })
    render(<PendingFeesCard />)
    expect(await screen.findByText('Class 9')).toBeTruthy()
    expect(screen.getByText('Never')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/dashboard\/pending-fees$/), { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } })
    await userEvent.click(screen.getByRole('button', { name: 'Isha Verma' }))
    expect(await screen.findByText('₹1500.00')).toBeTruthy()
    expect(screen.getByText('No payments found.')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student-fees\/5\/summary$/), { headers: { Authorization: 'Bearer tok' } })
  })

  it('shows errors (legacy did) but hides when simply empty', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('boom'))
    render(<PendingFeesCard />)
    expect(await screen.findByText('Unable to load pending fees.')).toBeTruthy()
  })

  it('renders nothing when no one has pending fees', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [] } })
    const { container } = render(<PendingFeesCard />)
    await waitFor(() => expect(get).toHaveBeenCalled())
    await waitFor(() => expect(container.innerHTML).toBe(''))
  })
})
