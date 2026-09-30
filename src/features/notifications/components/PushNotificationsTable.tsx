import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, BellOff, CheckCircle2, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/utils/date'
import { cancelPushNotification, sendPushNotification, type NotificationRecord, type SortBy } from '../services/pushNotificationsService'

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'secondary' | 'success' | 'destructive'> = {
  pending: 'warning',
  processing: 'info',
  retrying: 'secondary',
  sent: 'success',
  failed: 'destructive',
}

const truncate = (value: string | null | undefined, length = 120) => {
  if (!value) return '—'
  return value.length > length ? `${value.slice(0, length)}…` : value
}

interface Props {
  records: NotificationRecord[]
  loading: boolean
  error: string | null
  hasMore: boolean
  sortBy: SortBy
  sortDirection: 'asc' | 'desc'
  onSort: (by: SortBy, dir: 'asc' | 'desc') => void
  onLoadMore: () => void
  onChanged: () => void
}

function SortHead({ label, column, props }: { label: string; column: SortBy; props: Pick<Props, 'sortBy' | 'sortDirection' | 'onSort'> }) {
  const active = props.sortBy === column
  const Icon = !active ? ArrowUpDown : props.sortDirection === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead aria-sort={active ? (props.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => props.onSort(column, active && props.sortDirection === 'desc' ? 'asc' : 'desc')}
        className="tw:m-0 tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-1 tw:border-0 tw:bg-transparent tw:p-0 tw:text-inherit tw:uppercase tw:outline-none tw:hover:text-foreground tw:focus-visible:underline"
      >
        {label}
        <Icon className={active ? 'tw:size-3.5 tw:text-foreground' : 'tw:size-3.5 tw:opacity-50'} aria-hidden="true" />
      </button>
    </TableHead>
  )
}

export default function PushNotificationsTable(props: Props) {
  const { records, loading, error, hasMore, onLoadMore, onChanged } = props
  const [busyId, setBusyId] = useState<number | null>(null)
  const [cancelling, setCancelling] = useState<NotificationRecord | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Infinite scroll (legacy): load the next page when the sentinel shows.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) onLoadMore()
      },
      { root: null, rootMargin: '0px', threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loading, hasMore, onLoadMore])

  const send = async (id: number) => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    setBusyId(id)
    try {
      await sendPushNotification(token, id)
      toast.success('Notification sent.')
      onChanged()
    } catch (err) {
      console.error('Failed to send notification', err)
      toast.error('Unable to send notification. Please review it and try again.')
    } finally {
      setBusyId(null)
    }
  }

  const cancel = async (n: NotificationRecord) => {
    const token = localStorage.getItem('authToken')
    if (!token) return
    setBusyId(n.id)
    try {
      await cancelPushNotification(token, n.id)
      toast.success('Notification cancelled.')
      onChanged()
    } catch (err) {
      console.error('Failed to cancel notification', err)
      toast.error('Unable to cancel notification. Please try again.')
      throw err
    } finally {
      setBusyId(null)
    }
  }

  const firstLoad = loading && records.length === 0

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title &amp; Body</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Sender</TableHead>
            <SortHead label="Type" column="type" props={props} />
            <SortHead label="Status" column="status" props={props} />
            <TableHead title="Number of delivery attempts made vs the maximum allowed before the notification is marked as failed">Attempts</TableHead>
            <SortHead label="Created" column="created_at" props={props} />
            <SortHead label="Sent at" column="sent_at" props={props} />
            <TableHead>Last error</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {firstLoad &&
            Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={10}>
                  <Skeleton className="tw:h-8" />
                </TableCell>
              </TableRow>
            ))}
          {!loading && records.length === 0 && (
            <TableRow>
              <TableCell colSpan={10}>
                {error ? (
                  <p className="tw:m-0 tw:py-4 tw:text-center tw:text-sm tw:text-destructive" role="alert">
                    {error}
                  </p>
                ) : (
                  <EmptyState icon={BellOff} title="No notifications found for the selected filters." />
                )}
              </TableCell>
            </TableRow>
          )}
          {records.map((n) => {
            const status = n.status.toLowerCase()
            return (
              <TableRow key={n.id}>
                <TableCell className="tw:max-w-72 tw:whitespace-normal">
                  <div className="tw:truncate tw:font-semibold">{n.title}</div>
                  <div className="tw:text-xs tw:text-muted-foreground">{truncate(n.body)}</div>
                </TableCell>
                <TableCell>
                  <div className="tw:font-medium">{n.recipient?.name ?? `User #${n.sent_to}`}</div>
                  <div className="tw:text-xs tw:capitalize tw:text-muted-foreground">{n.recipient?.role ?? 'unknown'}</div>
                </TableCell>
                <TableCell>
                  <div className="tw:font-medium">{n.sender?.name ?? 'System'}</div>
                  <div className="tw:text-xs tw:capitalize tw:text-muted-foreground">{n.sender?.role ?? 'automated'}</div>
                </TableCell>
                <TableCell className="tw:capitalize">{n.type.replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[status] ?? 'secondary'} className="tw:capitalize">
                    {status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="tw:tabular-nums">
                  {n.attempts}/{n.max_attempts}
                </TableCell>
                <TableCell className="tw:text-muted-foreground">{formatDateTime(n.created_at)}</TableCell>
                <TableCell className="tw:text-muted-foreground">{formatDateTime(n.sent_at)}</TableCell>
                <TableCell className="tw:max-w-56 tw:whitespace-normal tw:text-xs tw:text-destructive">{truncate(n.last_error, 80)}</TableCell>
                <TableCell>
                  {status === 'sent' ? (
                    <span className="tw:inline-flex tw:items-center tw:gap-1 tw:text-sm tw:text-success" title="Already delivered">
                      <CheckCircle2 className="tw:size-4" aria-hidden="true" /> Sent
                    </span>
                  ) : (
                    <div className="tw:flex tw:gap-2">
                      <Button variant="outline" size="sm" loading={busyId === n.id} disabled={busyId === n.id} onClick={() => void send(n.id)}>
                        {busyId !== n.id && <Send aria-hidden="true" />}
                        {busyId === n.id ? 'Sending...' : 'Send now'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="tw:border-destructive/40 tw:text-destructive tw:hover:bg-destructive-soft tw:hover:text-destructive"
                        disabled={busyId === n.id}
                        onClick={() => setCancelling(n)}
                      >
                        <X aria-hidden="true" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {loading && records.length > 0 && (
        <div className="tw:p-4" role="status" aria-label="Loading more notifications">
          <Skeleton className="tw:h-8" />
        </div>
      )}
      <div ref={sentinelRef} className="tw:h-px" />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel this queued notification?"
        description={cancelling ? `“${cancelling.title}” won't be delivered.` : undefined}
        confirmLabel="Cancel notification"
        cancelLabel="Keep it"
        destructive
        onConfirm={() => (cancelling ? cancel(cancelling) : undefined)}
      />
    </>
  )
}
