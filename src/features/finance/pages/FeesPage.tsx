import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { m } from 'motion/react'
import { CircleAlert, IndianRupee, LoaderCircle, Pencil, ReceiptIndianRupee, Sparkles, Users, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { stagger } from '@/animations'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import EmptyState from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import StatCard from '@/components/common/StatCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { formatCurrency } from '@/lib/formatters'
import { usePermission } from '@/permissions'
import { formatDate } from '@/utils/date'
import FeeEditDialog, { type EditableFee } from '../components/FeeEditDialog'
import FeeFields from '../components/FeeFields'
import { FEE_FIELDS, feeDefaults, feeSchema, toFeePayload, type FeeValues } from '../schemas/feeForm'
import { createFee, fetchFeeStudents, fetchFees, fetchStudentFeeHistory, suggestFeePeriod, type StudentFee } from '../services/feesService'

const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Route gate: fees.view | fees.manage. The add form isn't gated in-page (Q14).
 * Correcting an entry (Edit column + dialog) is role coaching_admin only (Q3).
 */
export default function FeesPage() {
  const { hasRole } = usePermission()
  const canEditFees = hasRole(ROLES.COACHING_ADMIN)
  const students = useAsync(() => fetchFeeStudents().catch((e) => (console.error('Error fetching students:', e), [])), [])
  const [month, setMonth] = useState(currentMonth())
  const [studentId, setStudentId] = useState<number | ''>('')
  const [reloadKey, setReloadKey] = useState(0)
  const list = useAsync(() => fetchFees(month, studentId).catch((e) => (console.error('Error fetching fees:', e), undefined)), [month, studentId, reloadKey])
  const history = useAsync(() => fetchStudentFeeHistory(studentId as number), [studentId, reloadKey], { enabled: studentId !== '' })
  const [editing, setEditing] = useState<EditableFee | null>(null)

  const form = useForm<FeeValues>({ resolver: zodResolver(feeSchema), defaultValues: feeDefaults(), mode: 'onTouched' })
  const [formError, setFormError] = useState<string | null>(null)
  const [suggest, setSuggest] = useState<{ loading: boolean; note: string | null }>({ loading: false, note: null })

  // Auto-fill From/To from the last payment when a student is chosen (and after saving).
  const runSuggest = useCallback(
    async (id: number | '') => {
      if (!id) return
      setSuggest({ loading: true, note: null })
      try {
        const period = await suggestFeePeriod(id)
        if (period) {
          form.setValue('from_date', period.from, { shouldDirty: true })
          form.setValue('to_date', period.to, { shouldDirty: true })
          setSuggest({ loading: false, note: 'Auto-filled from last payment' })
        } else setSuggest({ loading: false, note: 'Could not auto-fill dates' })
      } catch {
        setSuggest({ loading: false, note: 'Could not auto-fill dates' })
      }
    },
    [form],
  )

  const selectStudent = (id: number | '') => {
    setStudentId(id)
    void runSuggest(id)
  }

  const submit = async (values: FeeValues) => {
    setFormError(null)
    try {
      if (!(await createFee(toFeePayload(values)))) return
      toast.success(`${formatCurrency(Number(values.amount))} fee recorded.`)
      // Keep the student selected; clear the rest (legacy).
      form.reset({ ...feeDefaults(values.student_id), from_date: values.from_date, to_date: values.to_date })
      setReloadKey((k) => k + 1)
      void runSuggest(values.student_id)
    } catch (error) {
      console.error('Error saving fee:', error)
      setFormError(applyServerErrors(error, form.setError, FEE_FIELDS, { fallback: 'Failed to save fee.' }))
    }
  }

  const fees = list.data?.fees ?? []
  const meta = list.data?.meta
  const selected = (students.data ?? []).find((s) => s.id === Number(studentId))
  const submitting = form.formState.isSubmitting

  const columns: ColumnDef<StudentFee, unknown>[] = [
    { id: 'student', header: 'Student', accessorFn: (f) => f.student?.name ?? '', cell: ({ row }) => <span className="tw:font-medium">{row.original.student?.name || '-'}</span> },
    { id: 'from', header: 'From Date', accessorFn: (f) => f.from_date, cell: ({ row }) => formatDate(row.original.from_date) },
    { id: 'to', header: 'To Date', accessorFn: (f) => f.to_date, cell: ({ row }) => formatDate(row.original.to_date) },
    { id: 'amount', header: 'Amount', meta: { align: 'right' }, accessorFn: (f) => Number(f.amount) || 0, cell: ({ row }) => <span className="tw:font-semibold tw:tabular-nums">{row.original.amount}</span> },
    { id: 'mode', header: 'Mode', accessorFn: (f) => f.payment_mode, cell: ({ row }) => <span className="tw:capitalize">{row.original.payment_mode}</span> },
    { id: 'submitted', header: 'Submitted On', accessorFn: (f) => f.submitted_on || f.created_at, cell: ({ row }) => formatDate(row.original.submitted_on || row.original.created_at) },
    {
      id: 'notes',
      header: 'Notes',
      enableSorting: false,
      accessorFn: (f) => f.notes ?? '',
      cell: ({ row }) => <span className="tw:block tw:max-w-60 tw:whitespace-pre-wrap">{row.original.notes || '-'}</span>,
    },
    ...(canEditFees
      ? ([
          {
            id: 'edit',
            header: () => <span className="tw:sr-only">Edit</span>,
            enableSorting: false,
            meta: { align: 'right' },
            cell: ({ row }) => (
              <IconAction label="Edit this fee entry" onClick={() => setEditing({ ...row.original, submitted_on: row.original.submitted_on || row.original.created_at })}>
                <Pencil aria-hidden="true" />
              </IconAction>
            ),
          },
        ] as ColumnDef<StudentFee, unknown>[])
      : []),
  ]

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader title="Student Fees" description="Record tuition payments and review what was collected each month." className="tw:mb-0" />

      <m.div className="tw:grid tw:grid-cols-2 tw:gap-4 tw:lg:grid-cols-3" variants={stagger(0.05)} initial="hidden" animate="visible">
        <StatCard label="Collected this month" value={meta?.total_amount ?? 0} icon={IndianRupee} tone="success" format={formatCurrency} />
        <StatCard label="Payments" value={meta?.count ?? 0} icon={Wallet} tone="primary" />
        {!selected && <StatCard label="Students paid" value={meta?.students_count ?? 0} icon={Users} tone="violet" />}
      </m.div>

      <Card>
        <CardHeader>
          <CardTitle>Add Monthly Tuition Fee</CardTitle>
          <CardDescription>Pick a student — the period is suggested from their last payment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="tw:flex tw:flex-col tw:gap-5">
              <FeeFields
                control={form.control}
                students={students.data ?? []}
                disabled={students.loading || submitting}
                onStudentChange={selectStudent}
                studentHint={selected ? `${selected.email} · Phone: ${selected.student_profile?.phone || '-'}` : undefined}
                fromHint={
                  suggest.loading ? (
                    <span className="tw:flex tw:items-center tw:gap-1 tw:text-xs tw:text-muted-foreground">
                      <LoaderCircle className="tw:size-3 tw:animate-spin" aria-hidden="true" /> Loading suggestion…
                    </span>
                  ) : suggest.note ? (
                    <span className="tw:flex tw:items-center tw:gap-1 tw:text-xs tw:text-muted-foreground">
                      <Sparkles className="tw:size-3" aria-hidden="true" /> {suggest.note}
                    </span>
                  ) : null
                }
              />
              {formError && (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden="true" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <div>
                <Button type="submit" loading={submitting} disabled={students.loading}>
                  {submitting ? 'Saving...' : 'Save Fee'}
                </Button>
              </div>
            </form>
          </Form>

          {selected && (
            <section className="tw:mt-6 tw:flex tw:flex-col tw:gap-3 tw:border-t tw:border-solid tw:border-border tw:pt-5" aria-label={`${selected.name} fee history`}>
              <h3 className="tw:m-0 tw:text-sm! tw:font-semibold">Fees history — {selected.name}</h3>
              {history.loading ? (
                <Skeleton className="tw:h-24" />
              ) : (history.data?.items ?? []).length === 0 ? (
                <EmptyState icon={ReceiptIndianRupee} title="No fees history found." className="tw:py-4" />
              ) : (
                <div className="tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Paid On</TableHead>
                        <TableHead className="tw:text-right">Amount</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Notes</TableHead>
                        {canEditFees && (
                          <TableHead>
                            <span className="tw:sr-only">Edit</span>
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(history.data?.items ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {formatDate(item.from_date)} → {formatDate(item.to_date)}
                          </TableCell>
                          <TableCell>{item.paid_at ? formatDate(item.paid_at) : '-'}</TableCell>
                          <TableCell className="tw:text-right tw:tabular-nums">₹{Number(item.amount).toFixed(2)}</TableCell>
                          <TableCell className="tw:capitalize">{item.payment_mode || '-'}</TableCell>
                          <TableCell className="tw:whitespace-pre-wrap">{item.notes || '-'}</TableCell>
                          {canEditFees && (
                            <TableCell className="tw:text-right">
                              <IconAction
                                label="Edit this fee entry"
                                onClick={() =>
                                  setEditing({
                                    id: item.id,
                                    student_id: Number(studentId),
                                    from_date: item.from_date,
                                    to_date: item.to_date,
                                    amount: item.amount,
                                    payment_mode: item.payment_mode || 'cash',
                                    submitted_on: item.paid_at ?? null,
                                    notes: item.notes,
                                  })
                                }
                              >
                                <Pencil aria-hidden="true" />
                              </IconAction>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {history.data?.error && <p className="tw:m-0 tw:text-sm tw:text-destructive">{history.data.error}</p>}
            </section>
          )}
        </CardContent>
      </Card>

      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
        <CardHeader className="tw:border-b tw:border-solid tw:border-border tw:py-4">
          <CardTitle>Fees Submitted (Month-wise) · {selected ? selected.name : 'All students'}</CardTitle>
          {meta && meta.count > 0 && (
            <CardDescription>
              {meta.count} payment{meta.count === 1 ? '' : 's'}
              {!selected && ` from ${meta.students_count} student${meta.students_count === 1 ? '' : 's'}`} ·{' '}
              <strong className="tw:text-foreground">₹{meta.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong> collected
            </CardDescription>
          )}
        </CardHeader>
        <DataTable
          columns={columns}
          data={fees}
          loading={list.loading && fees.length === 0}
          getRowId={(f) => String(f.id)}
          emptyIcon={ReceiptIndianRupee}
          emptyTitle={selected ? `${selected.name} has no fees submitted in this month.` : 'No fees submitted in this month.'}
          pageSize={25}
          toolbar={
            <label className="tw:m-0 tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-medium">
              Month
              <Input type="month" className="tw:w-48" value={month} onChange={(e) => setMonth(e.target.value)} />
            </label>
          }
        />
      </Card>

      {canEditFees && (
        <FeeEditDialog
          fee={editing}
          students={students.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setReloadKey((k) => k + 1)
            if (studentId) void runSuggest(studentId)
          }}
        />
      )}
    </div>
  )
}
