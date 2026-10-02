import { useState } from 'react'
import { IndianRupee } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import WidgetCard from '@/components/common/WidgetCard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/utils/date'
import { classLabel, fetchPendingFees } from '../services/widgetsService'
import FeeDetailsDialog from './FeeDetailsDialog'

const overdueTone = (days: number): 'destructive' | 'warning' | 'secondary' => (days > 60 ? 'destructive' : days > 15 ? 'warning' : 'secondary')

/** Gate: `fees.view` (in DashboardPage). Hidden when nobody has pending fees, as before (errors still show). */
export default function PendingFeesCard() {
  const { data, loading, error, reload } = useAsync(
    () =>
      fetchPendingFees().catch((err) => {
        console.error('Error loading pending fees:', err)
        throw err
      }),
    [],
  )
  const [detailsFor, setDetailsFor] = useState<number | null>(null)
  const items = data?.items ?? []
  const message = error instanceof Error && error.message === 'You are not authenticated.' ? error.message : 'Unable to load pending fees.'

  if (!loading && !error && items.length === 0) return null

  return (
    <>
      <WidgetCard
        title="Students with Pending Fees"
        icon={IndianRupee}
        description={data?.asOf ? `As of ${formatDate(data.asOf)}` : undefined}
        action={items.length > 0 ? <Badge variant="destructive">{items.length} pending</Badge> : undefined}
        loading={loading}
        error={error ? message : undefined}
        onRetry={reload}
        maxBodyHeight="380px"
        bodyClassName="px-0"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Last Paid Till</TableHead>
              <TableHead>Due Since</TableHead>
              <TableHead className="text-right">Days Overdue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.student_id} className="cursor-pointer" onClick={() => setDetailsFor(item.student_id)}>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {/* Real button so the row is reachable by keyboard / screen readers. */}
                      <Button
                        variant="link"
                        className="h-auto p-0 font-semibold text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetailsFor(item.student_id)
                        }}
                      >
                        {item.student_name}
                      </Button>
                      {item.student_status && (
                        <Badge variant={item.student_status === 'active' ? 'success' : 'secondary'} className="capitalize">
                          {item.student_status}
                        </Badge>
                      )}
                    </div>
                    {item.student_email && <span className="text-xs text-muted-foreground">{item.student_email}</span>}
                  </div>
                </TableCell>
                <TableCell>{classLabel(data?.classes ?? [], item.class ?? null, '-')}</TableCell>
                <TableCell>{item.phone ?? '-'}</TableCell>
                <TableCell>{item.last_paid_to_date ? formatDate(item.last_paid_to_date) : <span className="text-muted-foreground">Never</span>}</TableCell>
                <TableCell>{formatDate(item.due_date)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={overdueTone(item.days_overdue)} className="tabular-nums">
                    {item.days_overdue}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </WidgetCard>
      <FeeDetailsDialog studentId={detailsFor} onClose={() => setDetailsFor(null)} />
    </>
  )
}
