import { History, SearchX } from 'lucide-react'
import { m } from 'motion/react'
import { fadeIn } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import Pagination from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatTime } from '@/utils/date'
import ActivityLogFilters from './ActivityLogFilters'
import { moduleLabel } from './activityLogService'
import { useActivityLogs } from './useActivityLogs'

/** Gate: role coaching_admin OR `activity_logs.view` (in DashboardPage). */
export default function ActivityLogCard() {
  const log = useActivityLogs()
  const firstLoad = log.loading && log.isEmpty

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-primary" aria-hidden="true" />
          Recent Activity Logs
        </CardTitle>
        <CardDescription>Track who did what across your coaching in real time.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ActivityLogFilters filters={log.filters} modules={log.modules} users={log.users} onChange={log.updateFilters} onReset={log.resetFilters} />

        {log.error && (
          <p className="m-0 text-sm text-destructive" role="alert">
            {log.error}
          </p>
        )}

        {firstLoad ? (
          <div className="flex flex-col gap-3" role="status" aria-label="Loading logs">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !log.error && log.groups.length === 0 ? (
          <EmptyState icon={SearchX} title="No activity recorded for the selected filters." />
        ) : (
          !log.error && (
            // Keep the current page visible (dimmed) while the next one loads.
            <m.div
              key={`${log.page}-${JSON.stringify(log.filters)}`}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              aria-busy={log.loading}
              className={cn('flex flex-col gap-5 transition-opacity', log.loading && 'opacity-50')}
            >
              {log.groups.map((group) => (
                <section key={group.date} aria-label={group.date}>
                  <h4 className="m-0 mb-3 text-xs! font-semibold uppercase tracking-wide text-muted-foreground">{group.date}</h4>
                  <ol className="relative m-0 list-none border-0 border-l border-solid border-border p-0 pl-5">
                    {group.items.map((item) => (
                      <li key={item.id} className="relative pb-4 last:pb-0">
                        <span className="absolute top-1.5 -left-[1.625rem] size-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden="true" />
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold capitalize text-foreground">{item.action.replace(/_/g, ' ')}</span>
                              <Badge variant="soft">{moduleLabel(item.module)}</Badge>
                            </div>
                            {item.description && <p className="m-0 text-sm text-muted-foreground">{item.description}</p>}
                            {item.metadata && typeof item.metadata === 'object' && (
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(item.metadata).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="font-normal">
                                    {key}: {String(value)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="m-0 text-sm text-foreground">
                              {item.user?.name || 'System'} <span className="text-muted-foreground">({item.user_role || 'N/A'})</span>
                            </p>
                            <p className="m-0 text-xs text-muted-foreground">{formatTime(item.created_at)}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </m.div>
          )
        )}

        <Pagination
          page={log.pagination.current_page}
          lastPage={log.pagination.last_page}
          total={log.pagination.total}
          itemLabel="logs"
          disabled={log.loading}
          onPageChange={log.setPage}
        />
      </CardContent>
    </Card>
  )
}
