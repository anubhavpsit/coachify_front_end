import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from 'react-bootstrap'

interface ExpenseUser {
  id: number
  name: string
  email: string
  role: string
  tenant_id: number | null
}

interface Expense {
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

function getCurrentMonthValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function getMonthDateRange(monthValue: string) {
  if (!monthValue) {
    return { from: undefined, to: undefined }
  }

  const [yearStr, monthStr] = monthValue.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  const from = `${monthValue}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${monthValue}-${String(lastDay).padStart(2, '0')}`

  return { from, to }
}

export default function ExpensesComponent() {
  const [users, setUsers] = useState<ExpenseUser[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('')

  const [filterMonth, setFilterMonth] = useState<string>(getCurrentMonthValue())

  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [saving, setSaving] = useState(false)

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const token = sessionStorage.getItem('authToken')
        const response = await axios.get(
          `${API_BASE_URL}/expenses/users`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          },
        )

        if (response.data.success) {
          setUsers(response.data.data || [])
        }
      } catch (error) {
        console.error('Error fetching users for expenses:', error)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [API_BASE_URL])

  useEffect(() => {
    const fetchExpenses = async () => {
      setLoadingExpenses(true)
      try {
        const token = sessionStorage.getItem('authToken')
        const { from, to } = getMonthDateRange(filterMonth)

        let url = `${API_BASE_URL}/expenses`
        const params: string[] = []
        if (from) params.push(`from_date=${from}`)
        if (to) params.push(`to_date=${to}`)
        if (params.length) {
          url += `?${params.join('&')}`
        }

        const response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (response.data.success) {
          setExpenses(response.data.data || [])
        }
      } catch (error) {
        console.error('Error fetching expenses:', error)
      } finally {
        setLoadingExpenses(false)
      }
    }

    fetchExpenses()
  }, [API_BASE_URL, filterMonth])

  const handleSaveExpense = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!amount || !expenseDate || !selectedUserId) {
      alert('Please fill all required fields.')
      return
    }

    setSaving(true)
    try {
      const token = sessionStorage.getItem('authToken')
      const payload = {
        amount: Number(amount),
        expense_date: expenseDate,
        description: description || null,
        note: note || null,
        expense_by: Number(selectedUserId),
      }

      const response = await axios.post(
        `${API_BASE_URL}/expenses`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      )

      if (response.data.success) {
        setAmount('')
        setExpenseDate('')
        setDescription('')
        setNote('')
        setSelectedUserId('')

        const createdExpense: Expense = response.data.data
        setExpenses((previous) => [createdExpense, ...previous])
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Failed to save expense.')
    } finally {
      setSaving(false)
    }
  }

  const selectedUser =
    selectedUserId !== ''
      ? users.find((user) => user.id === Number(selectedUserId))
      : undefined

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">Operational Expenses</h6>
      </div>

      <div className="card mb-24">
        <div className="card-header border-bottom bg-base py-16 px-24">
          <span className="text-md fw-medium text-secondary-light">
            Add Monthly Operational Expense
          </span>
        </div>
        <div className="card-body">
          <form onSubmit={handleSaveExpense} className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Expense Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Expense Date</label>
              <input
                type="date"
                className="form-control"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">Expense By</label>
              <select
                className="form-select"
                value={selectedUserId}
                onChange={(event) =>
                  setSelectedUserId(
                    event.target.value ? Number(event.target.value) : '',
                  )
                }
                disabled={loadingUsers || saving}
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">Expense Description</label>
              <input
                type="text"
                className="form-control"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold">Note</label>
              <textarea
                className="form-control"
                rows={1}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={saving}
              />
            </div>

            <div className="col-md-4 d-flex align-items-end">
              <Button
                type="submit"
                variant="primary"
                disabled={saving || loadingUsers}
                className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </form>

          {selectedUser && (
            <div className="mt-4 p-3 border rounded bg-light">
              <h6 className="fw-semibold mb-2">Selected User Details</h6>
              <p className="mb-1">
                <strong>Name:</strong> {selectedUser.name}
              </p>
              <p className="mb-1">
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p className="mb-0">
                <strong>Role:</strong> {selectedUser.role}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
          <span className="text-md fw-medium text-secondary-light">
            Expenses (Month-wise)
          </span>
          <div className="d-flex align-items-center gap-2">
            <input
              type="month"
              className="form-control"
              value={filterMonth}
              onChange={(event) => setFilterMonth(event.target.value)}
            />
          </div>
        </div>
        <div className="card-body">
          {loadingExpenses ? (
            <div className="text-center py-6">
              <span className="spinner-border spinner-border-sm" />
              <span className="ms-2">Loading expenses...</span>
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-muted">
              No expenses found for this period.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table bordered-table mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Expense By</th>
                    <th>Note</th>
                    <th>Recorded On</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.expense_date}</td>
                      <td>{expense.amount}</td>
                      <td>{expense.description || '-'}</td>
                      <td>{expense.user?.name || '-'}</td>
                      <td>{expense.note || '-'}</td>
                      <td>
                        {new Date(expense.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

