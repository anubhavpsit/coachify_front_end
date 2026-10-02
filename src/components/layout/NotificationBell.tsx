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
          className="relative rounded-full"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <m.span key={bumps} variants={wiggle} initial="idle" animate={bumps > 0 ? 'wiggle' : 'idle'} className="inline-flex">
            <Bell className="size-5" aria-hidden="true" />
          </m.span>
          <AnimatePresence>
            {unread > 0 && (
              <m.span
                key={label}
                variants={pop}
                initial={bumps > 0 ? 'hidden' : false}
                animate="visible"
                exit="exit"
                className="absolute -top-1 -right-1 min-w-[1.125rem] rounded-full bg-destructive px-1 text-[10px] font-bold leading-[1.125rem] text-destructive-foreground"
              >
                {label}
              </m.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22.5rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-solid border-border px-4 py-3">
          <span className="font-semibold text-foreground">Notifications</span>
          {unread > 0 && (
            <Button variant="link" size="sm" className="h-auto px-0" onClick={handleMarkAll}>
              Mark all as read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading && items.length === 0 && (
            <div className="flex justify-center py-6 text-muted-foreground" role="status" aria-label="Loading notifications">
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            </div>
          )}
          {error && <div className="px-4 py-3 text-sm text-destructive">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
              <BellOff className="size-6" aria-hidden="true" />
              No notifications yet
            </div>
          )}
          {items.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpenItem(n)}
              className={cn(
                'm-0 block w-full cursor-pointer border-0 border-b border-solid border-border px-4 py-3 text-left transition-colors hover:bg-accent',
                n.is_read ? 'bg-transparent' : 'bg-primary-soft/60',
              )}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                <div className="min-w-0 flex-1">
                  <div className={cn('text-sm text-foreground', n.is_read ? 'font-medium' : 'font-semibold')}>{n.title}</div>
                  {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-xs text-muted-foreground" title={fullDate(n.created_at)}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="w-full rounded-none text-primary"
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
