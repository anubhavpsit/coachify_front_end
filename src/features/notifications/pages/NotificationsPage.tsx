import { CircleX, Clock, RotateCcw, Search, Send } from 'lucide-react'
import { m } from 'motion/react'
import { stagger } from '@/animations'
import PageHeader from '@/components/common/PageHeader'
import StatCard from '@/components/common/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import PushNotificationsTable from '../components/PushNotificationsTable'
import { usePushNotifications } from '../hooks/usePushNotifications'

const FIELD = 'm-0 flex flex-col gap-1.5 text-sm font-medium text-foreground'

/** Admin push-notification queue. Page-level role gate lives in usePushNotifications (Q10). */
export default function NotificationsPage() {
  const q = usePushNotifications()
  const { filters, update } = q
  const shown = q.records.length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Push Notifications" description="Delivery queue for app and push notifications" className="mb-0" />

      {q.allowed && (
        <m.div className="grid grid-cols-1 gap-4 sm:grid-cols-3" variants={stagger(0.05)} initial="hidden" animate="visible">
          <StatCard label="Pending queue" value={q.stats.pending} icon={Clock} tone="warning" />
          <StatCard label="Failed deliveries" value={q.stats.failed} icon={CircleX} tone="destructive" />
          <StatCard label="Sent today" value={q.stats.sent_today} icon={Send} tone="success" />
        </m.div>
      )}

      {q.allowed && (
        <Card className="py-5">
          <CardContent>
            <form
              className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
              onSubmit={(e) => e.preventDefault()}
              role="search"
            >
              <label className={`${FIELD} lg:col-span-1 2xl:col-span-2`}>
                Search
                <span className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input value={filters.search} onChange={(e) => update({ search: e.target.value })} placeholder="Search title or body" className="pl-9" />
                </span>
              </label>
              <label className={FIELD}>
                Status
                <NativeSelect value={filters.status} onChange={(e) => update({ status: e.target.value })}>
                  <option value="all">All statuses</option>
                  {q.options.statuses.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className={FIELD}>
                Type
                <NativeSelect value={filters.type} onChange={(e) => update({ type: e.target.value })}>
                  <option value="all">All notification types</option>
                  {q.options.types.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className={FIELD}>
                Start date
                <Input type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={(e) => update({ startDate: e.target.value })} />
              </label>
              <label className={FIELD}>
                End date
                <Input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(e) => update({ endDate: e.target.value })} />
              </label>
              <Button type="button" variant="secondary" onClick={q.reset} className="2xl:col-start-6">
                <RotateCcw aria-hidden="true" />
                Reset filters
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <PushNotificationsTable
          records={q.records}
          loading={q.loading}
          error={q.error}
          hasMore={q.hasMore}
          sortBy={filters.sortBy}
          sortDirection={filters.sortDirection}
          onSort={(sortBy, sortDirection) => update({ sortBy, sortDirection })}
          onLoadMore={q.loadNextPage}
          onChanged={q.refresh}
        />
      </Card>

      {q.allowed && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-muted-foreground">
            Showing {shown} of {q.pagination.total} entries
          </p>
          <NativeSelect className="w-36" aria-label="Rows per page" value={filters.perPage} onChange={(e) => update({ perPage: Number(e.target.value) })}>
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
    </div>
  )
}
