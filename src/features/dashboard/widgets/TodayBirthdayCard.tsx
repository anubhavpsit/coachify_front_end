import { useRef, useState } from 'react'
import { Cake, ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react'
import { m } from 'motion/react'
import { pop } from '@/animations'
import UserAvatar from '@/components/common/UserAvatar'
import WidgetCard from '@/components/common/WidgetCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { fetchTodayBirthdays } from '../services/widgetsService'

/**
 * Gate: `dashboard.birthdays` for admin/staff; always for teachers (in DashboardPage).
 * Replaces the react-slick slider with a native scroll-snap carousel.
 */
export default function TodayBirthdayCard({ title = 'Today Birthdays' }: { title?: string }) {
  const { data, loading } = useAsync(
    () =>
      fetchTodayBirthdays().catch((e) => {
        console.error('Error fetching today birthday users:', e)
        return undefined
      }),
    [],
  )
  const users = data ?? []
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const go = (dir: 1 | -1) => {
    const track = trackRef.current
    if (!track || users.length < 2) return
    const next = (index + dir + users.length) % users.length // wraps, like the old infinite slider
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' })
    setIndex(next)
  }

  return (
    <WidgetCard
      title={title}
      icon={Cake}
      loading={loading}
      skeletonRows={1}
      empty={users.length === 0}
      emptyTitle="No birthdays today 🎂"
      emptyIcon={Cake}
      maxBodyHeight={false}
      action={
        users.length > 1 ? (
          <div className="tw:flex tw:items-center tw:gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="Previous birthday">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="tw:text-xs tw:tabular-nums tw:text-muted-foreground" aria-live="polite">
              {index + 1}/{users.length}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="Next birthday">
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        ) : undefined
      }
    >
      <div
        ref={trackRef}
        className="tw:flex tw:snap-x tw:snap-mandatory tw:overflow-x-auto tw:scroll-smooth tw:[scrollbar-width:none] tw:[&::-webkit-scrollbar]:hidden"
        onScroll={(e) => {
          const el = e.currentTarget
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Today's birthdays"
      >
        {users.map((user, i) => (
          <div
            key={user.id}
            className="tw:w-full tw:shrink-0 tw:snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${users.length}`}
          >
            <div className="tw:flex tw:flex-col tw:items-center tw:gap-2 tw:rounded-xl tw:bg-gradient-to-br tw:from-primary-soft tw:to-transparent tw:px-4 tw:py-5 tw:text-center">
              <UserAvatar name={user.name} image={user.profile_image} className="tw:size-14 tw:text-base" />
              <span className="tw:text-base tw:font-semibold tw:text-foreground">{user.name}</span>
              <span className="tw:text-sm tw:capitalize tw:text-muted-foreground">Role: {user.role}</span>
              {user.role === 'student' && user.status && (
                <Badge variant={user.status === 'active' ? 'success' : 'secondary'} className="tw:capitalize">
                  {user.status}
                </Badge>
              )}
              <m.span variants={pop} initial="hidden" animate="visible">
                <Badge variant="default" className="tw:gap-1.5 tw:px-3 tw:py-1">
                  <PartyPopper aria-hidden="true" /> Birthday Today
                </Badge>
              </m.span>
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
