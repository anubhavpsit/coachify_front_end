import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Requests copied verbatim from the legacy ExpensesComponent.
const opts = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}`, Accept: 'application/json' } })

export type ExpenseUser = { id: number; name: string; email: string; role: string; tenant_id: number | null }
export type Expense = {
  id: number
  tenant_id: number
  user_id: number
  amount: number | string
  expense_date: string
  description?: string | null
  note?: string | null
  created_at: string
  user?: ExpenseUser
}
export type ExpensePayload = { amount: number; expense_date: string; description: string | null; note: string | null; expense_by: number }

export async function fetchExpenseUsers(): Promise<ExpenseUser[]> {
  const res = await axios.get(`${API_BASE_URL}/expenses/users`, opts())
  return res.data.success ? res.data.data || [] : []
}

export function monthRange(month: string): { from?: string; to?: string } {
  if (!month) return {}
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

/** Same hand-built query string as before (from_date, to_date, user_id). */
export function expensesUrl(month: string, userId: number | ''): string {
  const { from, to } = monthRange(month)
  const params: string[] = []
  if (from) params.push(`from_date=${from}`)
  if (to) params.push(`to_date=${to}`)
  if (userId !== '') params.push(`user_id=${userId}`)
  return `${API_BASE_URL}/expenses${params.length ? `?${params.join('&')}` : ''}`
}

export async function fetchExpenses(month: string, userId: number | ''): Promise<Expense[] | undefined> {
  const res = await axios.get(expensesUrl(month, userId), opts())
  return res.data.success ? res.data.data || [] : undefined
}

export async function createExpense(payload: ExpensePayload): Promise<Expense | null> {
  const res = await axios.post(`${API_BASE_URL}/expenses`, payload, opts())
  return res.data.success ? res.data.data : null
}
