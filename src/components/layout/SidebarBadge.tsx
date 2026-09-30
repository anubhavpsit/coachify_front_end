import { useEffect, useState } from 'react'
import { m } from 'motion/react'
import { pop } from '@/animations'
import { cn } from '@/lib/utils'
import { getInboxUnreadCount, subscribeInboxUnread } from '../../lib/myNotifications'
import { getNoticeUnreadCount, subscribeNoticeUnread } from '../../lib/noticeUnread'

function Badge({ count, label, compact }: { count: number; label: string; compact?: boolean }) {
  // Pop only when the count goes up (not on first render or on decrease).
  const [previous, setPrevious] = useState(count)
  const [bumps, setBumps] = useState(0)
  if (count !== previous) {
    if (count > previous) setBumps((n) => n + 1)
    setPrevious(count)
  }

  if (count <= 0) return null
  const text = count > 99 ? '99+' : String(count)
  return (
    <m.small
      key={bumps}
      variants={pop}
      initial={bumps > 0 ? 'hidden' : false}
      animate="visible"
      aria-label={`${count} unread ${label}`}
      className={cn(
        'tw:rounded-full tw:bg-destructive tw:font-bold tw:text-destructive-foreground',
        compact
          ? 'tw:absolute tw:top-1.5 tw:right-1.5 tw:size-2.5 tw:ring-2 tw:ring-card tw:text-[0px]'
          : 'tw:relative tw:ml-auto tw:min-w-[1.375rem] tw:h-[1.375rem] tw:px-1.5 tw:text-[11px] tw:leading-[1.375rem] tw:text-center',
      )}
    >
      {compact ? null : text}
    </m.small>
  )
}

/** Unread notices (display only — see hooks/useNoticeUnreadPolling). */
export function NoticeUnreadBadge({ compact }: { compact?: boolean }) {
  const [count, setCount] = useState(getNoticeUnreadCount)
  useEffect(() => subscribeNoticeUnread(setCount), [])
  return <Badge count={count} label="notices" compact={compact} />
}

/** Unread notifications. Display only — the top-bar bell polls. */
export function InboxUnreadBadge({ compact }: { compact?: boolean }) {
  const [count, setCount] = useState(getInboxUnreadCount)
  useEffect(() => subscribeInboxUnread(setCount), [])
  return <Badge count={count} label="notifications" compact={compact} />
}
