import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Button } from 'react-bootstrap'
import Icon from '../common/Icon.tsx'
import NoticeBadges from './NoticeBadges'
import NoticeDetailModal from './NoticeDetailModal'
import NoticeFormModal from './NoticeFormModal'
import {
  getNoticeUnreadCount,
  refreshNoticeUnread,
  setNoticeUnreadCount,
  subscribeNoticeUnread,
} from '../../lib/noticeUnread'
import { fetchUnreadCount } from '../../lib/myNotifications'
import {
  API_BASE_URL,
  ROLE_LABELS,
  authHeaders,
  formatNoticeDate,
  type Notice,
  type NoticeListResponse,
} from './types'

const PAGE_SIZE = 15

/**
 * Notice Board — every role. Pinned notices first, then the feed (newest
 * first) with cursor-based infinite scroll. On the dashboard it scrolls
 * inside the card; `fullPage` (the /notices page) scrolls with the page.
 * `?notice=<id>` in the URL opens that notice directly.
 */
/**
 * compact: dashboard widget — a col-xxl-4/col-md-6 card with a 300px scroll
 * area, styled like the other dashboard cards (Low Attendance, Birthdays).
 */
export default function NoticeBoardCard({
  fullPage = false,
  compact = false,
  bare = false,
}: {
  fullPage?: boolean
  compact?: boolean
  /** Compact without the Bootstrap col wrapper (for CSS-grid parents). */
  bare?: boolean
}) {
  // "Active" = live notices (the normal Notice Board); "Expired" = past expiry
  const [tab, setTab] = useState<'active' | 'expired'>('active')
  const [pinned, setPinned] = useState<Notice[]>([])
  const [items, setItems] = useState<Notice[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [unread, setUnread] = useState(getNoticeUnreadCount)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [openId, setOpenId] = useState<number | null>(() => {
    const id = Number(new URLSearchParams(window.location.search).get('notice'))
    return Number.isInteger(id) && id > 0 ? id : null
  })
  const [formNotice, setFormNotice] = useState<Notice | null>(null)
  const [showForm, setShowForm] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const fetchingRef = useRef(false)
  const unreadRef = useRef(unread) // what this card last showed
  const itemCountRef = useRef(0)

  // silent = background re-sync (no spinner, keeps the list on screen)
  const loadFirstPage = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await axios.get<NoticeListResponse>(`${API_BASE_URL}/notices`, {
        params: { limit: PAGE_SIZE, status: tab },
        headers: authHeaders(),
      })
      setPinned(res.data.pinned ?? [])
      setItems(res.data.data)
      setCursor(res.data.meta.next_cursor)
      setHasMore(res.data.meta.has_more)
      unreadRef.current = res.data.meta.unread_count ?? 0
      setUnread(unreadRef.current)
      setNoticeUnreadCount(res.data.meta.unread_count) // sidebar badge
      setCanManage(!!res.data.meta.can_manage)
    } catch (err) {
      console.error('Error loading notices:', err)
      if (!silent) setError('Unable to load notices.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [tab])

  const loadMore = useCallback(async () => {
    if (!cursor || fetchingRef.current) return
    fetchingRef.current = true
    setLoadingMore(true)
    try {
      const res = await axios.get<NoticeListResponse>(`${API_BASE_URL}/notices`, {
        params: { limit: PAGE_SIZE, cursor, status: tab },
        headers: authHeaders(),
      })
      setItems(prev => {
        const seen = new Set(prev.map(n => n.id))
        return [...prev, ...res.data.data.filter(n => !seen.has(n.id))]
      })
      setCursor(res.data.meta.next_cursor)
      setHasMore(res.data.meta.has_more)
    } catch (err) {
      console.error('Error loading more notices:', err)
      setError('Unable to load more notices.')
    } finally {
      fetchingRef.current = false
      setLoadingMore(false)
    }
  }, [cursor, tab])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  useEffect(() => {
    itemCountRef.current = items.length
  }, [items])

  // Shared count changed elsewhere (sidebar poll found a new notice, a
  // notice's notification was read from the bell) → follow it. Re-sync the
  // list quietly too, unless the user has scrolled past the first page.
  useEffect(
    () =>
      subscribeNoticeUnread(count => {
        if (count === unreadRef.current) return // our own update echoing back
        unreadRef.current = count
        setUnread(count)
        if (itemCountRef.current <= PAGE_SIZE) loadFirstPage(true)
      }),
    [loadFirstPage],
  )

  // Infinite scroll: fetch the next page when the sentinel nears view.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      // Full page: watch the viewport. A non-scrolling root would report
      // the sentinel as always visible and fetch every page at once.
      { root: fullPage ? null : scrollRef.current, rootMargin: '120px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, fullPage])

  const markReadLocally = (opened: Notice) => {
    const wasUnread = [...pinned, ...items].some(n => n.id === opened.id && !n.is_read)
    const mark = (list: Notice[]) => list.map(n => (n.id === opened.id ? { ...n, is_read: true } : n))
    setPinned(mark)
    setItems(mark)
    if (wasUnread) {
      unreadRef.current = Math.max(0, unreadRef.current - 1)
      setUnread(unreadRef.current)
      refreshNoticeUnread() // opening it marked it read server-side
      fetchUnreadCount().catch(() => undefined) // ...and its notification (bell)
    }
  }

  const closeDetail = () => {
    setOpenId(null)
    const url = new URL(window.location.href)
    if (url.searchParams.has('notice')) {
      url.searchParams.delete('notice')
      window.history.replaceState(null, '', url.toString())
    }
  }

  const openCreate = () => {
    setFormNotice(null)
    setShowForm(true)
  }

  const openEdit = (notice: Notice) => {
    setOpenId(null)
    setFormNotice(notice)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    loadFirstPage()
  }

  const handleDeleted = () => {
    closeDetail()
    loadFirstPage()
  }

  const renderNotice = (n: Notice) => (
    <button
      key={n.id}
      type="button"
      onClick={() => setOpenId(n.id)}
      className={`w-100 text-start border-0 border-bottom ${compact ? 'px-16 py-12' : 'px-24 py-16'} d-block ${n.is_read ? 'bg-base' : 'bg-primary-50'}`}
    >
      <div className="d-flex align-items-start justify-content-between gap-2 mb-4">
        <span className={`text-md ${n.is_read ? 'fw-medium' : 'fw-semibold'} text-primary-light`}>
          {!n.is_read && (
            <span
              className="d-inline-block rounded-circle bg-primary-600 me-2 align-middle"
              style={{ width: 8, height: 8 }}
              aria-label="Unread"
            />
          )}
          {n.title}
        </span>
        <span className="d-flex flex-wrap gap-1 flex-shrink-0">
          <NoticeBadges notice={n} />
          {n.has_attachment && <i className="ri-attachment-2 text-secondary-light" title="Has attachment" />}
        </span>
      </div>
      <p
        className="text-sm text-secondary-light mb-4"
        style={compact ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
      >
        {n.body_preview}
      </p>
      <span className="text-xs text-secondary-light">
        {formatNoticeDate(n.published_at)}
        {n.posted_by && ` · ${n.posted_by.name} (${ROLE_LABELS[n.posted_by.role] ?? n.posted_by.role})`}
      </span>
    </button>
  )

  const isEmpty = !loading && !error && pinned.length === 0 && items.length === 0

  const content = (
    <div className={compact ? 'card h-100' : 'card mb-24'}>
      <div
        className={
          compact
            ? 'card-header d-flex flex-wrap justify-content-between align-items-center gap-2'
            : 'card-header border-bottom bg-base py-16 px-24 d-flex flex-wrap justify-content-between align-items-center gap-2'
        }
      >
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span
            className={
              compact
                ? 'fw-bold text-lg mb-0 d-flex align-items-center gap-2'
                : 'text-md fw-medium text-secondary-light d-flex align-items-center gap-2'
            }
          >
            {!compact && <Icon icon="mdi:bulletin-board" className="text-xl" />}
            Notice Board
            {unread > 0 && (
              <span className="badge bg-danger-600 text-white rounded-pill text-xs" title="Unread notices">
                {unread}
              </span>
            )}
          </span>
          {/* Active / Expired — compact pill toggle in the header (no extra row) */}
          <div className="notice-tabs d-inline-flex p-1 rounded-pill bg-neutral-100" role="tablist" aria-label="Notice filter">
            {(['active', 'expired'] as const).map(t => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`border-0 rounded-pill px-12 py-4 text-xs fw-semibold ${
                  tab === t ? 'bg-primary-600 text-white shadow-sm' : 'bg-transparent text-secondary-light'
                }`}
              >
                {t === 'active' ? 'Active' : 'Expired'}
              </button>
            ))}
          </div>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            title="Add Notice"
            aria-label="Add Notice"
            className={
              compact
                ? 'btn btn-primary btn-sm radius-8 d-flex align-items-center justify-content-center p-6'
                : 'btn btn-primary text-sm btn-sm px-12 py-8 radius-8 d-flex align-items-center gap-1'
            }
          >
            <Icon icon="ic:baseline-plus" className="icon text-lg" />
            {!compact && 'Add Notice'}
          </Button>
        )}
      </div>

      <div
        className="card-body p-0"
        ref={scrollRef}
        style={fullPage ? undefined : { maxHeight: compact ? 300 : 480, overflowY: 'auto' }}
      >
        {loading && (
          <div className="text-center py-24">
            <span className="spinner-border spinner-border-sm" />
            <span className="ms-2 text-sm">Loading notices...</span>
          </div>
        )}

        {error && !loading && (
          <div className="px-24 py-16 text-sm">
            <span className="text-danger-600">{error}</span>{' '}
            <Button variant="link" size="sm" className="p-0 align-baseline" onClick={() => loadFirstPage()}>
              Retry
            </Button>
          </div>
        )}

        {isEmpty && (
          <div className="text-center py-32 text-secondary-light">
            <i className="ri-notification-off-line text-3xl d-block mb-8" />
            {tab === 'expired' ? 'No expired notices' : 'No notices yet'}
          </div>
        )}

        {!loading && pinned.map(renderNotice)}
        {!loading && items.map(renderNotice)}

        {!loading && hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

        {loadingMore && (
          <div className="text-center py-12">
            <span className="spinner-border spinner-border-sm" />
          </div>
        )}

        {!loading && !isEmpty && !hasMore && !error && (
          <div className="text-center text-xs text-secondary-light py-12">{tab === 'expired' ? 'No older expired notices.' : "You're all caught up — no older notices."}</div>
        )}
      </div>

      <NoticeDetailModal
        noticeId={openId}
        canManage={canManage}
        onHide={closeDetail}
        onOpened={markReadLocally}
        onEdit={openEdit}
        onDeleted={handleDeleted}
      />

      {canManage && (
        <NoticeFormModal show={showForm} notice={formNotice} onHide={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </div>
  )

  return compact && !bare ? <div className="col-xxl-4 col-md-6">{content}</div> : content
}
