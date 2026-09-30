import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { expensesUrl, monthRange } from '../services/expensesService'
import ExpensesPage from './ExpensesPage'

const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
})

describe('expenses query', () => {
  it('month range + legacy query string', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(expensesUrl('2026-09', 5)).toMatch(/\/expenses\?from_date=2026-09-01&to_date=2026-09-30&user_id=5$/)
  })
})

describe('ExpensesPage', () => {
  it('validates, then posts the legacy body and prepends the row', async () => {
    const get = vi.spyOn(axios, 'get').mockImplementation((url: string) =>
      Promise.resolve(url.endsWith('/expenses/users')
        ? { data: { success: true, data: [{ id: 3, name: 'Ravi', email: 'r@x.in', role: 'staff', tenant_id: 4 }] } }
        : { data: { success: true, data: [] } }),
    )
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { id: 50, tenant_id: 4, user_id: 3, amount: '1200.50', expense_date: '2026-09-10', description: 'Electricity', note: null, created_at: '2026-09-10T00:00:00Z', user: { id: 3, name: 'Ravi' } } } })
    render(<ExpensesPage />)
    expect(await screen.findByText('No expenses found for this period.')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/expenses\?from_date=\d{4}-\d{2}-01&to_date=/), opts)

    await userEvent.click(screen.getByRole('button', { name: 'Save Expense' }))
    expect(await screen.findByText('Amount is required.')).toBeTruthy()
    expect(screen.getByText('Select who made the expense.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(/Expense Amount/), '1200.50')
    await userEvent.type(screen.getByLabelText(/Expense Date/), '2026-09-10')
    await userEvent.selectOptions(screen.getByLabelText(/Expense By/), '3')
    await userEvent.type(screen.getByLabelText(/Expense Description/), 'Electricity')
    await userEvent.click(screen.getByRole('button', { name: 'Save Expense' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ amount: 1200.5, expense_date: '2026-09-10', description: 'Electricity', note: null, expense_by: 3 })
    expect(await screen.findByRole('cell', { name: 'Electricity' })).toBeTruthy()
  })
})
