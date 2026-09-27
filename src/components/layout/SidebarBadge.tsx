import { useEffect, useState } from 'react'
import { getInboxUnreadCount, subscribeInboxUnread } from '../../lib/myNotifications'
import { getNoticeUnreadCount, refreshNoticeUnread, subscribeNoticeUnread } from '../../lib/noticeUnread'

const POLL_MS = 60_000

function Badge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null
  // <small>, not <span>: the collapsed sidebar hides every link <span>;
  // index.css turns this into a dot on the icon instead.
  return (
    <small className="sidebar-badge" aria-label={`${count} unread ${label}`}>
      {count > 99 ? '99+' : count}
    </small>
  )
}

/** Unread notices. Polls itself (the sidebar is always mounted). */
export function NoticeUnreadBadge() {
  const [count, setCount] = useState(getNoticeUnreadCount)

  useEffect(() => subscribeNoticeUnread(setCount), [])

  useEffect(() => {
    refreshNoticeUnread()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshNoticeUnread()
    }, POLL_MS)
    const onFocus = () => refreshNoticeUnread()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return <Badge count={count} label="notices" />
}

/** Unread notifications. Display only — the top-bar bell polls. */
export function InboxUnreadBadge() {
  const [count, setCount] = useState(getInboxUnreadCount)
  useEffect(() => subscribeInboxUnread(setCount), [])
  return <Badge count={count} label="notifications" />
}
