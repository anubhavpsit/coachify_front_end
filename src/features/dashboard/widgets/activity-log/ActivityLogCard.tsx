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
        <CardTitle className="tw:flex tw:items-center tw:gap-2">
          <History className="tw:size-4 tw:text-primary" aria-hidden="true" />
          Recent Activity Logs
        </CardTitle>
        <CardDescription>Track who did what across your coaching in real time.</CardDescription>
      </CardHeader>
      <CardContent className="tw:flex tw:flex-col tw:gap-5">
        <ActivityLogFilters filters={log.filters} modules={log.modules} users={log.users} onChange={log.updateFilters} onReset={log.resetFilters} />

        {log.error && (
          <p className="tw:m-0 tw:text-sm tw:text-destructive" role="alert">
            {log.error}
          </p>
        )}

        {firstLoad ? (
          <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading logs">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="tw:h-16" />
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
              className={cn('tw:flex tw:flex-col tw:gap-5 tw:transition-opacity', log.loading && 'tw:opacity-50')}
            >
              {log.groups.map((group) => (
                <section key={group.date} aria-label={group.date}>
                  <h4 className="tw:m-0 tw:mb-3 tw:text-xs! tw:font-semibold tw:uppercase tw:tracking-wide tw:text-muted-foreground">{group.date}</h4>
                  <ol className="tw:relative tw:m-0 tw:list-none tw:border-0 tw:border-l tw:border-solid tw:border-border tw:p-0 tw:pl-5">
                    {group.items.map((item) => (
                      <li key={item.id} className="tw:relative tw:pb-4 tw:last:pb-0">
                        <span className="tw:absolute tw:top-1.5 tw:-left-[1.625rem] tw:size-2.5 tw:rounded-full tw:bg-primary tw:ring-4 tw:ring-card" aria-hidden="true" />
                        <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-x-4 tw:gap-y-1">
                          <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
                            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
                              <span className="tw:text-sm tw:font-semibold tw:capitalize tw:text-foreground">{item.action.replace(/_/g, ' ')}</span>
                              <Badge variant="soft">{moduleLabel(item.module)}</Badge>
                            </div>
                            {item.description && <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{item.description}</p>}
                            {item.metadata && typeof item.metadata === 'object' && (
                              <div className="tw:flex tw:flex-wrap tw:gap-1.5">
                                {Object.entries(item.metadata).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="tw:font-normal">
                                    {key}: {String(value)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="tw:shrink-0 tw:text-right">
                            <p className="tw:m-0 tw:text-sm tw:text-foreground">
                              {item.user?.name || 'System'} <span className="tw:text-muted-foreground">({item.user_role || 'N/A'})</span>
                            </p>
                            <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">{formatTime(item.created_at)}</p>
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
