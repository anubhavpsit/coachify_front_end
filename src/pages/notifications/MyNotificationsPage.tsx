import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import Icon from '../../components/common/Icon.tsx'
import {
  INBOX_CHANGED_EVENT,
  fetchInbox,
  fetchUnreadCount,
  fullDate,
  setInboxUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationLink,
  timeAgo,
  type InboxChange,
  type InboxNotification,
} from '../../lib/myNotifications'

const PAGE_SIZE = 20

/** The signed-in user's notification history (every role). */
export default function MyNotificationsPage() {
  const navigate = useNavigate()
  const role: string | undefined = (() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || '{}').role
    } catch {
      return undefined
    }
  })()

  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [items, setItems] = useState<InboxNotification[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const fetchingRef = useRef(false)

  const loadFirstPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchInbox({ limit: PAGE_SIZE, unread: filter === 'unread' })
      setItems(res.data)
      setCursor(res.meta.next_cursor)
      setHasMore(res.meta.has_more)
      setUnread(res.meta.unread_count ?? 0)
      setInboxUnreadCount(res.meta.unread_count)
    } catch {
      setError('Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  const loadMore = useCallback(async () => {
    if (!cursor || fetchingRef.current) return
    fetchingRef.current = true
    setLoadingMore(true)
    try {
      const res = await fetchInbox({ limit: PAGE_SIZE, cursor, unread: filter === 'unread' })
      setItems(prev => {
        const seen = new Set(prev.map(n => n.id))
        return [...prev, ...res.data.filter(n => !seen.has(n.id))]
      })
      setCursor(res.meta.next_cursor)
      setHasMore(res.meta.has_more)
    } catch {
      setError('Unable to load more notifications.')
    } finally {
      fetchingRef.current = false
      setLoadingMore(false)
    }
  }, [cursor, filter])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(entries => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: '200px',
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  // Read-state changed (here or in the bell) → update in place, keeping
  // the loaded pages and scroll position.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<InboxChange>).detail
      if (!detail) return
      if ('all' in detail) {
        setItems(prev => (filter === 'unread' ? [] : prev.map(x => ({ ...x, is_read: true }))))
        setUnread(0)
        setHasMore(filter === 'unread' ? false : hasMore)
        return
      }
      setItems(prev => prev.map(x => (x.id === detail.id ? { ...x, is_read: true } : x)))
      // Server count covers items marked from the bell that aren't loaded here
      fetchUnreadCount().then(setUnread).catch(() => undefined)
    }
    window.addEventListener(INBOX_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(INBOX_CHANGED_EVENT, onChange)
  }, [filter, hasMore])

  const openItem = async (n: InboxNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id) // emits INBOX_CHANGED_EVENT → local update above
      } catch {
        // non-fatal
      }
    }
    const link = notificationLink(n, role)
    if (link) navigate(link)
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead()
    } catch {
      setError('Unable to mark notifications as read.')
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
        <h6 className="fw-semibold mb-0">My Notifications</h6>
        {unread > 0 && (
          <Button variant="outline-primary" size="sm" onClick={markAll}>
            Mark all as read ({unread})
          </Button>
        )}
      </div>

      <div className="card">
        <div className="card-header border-bottom bg-base py-12 px-24 d-flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`btn btn-sm radius-8 ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
              aria-pressed={filter === f}
            >
              {f === 'all' ? 'All' : `Unread${unread > 0 ? ` (${unread})` : ''}`}
            </button>
          ))}
        </div>

        <div className="card-body p-0">
          {loading && (
            <div className="text-center py-24">
              <span className="spinner-border spinner-border-sm" />
              <span className="ms-2 text-sm">Loading notifications...</span>
            </div>
          )}

          {error && !loading && (
            <div className="px-24 py-16 text-sm">
              <span className="text-danger-600">{error}</span>{' '}
              <Button variant="link" size="sm" className="p-0 align-baseline" onClick={loadFirstPage}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-32 text-secondary-light">
              <Icon icon="iconoir:bell-off" className="text-3xl d-block mx-auto mb-8" />
              {filter === 'unread' ? "You're all caught up." : 'No notifications yet'}
            </div>
          )}

          {!loading &&
            items.map(n => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                className={`w-100 text-start border-0 border-bottom px-24 py-16 d-block ${n.is_read ? 'bg-base' : 'bg-primary-50'}`}
              >
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="d-flex align-items-start gap-2 min-w-0">
                    {!n.is_read && (
                      <span
                        className="rounded-circle bg-primary-600 flex-shrink-0 mt-6"
                        style={{ width: 8, height: 8 }}
                        aria-label="Unread"
                      />
                    )}
                    <div className="min-w-0">
                      <div className={`text-md text-primary-light ${n.is_read ? 'fw-medium' : 'fw-semibold'}`}>{n.title}</div>
                      {n.body && (
                        <div className="text-sm text-secondary-light mt-4" style={{ whiteSpace: 'pre-wrap' }}>
                          {n.body}
                        </div>
                      )}
                      <div className="text-xs text-secondary-light mt-6">
                        {n.type_label && <span className="me-2">{n.type_label}</span>}
                        {n.sender && <span className="me-2">· from {n.sender.name}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-secondary-light flex-shrink-0" title={fullDate(n.created_at)}>
                    {timeAgo(n.created_at)}
                  </span>
                </div>
              </button>
            ))}

          {!loading && hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
          {loadingMore && (
            <div className="text-center py-12">
              <span className="spinner-border spinner-border-sm" />
            </div>
          )}
          {!loading && !error && items.length > 0 && !hasMore && (
            <div className="text-center text-xs text-secondary-light py-12">No older notifications.</div>
          )}
        </div>
      </div>
    </div>
  )
}
