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
        className="m-0 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-inherit uppercase outline-none hover:text-foreground focus-visible:underline"
      >
        {label}
        <Icon className={active ? 'size-3.5 text-foreground' : 'size-3.5 opacity-50'} aria-hidden="true" />
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
                  <Skeleton className="h-8" />
                </TableCell>
              </TableRow>
            ))}
          {!loading && records.length === 0 && (
            <TableRow>
              <TableCell colSpan={10}>
                {error ? (
                  <p className="m-0 py-4 text-center text-sm text-destructive" role="alert">
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
                <TableCell className="max-w-72 whitespace-normal">
                  <div className="truncate font-semibold">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{truncate(n.body)}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{n.recipient?.name ?? `User #${n.sent_to}`}</div>
                  <div className="text-xs capitalize text-muted-foreground">{n.recipient?.role ?? 'unknown'}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{n.sender?.name ?? 'System'}</div>
                  <div className="text-xs capitalize text-muted-foreground">{n.sender?.role ?? 'automated'}</div>
                </TableCell>
                <TableCell className="capitalize">{n.type.replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[status] ?? 'secondary'} className="capitalize">
                    {status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums">
                  {n.attempts}/{n.max_attempts}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(n.created_at)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(n.sent_at)}</TableCell>
                <TableCell className="max-w-56 whitespace-normal text-xs text-destructive">{truncate(n.last_error, 80)}</TableCell>
                <TableCell>
                  {status === 'sent' ? (
                    <span className="inline-flex items-center gap-1 text-sm text-success" title="Already delivered">
                      <CheckCircle2 className="size-4" aria-hidden="true" /> Sent
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" loading={busyId === n.id} disabled={busyId === n.id} onClick={() => void send(n.id)}>
                        {busyId !== n.id && <Send aria-hidden="true" />}
                        {busyId === n.id ? 'Sending...' : 'Send now'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive"
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
        <div className="p-4" role="status" aria-label="Loading more notifications">
          <Skeleton className="h-8" />
        </div>
      )}
      <div ref={sentinelRef} className="h-px" />
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
