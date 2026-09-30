import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import FeesPage from './FeesPage'

const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }
const fee = { id: 70, student_id: 5, tenant_id: 4, from_date: '2026-09-01', to_date: '2026-09-30', amount: '1500.00', payment_mode: 'upi', notes: null, submitted_on: '2026-09-05', created_at: '2026-09-05T00:00:00Z', student: { id: 5, name: 'Isha Verma', email: 'i@x.in', tenant_id: 4 } }

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role, tenant_id: 4, permissions }))
}

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.endsWith('/students')) return Promise.resolve({ data: { success: true, data: [{ id: 5, name: 'Isha Verma', email: 'i@x.in', tenant_id: 4 }] } })
    if (url.endsWith('/suggest-period')) return Promise.resolve({ data: { success: true, from_date: '2026-10-01', to_date: '2026-10-31' } })
    if (url.includes('/fees?limit=10')) return Promise.resolve({ data: { success: true, items: [{ id: 70, from_date: '2026-09-01', to_date: '2026-09-30', paid_at: '2026-09-05', amount: 1500, payment_mode: 'upi' }] } })
    return Promise.resolve({ data: { success: true, data: [fee], meta: { count: 1, total_amount: 1500, students_count: 1 } } })
  })
}

beforeEach(() => vi.restoreAllMocks())

describe('FeesPage', () => {
  it('Q3 preserved: staff with fees.manage has no Edit column', async () => {
    login('staff', ['fees.manage'])
    mockGets()
    render(<FeesPage />)
    expect(await screen.findByRole('cell', { name: 'Isha Verma' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit this fee entry' })).toBeNull()
  })

  it('admin: picking a student auto-fills the period; save posts the legacy body', async () => {
    login('coaching_admin')
    const get = mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    render(<FeesPage />)
    expect(await screen.findByRole('button', { name: 'Edit this fee entry' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/student-fees$/), { params: { month: expect.stringMatching(/^\d{4}-\d{2}$/) }, ...opts })

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Student' }), '5')
    expect(await screen.findByText('Auto-filled from last payment')).toBeTruthy()
    expect((screen.getByLabelText(/^From Date/) as HTMLInputElement).value).toBe('2026-10-01')
    expect(await screen.findByText(/Fees history — Isha Verma/)).toBeTruthy()

    await userEvent.type(screen.getByLabelText(/^Amount Submitted/), '1500')
    await userEvent.click(screen.getByRole('button', { name: 'Save Fee' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ student_id: 5, from_date: '2026-10-01', to_date: '2026-10-31', amount: 1500, payment_mode: 'cash', submitted_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), notes: null })
  })

  it('to date must not be before from date', async () => {
    login('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post')
    render(<FeesPage />)
    await screen.findByRole('button', { name: 'Edit this fee entry' })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Student' }), '5')
    await screen.findByText('Auto-filled from last payment')
    const to = screen.getByLabelText(/^To Date/)
    await userEvent.clear(to)
    await userEvent.type(to, '2026-09-15')
    await userEvent.type(screen.getByLabelText(/^Amount Submitted/), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Save Fee' }))
    expect(await screen.findByText('"To" date must be on or after the "From" date.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })

  it('edit dialog PUTs the same body shape', async () => {
    login('coaching_admin')
    mockGets()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true } })
    render(<FeesPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit this fee entry' }))
    const d = await screen.findByRole('dialog')
    await waitFor(() => expect((within(d).getByLabelText(/^Amount Submitted/) as HTMLInputElement).value).toBe('1500'))
    await userEvent.click(within(d).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    expect(put.mock.calls[0][0]).toMatch(/\/student-fees\/70$/)
    expect(put.mock.calls[0][1]).toEqual({ student_id: 5, from_date: '2026-09-01', to_date: '2026-09-30', amount: 1500, payment_mode: 'upi', submitted_on: '2026-09-05', notes: null })
  })
})
