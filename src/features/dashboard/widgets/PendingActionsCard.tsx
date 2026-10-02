import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, ListTodo, PartyPopper, SearchX } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { slideUp, transitions } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import NotifyButton from '@/components/common/NotifyButton'
import WidgetCard from '@/components/common/WidgetCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useAsync } from '@/hooks/useAsync'
import { useNotifyStates } from '@/hooks/useNotifyStates'
import { cn } from '@/lib/utils'
import { PERMISSIONS as P, usePermission } from '@/permissions'
import { fetchPendingActions, notifyPendingAction, type PendingAction } from '../services/widgetsService'
import {
  EMPTY_FILTERS,
  TYPE_LABELS,
  buildFilterOptions,
  filterPendingActions,
  isNotifiable,
  rowKey,
  type PendingFilters,
  type RoleFilter,
} from './pendingActionsFilters'

const SEVERITY_DOT: Record<string, string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
  low: 'bg-info',
}

/**
 * Card gate: `dashboard.pending_actions` for admin/staff; always for teachers (DashboardPage).
 * Notify button: `dashboard.notify_pending_actions` + a notifiable reason (unchanged).
 */
export default function PendingActionsCard() {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canNotify = can(P.DASHBOARD_NOTIFY_PENDING_ACTIONS)
  const { data: actions = [], loading, error, reload } = useAsync(
    () =>
      fetchPendingActions().catch((err) => {
        console.error('Error loading pending actions:', err)
        throw err
      }),
    [],
  )
  const [filters, setFilters] = useState<PendingFilters>(EMPTY_FILTERS)
  const notify = useNotifyStates<string>()

  const options = buildFilterOptions(actions)
  const userOptions = filters.role === 'teacher' ? options.teachers : filters.role === 'student' ? options.students : []
  // Keep each row's original index so notify state doesn't jump rows when filters change.
  const indexed = actions.map((action, index) => ({ action, key: rowKey(action, index) }))
  const visible = new Set(filterPendingActions(actions, filters))
  const rows = indexed.filter((r) => visible.has(r.action))
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS)

  const open = (action: PendingAction) => {
    if (!action.action_route) return
    if (action.action_route.startsWith('/')) navigate(action.action_route)
    else window.location.assign(action.action_route)
  }

  return (
    <WidgetCard
      title="Pending Actions"
      icon={ListTodo}
      action={actions.length > 0 ? <Badge variant="warning">{actions.length} open</Badge> : undefined}
      loading={loading}
      error={error ? 'Unable to load pending actions.' : undefined}
      onRetry={reload}
      empty={actions.length === 0}
      emptyIcon={PartyPopper}
      emptyTitle="You're all caught up — no pending actions."
      maxBodyHeight={false}
    >
      <div className="mb-3 flex flex-wrap items-end gap-3">
        {options.types.length > 1 && (
          <label className="m-0 flex min-w-40 flex-col gap-1 text-xs text-muted-foreground">
            Action
            <NativeSelect size="sm" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
              <option value="all">All actions</option>
              {options.types.map((type) => (
                <option key={type} value={type}>
                  {TYPE_LABELS[type] ?? type}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}
        <label className="m-0 flex flex-col gap-1 text-xs text-muted-foreground">
          Date
          <Input type="date" className="h-8 w-44" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} />
        </label>
        {options.hasUserAttribution && (
          <label className="m-0 flex min-w-36 flex-col gap-1 text-xs text-muted-foreground">
            Role
            <NativeSelect size="sm" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as RoleFilter, userId: '' }))}>
              <option value="all">All roles</option>
              {options.teachers.length > 0 && <option value="teacher">Teacher</option>}
              {options.students.length > 0 && <option value="student">Student</option>}
            </NativeSelect>
          </label>
        )}
        {options.hasUserAttribution && filters.role !== 'all' && (
          <label className="m-0 flex min-w-40 flex-col gap-1 text-xs text-muted-foreground">
            User
            <NativeSelect size="sm" value={filters.userId} onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">{filters.role === 'teacher' ? 'All teachers' : 'All students'}</option>
              {userOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={SearchX} title="No pending actions for the selected filters." className="py-4" />
      ) : (
        <ul className="m-0 max-h-[300px] list-none divide-y divide-border overflow-y-auto p-0 pr-2">
          <AnimatePresence initial={false}>
            {rows.map(({ action, key }) => {
              const state = notify.stateOf(key)
              const message = notify.messageOf(key)
              const notifiable = isNotifiable(action, canNotify)
              return (
                <m.li
                  key={key}
                  layout="position"
                  variants={slideUp}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, transition: transitions.fast }}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', SEVERITY_DOT[action.severity ?? ''] ?? 'bg-muted-foreground/40')}
                      aria-label={action.severity ? `${action.severity} priority` : undefined}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">{action.title}</span>
                      <span className="text-sm text-muted-foreground">{action.description}</span>
                      {message && <span className={cn('text-xs', state === 'error' ? 'text-destructive' : 'text-success')}>{message}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {notifiable && (
                      <NotifyButton
                        state={state}
                        title={action.for_teacher_name ? `Notify ${action.for_teacher_name}` : 'Notify teacher'}
                        onClick={() => void notify.send(key, () => notifyPendingAction(action))}
                      />
                    )}
                    {action.action_route && !notifiable && (
                      <Button variant="outline" size="sm" onClick={() => open(action)}>
                        Open
                        <ArrowUpRight aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </m.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </WidgetCard>
  )
}
