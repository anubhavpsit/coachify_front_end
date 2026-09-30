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

const FIELD = 'tw:m-0 tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-medium tw:text-foreground'

/** Admin push-notification queue. Page-level role gate lives in usePushNotifications (Q10). */
export default function NotificationsPage() {
  const q = usePushNotifications()
  const { filters, update } = q
  const shown = q.records.length

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader title="Push Notifications" description="Delivery queue for app and push notifications" className="tw:mb-0" />

      {q.allowed && (
        <m.div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-3" variants={stagger(0.05)} initial="hidden" animate="visible">
          <StatCard label="Pending queue" value={q.stats.pending} icon={Clock} tone="warning" />
          <StatCard label="Failed deliveries" value={q.stats.failed} icon={CircleX} tone="destructive" />
          <StatCard label="Sent today" value={q.stats.sent_today} icon={Send} tone="success" />
        </m.div>
      )}

      {q.allowed && (
        <Card className="tw:py-5">
          <CardContent>
            <form
              className="tw:grid tw:grid-cols-1 tw:items-end tw:gap-4 tw:sm:grid-cols-2 tw:lg:grid-cols-3 tw:2xl:grid-cols-6"
              onSubmit={(e) => e.preventDefault()}
              role="search"
            >
              <label className={`${FIELD} tw:lg:col-span-1 tw:2xl:col-span-2`}>
                Search
                <span className="tw:relative">
                  <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
                  <Input value={filters.search} onChange={(e) => update({ search: e.target.value })} placeholder="Search title or body" className="tw:pl-9" />
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
              <Button type="button" variant="secondary" onClick={q.reset} className="tw:2xl:col-start-6">
                <RotateCcw aria-hidden="true" />
                Reset filters
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
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
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
          <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">
            Showing {shown} of {q.pagination.total} entries
          </p>
          <NativeSelect className="tw:w-36" aria-label="Rows per page" value={filters.perPage} onChange={(e) => update({ perPage: Number(e.target.value) })}>
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
