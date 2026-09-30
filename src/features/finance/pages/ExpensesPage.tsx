import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { m } from 'motion/react'
import { CircleAlert, Hash, IndianRupee, ReceiptIndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import { stagger } from '@/animations'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import PageHeader from '@/components/common/PageHeader'
import StatCard from '@/components/common/StatCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { formatCurrency } from '@/lib/formatters'
import { formatDate } from '@/utils/date'
import { expenseDefaults, expenseSchema, toExpensePayload, type ExpenseValues } from '../schemas/expenseForm'
import { createExpense, fetchExpenseUsers, fetchExpenses, type Expense } from '../services/expensesService'

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Route gate: expenses.view | expenses.manage. No in-page gates, as before (Q13). */
export default function ExpensesPage() {
  const users = useAsync(() => fetchExpenseUsers().catch((e) => (console.error('Error fetching users for expenses:', e), [])), [])
  const [month, setMonth] = useState(currentMonth())
  const [userFilter, setUserFilter] = useState<number | ''>('')
  const [added, setAdded] = useState<Expense[]>([])
  const list = useAsync(
    () =>
      fetchExpenses(month, userFilter).catch((e) => {
        console.error('Error fetching expenses:', e)
        return undefined
      }),
    [month, userFilter],
  )
  // New entries are shown on top of whatever the current filter returned (legacy behaviour).
  const expenses = useMemo(() => [...added.filter((a) => !(list.data ?? []).some((e) => e.id === a.id)), ...(list.data ?? [])], [added, list.data])
  const [filterKey, setFilterKey] = useState(`${month}|${userFilter}`)
  if (filterKey !== `${month}|${userFilter}`) {
    setFilterKey(`${month}|${userFilter}`)
    setAdded([])
  }

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  const form = useForm<ExpenseValues>({ resolver: zodResolver(expenseSchema), defaultValues: expenseDefaults(), mode: 'onTouched' })
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedId] = useWatch({ control: form.control, name: ['expense_by'] })
  const selectedUser = (users.data ?? []).find((u) => u.id === Number(selectedId))

  const submit = async (values: ExpenseValues) => {
    setFormError(null)
    try {
      const created = await createExpense(toExpensePayload(values))
      if (!created) return
      setAdded((prev) => [created, ...prev])
      form.reset(expenseDefaults())
      toast.success(`Expense of ${formatCurrency(Number(values.amount))} saved.`)
    } catch (error) {
      console.error('Error saving expense:', error)
      setFormError(applyServerErrors(error, form.setError, ['amount', 'expense_date', 'expense_by', 'description', 'note'], { fallback: 'Failed to save expense.' }))
    }
  }

  const columns: ColumnDef<Expense, unknown>[] = [
    { id: 'date', header: 'Date', accessorFn: (e) => e.expense_date ?? '', cell: ({ row }) => (row.original.expense_date ? formatDate(row.original.expense_date) : '-') },
    {
      id: 'amount',
      header: 'Amount',
      meta: { align: 'right' },
      accessorFn: (e) => Number(e.amount) || 0,
      cell: ({ row }) => <span className="tw:font-semibold tw:tabular-nums">{row.original.amount}</span>,
    },
    { id: 'description', header: 'Description', accessorFn: (e) => e.description ?? '', cell: ({ row }) => row.original.description || <span className="tw:text-muted-foreground">-</span> },
    { id: 'by', header: 'Expense By', accessorFn: (e) => e.user?.name ?? '', cell: ({ row }) => row.original.user?.name || <span className="tw:text-muted-foreground">-</span> },
    {
      id: 'note',
      header: 'Note',
      enableSorting: false,
      accessorFn: (e) => e.note ?? '',
      cell: ({ row }) => <span className="tw:inline-block tw:max-w-56 tw:truncate tw:align-middle">{row.original.note || '-'}</span>,
    },
    { id: 'recorded', header: 'Recorded On', accessorFn: (e) => e.created_at, cell: ({ row }) => <span className="tw:text-muted-foreground">{formatDate(row.original.created_at)}</span> },
  ]

  const submitting = form.formState.isSubmitting

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader title="Operational Expenses" description="Record and review monthly running costs." className="tw:mb-0" />

      <m.div className="tw:grid tw:grid-cols-2 tw:gap-4 tw:lg:grid-cols-4" variants={stagger(0.05)} initial="hidden" animate="visible">
        <StatCard label="Total for the month" value={total} icon={IndianRupee} tone="destructive" format={formatCurrency} />
        <StatCard label="Entries" value={expenses.length} icon={Hash} tone="info" />
      </m.div>

      <Card>
        <CardHeader>
          <CardTitle>Add Monthly Operational Expense</CardTitle>
          <CardDescription>Amount, date and who spent it are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="tw:grid tw:gap-5 tw:md:grid-cols-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Expense Amount</FormLabel>
                    <div className="tw:relative">
                      <span className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:-translate-y-1/2 tw:text-sm tw:text-muted-foreground" aria-hidden="true">
                        ₹
                      </span>
                      <FormControl>
                        <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" className="tw:pl-7" disabled={submitting} {...field} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Expense Date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expense_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Expense By</FormLabel>
                    <FormControl>
                      <NativeSelect
                        value={field.value}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : '')}
                        disabled={users.loading || submitting}
                      >
                        <option value="">Select user</option>
                        {(users.data ?? []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </NativeSelect>
                    </FormControl>
                    {selectedUser && (
                      <FormDescription>
                        {selectedUser.email} · <span className="tw:capitalize">{selectedUser.role.replace(/_/g, ' ')}</span>
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="tw:md:col-span-2">
                    <FormLabel>Expense Description</FormLabel>
                    <FormControl>
                      <Input maxLength={500} placeholder="e.g. Electricity bill" disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea rows={1} className="tw:min-h-10" disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {formError && (
                <Alert variant="destructive" className="tw:md:col-span-3">
                  <CircleAlert aria-hidden="true" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <div className="tw:md:col-span-3">
                <Button type="submit" loading={submitting} disabled={users.loading}>
                  {submitting ? 'Saving...' : 'Save Expense'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
        <CardHeader className="tw:border-b tw:border-solid tw:border-border tw:py-4">
          <CardTitle>Expenses (Month-wise)</CardTitle>
        </CardHeader>
        <DataTable
          columns={columns}
          data={expenses}
          loading={list.loading && expenses.length === 0}
          getRowId={(e) => String(e.id)}
          emptyIcon={ReceiptIndianRupee}
          emptyTitle="No expenses found for this period."
          pageSize={25}
          toolbar={
            <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3">
              <label className="tw:m-0 tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-medium">
                User
                <NativeSelect className="tw:w-48" value={userFilter} onChange={(e) => setUserFilter(e.target.value ? Number(e.target.value) : '')} disabled={users.loading}>
                  <option value="">All Users</option>
                  {(users.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="tw:m-0 tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-medium">
                Month
                <Input type="month" className="tw:w-48" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>
            </div>
          }
        />
      </Card>
    </div>
  )
}
