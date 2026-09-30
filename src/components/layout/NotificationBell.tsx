import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { Bell, BellOff, LoaderCircle } from 'lucide-react'
import { pop, wiggle } from '@/animations'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  INBOX_CHANGED_EVENT,
  fetchInbox,
  fetchUnreadCount,
  fullDate,
  getInboxUnreadCount,
  setInboxUnreadCount,
  subscribeInboxUnread,
  markAllNotificationsRead,
  markNotificationRead,
  notificationLink,
  timeAgo,
  type InboxNotification,
} from '../../lib/myNotifications'

const POLL_MS = 60_000
const PREVIEW_COUNT = 8

/** Top-bar bell: unread badge + dropdown of the latest notifications. */
export default function NotificationBell({ role }: { role?: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(getInboxUnreadCount)
  const [items, setItems] = useState<InboxNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Wiggle the bell once each time the unread count goes up (never on mount).
  const [previousUnread, setPreviousUnread] = useState(unread)
  const [bumps, setBumps] = useState(0)
  if (unread !== previousUnread) {
    if (unread > previousUnread) setBumps((n) => n + 1)
    setPreviousUnread(unread)
  }

  const refreshCount = useCallback(async () => {
    if (!localStorage.getItem('authToken')) return
    try {
      await fetchUnreadCount() // updates the shared count
    } catch {
      // keep the last known count; the bell is non-critical
    }
  }, [])

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchInbox({ limit: PREVIEW_COUNT })
      setItems(res.data)
      setInboxUnreadCount(res.meta.unread_count)
    } catch {
      setError('Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Bell and sidebar badge share one count; the bell is the only poller.
  useEffect(() => subscribeInboxUnread(setUnread), [])

  // Poll the badge, and refresh when the tab regains focus or another
  // component (the full page) changes read state.
  useEffect(() => {
    refreshCount()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshCount()
    }, POLL_MS)
    const onFocus = () => refreshCount()
    window.addEventListener('focus', onFocus)
    window.addEventListener(INBOX_CHANGED_EVENT, onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(INBOX_CHANGED_EVENT, onFocus)
    }
  }, [refreshCount])

  useEffect(() => {
    if (open) loadPreview()
  }, [open, loadPreview])

  const handleOpenItem = async (n: InboxNotification) => {
    if (!n.is_read) {
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x)))
      markNotificationRead(n.id).catch(() => undefined) // event → refreshCount()
    }
    const link = notificationLink(n, role)
    if (link) {
      setOpen(false)
      navigate(link)
    }
  }

  const handleMarkAll = async () => {
    setItems(prev => prev.map(x => ({ ...x, is_read: true })))
    setInboxUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      refreshCount()
    }
  }

  const label = unread > 99 ? '99+' : String(unread)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="tw:relative tw:rounded-full"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <m.span key={bumps} variants={wiggle} initial="idle" animate={bumps > 0 ? 'wiggle' : 'idle'} className="tw:inline-flex">
            <Bell className="tw:size-5" aria-hidden="true" />
          </m.span>
          <AnimatePresence>
            {unread > 0 && (
              <m.span
                key={label}
                variants={pop}
                initial={bumps > 0 ? 'hidden' : false}
                animate="visible"
                exit="exit"
                className="tw:absolute tw:-top-1 tw:-right-1 tw:min-w-[1.125rem] tw:rounded-full tw:bg-destructive tw:px-1 tw:text-[10px] tw:font-bold tw:leading-[1.125rem] tw:text-destructive-foreground"
              >
                {label}
              </m.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="tw:w-[22.5rem] tw:max-w-[calc(100vw-2rem)] tw:overflow-hidden tw:p-0">
        <div className="tw:flex tw:items-center tw:justify-between tw:border-b tw:border-solid tw:border-border tw:px-4 tw:py-3">
          <span className="tw:font-semibold tw:text-foreground">Notifications</span>
          {unread > 0 && (
            <Button variant="link" size="sm" className="tw:h-auto tw:px-0" onClick={handleMarkAll}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="tw:max-h-[400px] tw:overflow-y-auto">
          {loading && items.length === 0 && (
            <div className="tw:flex tw:justify-center tw:py-6 tw:text-muted-foreground" role="status" aria-label="Loading notifications">
              <LoaderCircle className="tw:size-5 tw:animate-spin" aria-hidden="true" />
            </div>
          )}
          {error && <div className="tw:px-4 tw:py-3 tw:text-sm tw:text-destructive">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="tw:flex tw:flex-col tw:items-center tw:gap-2 tw:py-6 tw:text-sm tw:text-muted-foreground">
              <BellOff className="tw:size-6" aria-hidden="true" />
              No notifications yet
            </div>
          )}
          {items.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpenItem(n)}
              className={cn(
                'tw:m-0 tw:block tw:w-full tw:cursor-pointer tw:border-0 tw:border-b tw:border-solid tw:border-border tw:px-4 tw:py-3 tw:text-left tw:transition-colors tw:hover:bg-accent',
                n.is_read ? 'tw:bg-transparent' : 'tw:bg-primary-soft/60',
              )}
            >
              <div className="tw:flex tw:items-start tw:gap-2">
                {!n.is_read && <span className="tw:mt-1.5 tw:size-2 tw:shrink-0 tw:rounded-full tw:bg-primary" aria-label="Unread" />}
                <div className="tw:min-w-0 tw:flex-1">
                  <div className={cn('tw:text-sm tw:text-foreground', n.is_read ? 'tw:font-medium' : 'tw:font-semibold')}>{n.title}</div>
                  {n.body && <div className="tw:mt-0.5 tw:line-clamp-2 tw:text-xs tw:text-muted-foreground">{n.body}</div>}
                  <div className="tw:mt-1 tw:text-xs tw:text-muted-foreground" title={fullDate(n.created_at)}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="tw:w-full tw:rounded-none tw:text-primary"
          onClick={() => {
            setOpen(false)
            navigate('/my-notifications')
          }}
        >
          View all notifications
        </Button>
      </PopoverContent>
    </Popover>
  )
}
