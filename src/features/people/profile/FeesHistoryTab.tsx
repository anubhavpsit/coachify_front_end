import { ReceiptIndianRupee } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/useAsync'
import { paymentModeLabel } from '@/lib/formatters'
import { formatDate } from '@/utils/date'
import { fetchFeeHistory } from './profileService'

/** Viewer coaching_admin + viewed student (gate in the dialog). */
export default function FeesHistoryTab({ studentId }: { studentId: number }) {
  const { data, loading } = useAsync(() => fetchFeeHistory(studentId), [studentId])
  if (loading)
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading history">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    )
  const items = data?.items ?? []
  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <EmptyState icon={ReceiptIndianRupee} title="No fees history found." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-solid border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Paid On</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Mode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {formatDate(item.from_date)} → {formatDate(item.to_date)}
                  </TableCell>
                  <TableCell>{formatDate(item.paid_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">₹{Number(item.amount).toFixed(2)}</TableCell>
                  <TableCell>{paymentModeLabel(item.payment_mode)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data?.error && <p className="m-0 text-sm text-destructive">{data.error}</p>}
    </div>
  )
}
