import { ReceiptIndianRupee } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/useAsync'
import { paymentModeLabel } from '@/lib/formatters'
import { formatDate } from '@/utils/date'
import { fetchFeeSummary } from '../services/widgetsService'

const rupees = (v: number | string | undefined) => `₹${Number(v || 0).toFixed(2)}`

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

/** Same content as the legacy FeeDetailsModal, loaded when opened for a student. */
export default function FeeDetailsDialog({ studentId, onClose }: { studentId: number | null; onClose: () => void }) {
  const { data: details, loading, error } = useAsync(() => fetchFeeSummary(studentId!), [studentId], { enabled: studentId != null })
  const s = details?.summary

  return (
    <Dialog open={studentId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fee Details</DialogTitle>
          <DialogDescription>
            {details?.student
              ? `${details.student.name ?? ''} · ${details.student.email ?? ''} · Class: ${details.student.class ?? '-'} · Phone: ${details.student.phone ?? '-'}`
              : 'Payment summary and history'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading fee details">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
            <Skeleton className="h-32" />
          </div>
        ) : error ? (
          <p className="m-0 text-sm text-destructive" role="alert">
            Unable to load fee details.
          </p>
        ) : details ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Total Paid" value={rupees(s?.total_paid)} />
              <Stat label="Last Paid Till" value={formatDate(s?.last_paid_to_date)} />
              <Stat label="Next Due Date" value={formatDate(s?.next_due_date)} />
              <Stat
                label="Days Overdue"
                value={<Badge variant={(s?.days_overdue ?? 0) > 0 ? 'destructive' : 'success'}>{s?.days_overdue ?? 0}</Badge>}
              />
              <Stat label="Unpaid Periods (approx)" value={s?.unpaid_periods ?? 0} />
            </div>
            <div className="overflow-hidden rounded-lg border border-solid border-border">
              {Array.isArray(details.fees) && details.fees.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.fees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>{formatDate(fee.from_date)}</TableCell>
                        <TableCell>{formatDate(fee.to_date)}</TableCell>
                        <TableCell className="text-right tabular-nums">{rupees(fee.amount)}</TableCell>
                        <TableCell>{paymentModeLabel(fee.payment_mode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState icon={ReceiptIndianRupee} title="No payments found." />
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
