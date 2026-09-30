import { CalendarHeart } from 'lucide-react'
import { m } from 'motion/react'
import { slideUp, stagger } from '@/animations'
import PersonRow from '@/components/common/PersonRow'
import WidgetCard from '@/components/common/WidgetCard'
import { useAsync } from '@/hooks/useAsync'
import { fetchMonthBirthdays } from '../services/widgetsService'
import { roleAvatarTone } from './roleTone'

/** Gate: `dashboard.birthdays` (in DashboardPage). */
export default function BirthdayCard({ title = 'Birthday this month' }: { title?: string }) {
  // Legacy behaviour: a failed request just shows the empty state.
  const { data, loading } = useAsync(
    () =>
      fetchMonthBirthdays().catch((e) => {
        console.error('Error fetching birthday users:', e)
        return undefined
      }),
    [],
  )
  const users = data ?? []
  return (
    <WidgetCard title={title} icon={CalendarHeart} loading={loading} empty={users.length === 0} emptyTitle="No birthdays this month." emptyIcon={CalendarHeart}>
      <m.ul className="tw:m-0 tw:list-none tw:divide-y tw:divide-border tw:p-0" variants={stagger(0.04)} initial="hidden" animate="visible">
        {users.map((user) => (
          <m.li key={user.id} variants={slideUp}>
            <PersonRow
              name={user.name}
              image={user.profile_image}
              subtitle={<span className="tw:capitalize">{user.role}</span>}
              status={user.role === 'student' ? user.status : undefined}
              avatarToneClassName={roleAvatarTone(user.role)}
            />
          </m.li>
        ))}
      </m.ul>
    </WidgetCard>
  )
}
