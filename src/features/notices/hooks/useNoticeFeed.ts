import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchUnreadCount } from '@/lib/myNotifications'
import { getNoticeUnreadCount, refreshNoticeUnread, setNoticeUnreadCount, subscribeNoticeUnread } from '@/lib/noticeUnread'
import { NOTICE_PAGE_SIZE, listNotices } from '../services/noticesService'
import type { Notice } from '../types'

export type NoticeTab = 'active' | 'expired'

/**
 * Notice Board data logic, ported from the legacy NoticeBoardCard:
 * first page (+ pinned), cursor "load more", shared unread count sync,
 * quiet re-sync when the count changes elsewhere, local mark-as-read.
 */
export function useNoticeFeed() {
  const [tab, setTab] = useState<NoticeTab>('active')
  const [pinned, setPinned] = useState<Notice[]>([])
  const [items, setItems] = useState<Notice[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [unread, setUnread] = useState(getNoticeUnreadCount)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchingRef = useRef(false)
  const unreadRef = useRef(unread) // what this card last showed
  const itemCountRef = useRef(0)

  // silent = background re-sync (no spinner, keeps the list on screen)
  const loadFirstPage = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      setError(null)
      try {
        const data = await listNotices({ status: tab })
        setPinned(data.pinned ?? [])
        setItems(data.data)
        setCursor(data.meta.next_cursor)
        setHasMore(data.meta.has_more)
        unreadRef.current = data.meta.unread_count ?? 0
        setUnread(unreadRef.current)
        setNoticeUnreadCount(data.meta.unread_count) // sidebar badge
        setCanManage(!!data.meta.can_manage) // server decides who may manage notices
      } catch (err) {
        console.error('Error loading notices:', err)
        if (!silent) setError('Unable to load notices.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [tab],
  )

  const loadMore = useCallback(async () => {
    if (!cursor || fetchingRef.current) return
    fetchingRef.current = true
    setLoadingMore(true)
    try {
      const data = await listNotices({ status: tab, cursor })
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id))
        return [...prev, ...data.data.filter((n) => !seen.has(n.id))]
      })
      setCursor(data.meta.next_cursor)
      setHasMore(data.meta.has_more)
    } catch (err) {
      console.error('Error loading more notices:', err)
      setError('Unable to load more notices.')
    } finally {
      fetchingRef.current = false
      setLoadingMore(false)
    }
  }, [cursor, tab])

  useEffect(() => {
    void loadFirstPage()
  }, [loadFirstPage])

  useEffect(() => {
    itemCountRef.current = items.length
  }, [items])

  // Shared count changed elsewhere (sidebar poll, bell) → follow it, and
  // re-sync quietly unless the user has scrolled past the first page.
  useEffect(
    () =>
      subscribeNoticeUnread((count) => {
        if (count === unreadRef.current) return // our own update echoing back
        unreadRef.current = count
        setUnread(count)
        if (itemCountRef.current <= NOTICE_PAGE_SIZE) void loadFirstPage(true)
      }),
    [loadFirstPage],
  )

  const markReadLocally = useCallback(
    (opened: Notice) => {
      const wasUnread = [...pinned, ...items].some((n) => n.id === opened.id && !n.is_read)
      const mark = (list: Notice[]) => list.map((n) => (n.id === opened.id ? { ...n, is_read: true } : n))
      setPinned(mark)
      setItems(mark)
      if (wasUnread) {
        unreadRef.current = Math.max(0, unreadRef.current - 1)
        setUnread(unreadRef.current)
        void refreshNoticeUnread() // opening it marked it read server-side
        fetchUnreadCount().catch(() => undefined) // ...and its notification (bell)
      }
    },
    [pinned, items],
  )

  return { tab, setTab, pinned, items, hasMore, unread, canManage, loading, loadingMore, error, loadFirstPage, loadMore, markReadLocally }
}
