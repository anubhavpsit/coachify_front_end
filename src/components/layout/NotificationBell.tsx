import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../common/Icon.tsx'
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
  const wrapperRef = useRef<HTMLDivElement | null>(null)

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

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

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

  return (
    <div className={`dropdown${open ? ' show' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center position-relative border-0"
        onClick={() => setOpen(o => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Icon icon="iconoir:bell" className="text-primary-light text-xl" />
        {unread > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger-600 text-white text-xxs"
            style={{ fontSize: 10, minWidth: 18 }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <div
        className={`dropdown-menu to-top dropdown-menu-lg p-0${open ? ' show' : ''}`}
        style={{ width: 360, maxWidth: 'calc(100vw - 32px)', right: 0, left: 'auto' }}
      >
        <div className="d-flex align-items-center justify-content-between px-16 py-12 border-bottom">
          <span className="fw-semibold text-primary-light">Notifications</span>
          {unread > 0 && (
            <button type="button" className="border-0 bg-transparent text-primary-600 text-sm p-0" onClick={handleMarkAll}>
              Mark all as read
            </button>
          )}
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {loading && items.length === 0 && (
            <div className="text-center py-24">
              <span className="spinner-border spinner-border-sm" />
            </div>
          )}
          {error && <div className="px-16 py-12 text-sm text-danger-600">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="text-center py-24 text-secondary-light text-sm">
              <Icon icon="iconoir:bell-off" className="text-2xl d-block mx-auto mb-8" />
              No notifications yet
            </div>
          )}
          {items.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpenItem(n)}
              className={`w-100 text-start border-0 border-bottom px-16 py-12 d-block ${n.is_read ? 'bg-base' : 'bg-primary-50'}`}
            >
              <div className="d-flex align-items-start gap-2">
                {!n.is_read && (
                  <span className="rounded-circle bg-primary-600 flex-shrink-0 mt-6" style={{ width: 8, height: 8 }} />
                )}
                <div className="flex-grow-1 min-w-0">
                  <div className={`text-sm text-primary-light ${n.is_read ? 'fw-medium' : 'fw-semibold'}`}>{n.title}</div>
                  {n.body && (
                    <div
                      className="text-xs text-secondary-light mt-2"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {n.body}
                    </div>
                  )}
                  <div className="text-xs text-secondary-light mt-4" title={fullDate(n.created_at)}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="w-100 border-0 bg-transparent text-primary-600 text-sm fw-medium py-12"
          onClick={() => {
            setOpen(false)
            navigate('/my-notifications')
          }}
        >
          View all notifications
        </button>
      </div>
    </div>
  )
}
