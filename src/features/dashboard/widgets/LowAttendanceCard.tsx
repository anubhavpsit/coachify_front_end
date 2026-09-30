import { UserX } from 'lucide-react'
import { m } from 'motion/react'
import { slideUp, stagger } from '@/animations'
import PersonRow from '@/components/common/PersonRow'
import WidgetCard from '@/components/common/WidgetCard'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { fetchLowAttendance } from '../services/widgetsService'
import { roleAvatarTone } from './roleTone'

/** Gate: `attendance.view` (in DashboardPage). */
export default function LowAttendanceCard() {
  const { data, loading, error, reload } = useAsync(fetchLowAttendance, [])
  const users = data ?? []
  return (
    <WidgetCard
      title="Low Attendance Users"
      icon={UserX}
      loading={loading}
      error={error ? 'Unable to load attendance.' : undefined}
      onRetry={reload}
      empty={users.length === 0}
      emptyTitle="No users below threshold"
      emptyIcon={UserX}
    >
      <m.ul className="tw:m-0 tw:list-none tw:divide-y tw:divide-border tw:p-0" variants={stagger(0.04)} initial="hidden" animate="visible">
        {users.map((user) => (
          <m.li key={user.id} variants={slideUp}>
            <PersonRow
              name={user.name}
              image={user.profile_image}
              subtitle={<span className="tw:capitalize">{user.role}</span>}
              status={user.role === 'student' ? user.status : undefined}
              avatarToneClassName={roleAvatarTone(user.role)}
              trailing={
                <span className={cn('tw:text-sm tw:font-semibold tw:tabular-nums', user.attendance_percentage < 50 ? 'tw:text-destructive' : 'tw:text-warning')}>
                  {user.attendance_percentage}%
                </span>
              }
            />
          </m.li>
        ))}
      </m.ul>
    </WidgetCard>
  )
}
