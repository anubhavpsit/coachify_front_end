import { useState } from 'react'
import { ArrowRight, Check, ClipboardPen, X } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { toast } from 'sonner'
import { slideUp, transitions } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import SegmentedControl from '@/components/common/SegmentedControl'
import UserAvatar from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/utils/date'
import { decideCorrection, fetchCorrections, type CorrectionFilter, type CorrectionItem } from '../services/correctionsService'

const STATUS_TONE = { present: 'success', absent: 'destructive', leave: 'warning', not_marked: 'secondary' } as const

function StatusChip({ s }: { s?: CorrectionItem['current_status'] }) {
  if (!s) return <span className="tw:text-muted-foreground">—</span>
  return (
    <Badge variant={STATUS_TONE[s]} className="tw:capitalize">
      {s.replace('_', ' ')}
    </Badge>
  )
}

/** Route gate: attendance.corrections (unchanged). */
export default function CorrectionsAdminPage() {
  const [status, setStatus] = useState<CorrectionFilter>('pending')
  const list = useAsync(() => fetchCorrections(status), [status])
  const [comments, setComments] = useState<Record<number, string>>({})
  const [acting, setActing] = useState<{ id: number; approved: boolean } | null>(null)
  const items = list.data ?? []

  const act = async (item: CorrectionItem, approved: boolean) => {
    setActing({ id: item.id, approved })
    try {
      await decideCorrection(item.id, approved, comments[item.id] ?? '')
      setComments((c) => ({ ...c, [item.id]: '' }))
      toast.success(approved ? `Approved — ${item.user?.name ?? 'User'} on ${formatDate(item.attendance_date)}` : 'Rejected')
      list.reload()
    } catch {
      toast.error('Action failed')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader
        title="Attendance Correction Requests"
        description="Review requests from students and teachers to fix their attendance."
        className="tw:mb-0"
        actions={
          <SegmentedControl<CorrectionFilter>
            label="Request status"
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        }
      />

      {list.error ? (
        <ErrorState title="Failed to load requests" onRetry={list.reload} />
      ) : list.loading && items.length === 0 ? (
        <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading requests">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="tw:h-28 tw:rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardPen} title="No requests found." description={status === 'pending' ? 'All caught up — nothing waiting for review.' : undefined} />
        </Card>
      ) : (
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const busy = acting?.id === it.id
              return (
                <m.li key={it.id} layout variants={slideUp} initial="hidden" animate="visible" exit={{ opacity: 0, x: 24, transition: transitions.fast }}>
                  <Card className="tw:gap-3 tw:px-5 tw:py-4">
                    <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
                      <div className="tw:flex tw:items-center tw:gap-3">
                        <UserAvatar name={it.user?.name ?? 'User'} image={it.user?.profile_img} />
                        <div>
                          <div className="tw:font-semibold tw:text-foreground">{it.user?.name ?? 'User'}</div>
                          <div className="tw:text-xs tw:capitalize tw:text-muted-foreground">{it.user?.role}</div>
                        </div>
                      </div>
                      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-sm">
                        <span className="tw:font-medium">{formatDate(it.attendance_date)}</span>
                        <StatusChip s={it.current_status} />
                        <ArrowRight className="tw:size-4 tw:text-muted-foreground" aria-label="to" />
                        <StatusChip s={it.requested_status} />
                      </div>
                    </div>
                    <p className="tw:m-0 tw:rounded-lg tw:bg-muted/60 tw:px-3 tw:py-2 tw:text-sm tw:text-foreground">“{it.reason}”</p>
                    {it.status === 'pending' ? (
                      <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
                        <Input
                          className="tw:h-9 tw:min-w-56 tw:flex-1"
                          placeholder="Optional comment"
                          aria-label={`Comment for ${it.user?.name ?? 'this request'}`}
                          value={comments[it.id] ?? ''}
                          onChange={(e) => setComments((c) => ({ ...c, [it.id]: e.target.value }))}
                          disabled={busy}
                        />
                        <Button size="sm" className="tw:bg-success tw:text-success-foreground tw:hover:bg-success/90" loading={busy && acting?.approved} disabled={busy} onClick={() => void act(it, true)}>
                          {!(busy && acting?.approved) && <Check aria-hidden="true" />}
                          {busy && acting?.approved ? 'Saving…' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="tw:border-destructive/40 tw:text-destructive tw:hover:bg-destructive-soft tw:hover:text-destructive"
                          loading={busy && !acting?.approved}
                          disabled={busy}
                          onClick={() => void act(it, false)}
                        >
                          {!(busy && !acting?.approved) && <X aria-hidden="true" />}
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={it.status === 'approved' ? 'success' : 'destructive'} className="tw:capitalize">
                        {it.status}
                      </Badge>
                    )}
                  </Card>
                </m.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
