import { useCallback, useEffect, useRef, useState } from 'react'
import {
  INBOX_CHANGED_EVENT,
  fetchInbox,
  fetchUnreadCount,
  markAllNotificationsRead,
  setInboxUnreadCount,
  type InboxChange,
  type InboxNotification,
} from '@/lib/myNotifications'

export const INBOX_PAGE_SIZE = 20
export type InboxFilter = 'all' | 'unread'

/** Logic of the legacy MyNotificationsPage (paging, bell sync, mark-all), unchanged. */
export function useInboxFeed() {
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [items, setItems] = useState<InboxNotification[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  const loadFirstPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchInbox({ limit: INBOX_PAGE_SIZE, unread: filter === 'unread' })
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
      const res = await fetchInbox({ limit: INBOX_PAGE_SIZE, cursor, unread: filter === 'unread' })
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id))
        return [...prev, ...res.data.filter((n) => !seen.has(n.id))]
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
    void loadFirstPage()
  }, [loadFirstPage])

  // Read-state changed (here or in the bell) → update in place, keeping the
  // loaded pages and scroll position.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<InboxChange>).detail
      if (!detail) return
      if ('all' in detail) {
        setItems((prev) => (filter === 'unread' ? [] : prev.map((x) => ({ ...x, is_read: true }))))
        setUnread(0)
        setHasMore((h) => (filter === 'unread' ? false : h))
        return
      }
      setItems((prev) => prev.map((x) => (x.id === detail.id ? { ...x, is_read: true } : x)))
      // Server count covers items marked from the bell that aren't loaded here
      fetchUnreadCount().then(setUnread).catch(() => undefined)
    }
    window.addEventListener(INBOX_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(INBOX_CHANGED_EVENT, onChange)
  }, [filter])

  const markAll = async () => {
    try {
      await markAllNotificationsRead()
      return true
    } catch {
      setError('Unable to mark notifications as read.')
      return false
    }
  }

  return { filter, setFilter, items, hasMore, unread, loading, loadingMore, error, loadFirstPage, loadMore, markAll }
}
