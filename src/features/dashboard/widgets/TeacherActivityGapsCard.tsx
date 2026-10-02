import { CalendarX2 } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { slideUp, stagger } from '@/animations'
import NotifyButton from '@/components/common/NotifyButton'
import UserAvatar from '@/components/common/UserAvatar'
import WidgetCard from '@/components/common/WidgetCard'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/useAsync'
import { useNotifyStates } from '@/hooks/useNotifyStates'
import { cn } from '@/lib/utils'
import { PERMISSIONS as P, usePermission } from '@/permissions'
import { formatDate } from '@/utils/date'
import { fetchTeacherActivityGaps, notifyTeacherActivityGap } from '../services/widgetsService'

const LOAD_ERROR = 'Unable to load teacher activity gaps.'

/**
 * Card gate: `dashboard.activity_gaps` (in DashboardPage).
 * Notify button: `dashboard.notify_activity_gaps` (unchanged).
 * Hidden when there are no gaps, as before.
 */
export default function TeacherActivityGapsCard() {
  const { can } = usePermission()
  const canNotify = can(P.DASHBOARD_NOTIFY_ACTIVITY_GAPS)
  const { data, loading, error, reload } = useAsync(
    () =>
      fetchTeacherActivityGaps().catch((err) => {
        console.error('Error loading teacher activity gaps:', err)
        throw err
      }),
    [],
  )
  const notify = useNotifyStates<number>()
  const teachers = data?.teachers ?? []

  if (!loading && !error && teachers.length === 0) return null

  return (
    <WidgetCard
      title="Teachers Not Adding Daily Activities"
      icon={CalendarX2}
      description={data ? `Range: ${formatDate(data.from)} - ${formatDate(data.to)}` : undefined}
      loading={loading}
      error={error ? LOAD_ERROR : undefined}
      onRetry={reload}
      maxBodyHeight="360px"
    >
      <m.ul className="m-0 list-none divide-y divide-border p-0" variants={stagger(0.04)} initial="hidden" animate="visible">
        {teachers.map((teacher) => {
          const state = notify.stateOf(teacher.teacher_id)
          const message = notify.messageOf(teacher.teacher_id)
          return (
            <m.li key={teacher.teacher_id} variants={slideUp} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <UserAvatar name={teacher.teacher_name} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{teacher.teacher_name}</span>
                  {teacher.teacher_email && <span className="text-xs text-muted-foreground">{teacher.teacher_email}</span>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="warning">Missing days: {teacher.missing_days_count}</Badge>
                    {teacher.missing_dates.slice(0, 3).map((d) => (
                      <Badge key={d} variant="outline">
                        {formatDate(d)}
                      </Badge>
                    ))}
                    {teacher.missing_dates.length > 3 && <span className="text-xs text-muted-foreground">…</span>}
                  </div>
                  <AnimatePresence>
                    {message && (
                      <m.span
                        key={message}
                        variants={slideUp}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={cn('text-xs', state === 'error' ? 'text-destructive' : 'text-success')}
                      >
                        {message}
                      </m.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {canNotify && (
                <NotifyButton
                  state={state}
                  title={`Notify ${teacher.teacher_name}`}
                  onClick={() => void notify.send(teacher.teacher_id, () => notifyTeacherActivityGap(teacher.teacher_id))}
                />
              )}
            </m.li>
          )
        })}
      </m.ul>
    </WidgetCard>
  )
}
