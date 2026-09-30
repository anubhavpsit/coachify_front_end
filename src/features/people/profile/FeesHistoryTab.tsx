import { ReceiptIndianRupee } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/utils/date'
import { fetchFeeHistory } from './profileService'

/** Viewer coaching_admin + viewed student (gate in the dialog). */
export default function FeesHistoryTab({ studentId }: { studentId: number }) {
  const { data, loading } = useAsync(() => fetchFeeHistory(studentId), [studentId])
  if (loading)
    return (
      <div className="tw:flex tw:flex-col tw:gap-2" role="status" aria-label="Loading history">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="tw:h-9" />
        ))}
      </div>
    )
  const items = data?.items ?? []
  return (
    <div className="tw:flex tw:flex-col tw:gap-2">
      {items.length === 0 ? (
        <EmptyState icon={ReceiptIndianRupee} title="No fees history found." />
      ) : (
        <div className="tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Paid On</TableHead>
                <TableHead className="tw:text-right">Amount</TableHead>
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
                  <TableCell className="tw:text-right tw:tabular-nums">₹{Number(item.amount).toFixed(2)}</TableCell>
                  <TableCell className="tw:capitalize">{item.payment_mode || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {data?.error && <p className="tw:m-0 tw:text-sm tw:text-destructive">{data.error}</p>}
    </div>
  )
}
