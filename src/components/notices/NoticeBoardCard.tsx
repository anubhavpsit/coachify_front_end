import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Button } from 'react-bootstrap'
import Icon from '../common/Icon.tsx'
import NoticeBadges from './NoticeBadges'
import NoticeDetailModal from './NoticeDetailModal'
import NoticeFormModal from './NoticeFormModal'
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
 * Dashboard Notice Board — every role. Pinned notices first, then the feed
 * (newest first) with cursor-based infinite scroll inside the card.
 * Opening `/dashboard?notice=<id>` opens that notice directly.
 */
export default function NoticeBoardCard() {
  const [pinned, setPinned] = useState<Notice[]>([])
  const [items, setItems] = useState<Notice[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [unread, setUnread] = useState(0)
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

  const loadFirstPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get<NoticeListResponse>(`${API_BASE_URL}/notices`, {
        params: { limit: PAGE_SIZE },
        headers: authHeaders(),
      })
      setPinned(res.data.pinned ?? [])
      setItems(res.data.data)
      setCursor(res.data.meta.next_cursor)
      setHasMore(res.data.meta.has_more)
      setUnread(res.data.meta.unread_count ?? 0)
      setCanManage(!!res.data.meta.can_manage)
    } catch (err) {
      console.error('Error loading notices:', err)
      setError('Unable to load notices.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (!cursor || fetchingRef.current) return
    fetchingRef.current = true
    setLoadingMore(true)
    try {
      const res = await axios.get<NoticeListResponse>(`${API_BASE_URL}/notices`, {
        params: { limit: PAGE_SIZE, cursor },
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
  }, [cursor])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  // Infinite scroll: fetch the next page when the sentinel nears view.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { root: scrollRef.current, rootMargin: '120px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const markReadLocally = (opened: Notice) => {
    const wasUnread = [...pinned, ...items].some(n => n.id === opened.id && !n.is_read)
    const mark = (list: Notice[]) => list.map(n => (n.id === opened.id ? { ...n, is_read: true } : n))
    setPinned(mark)
    setItems(mark)
    if (wasUnread) setUnread(u => Math.max(0, u - 1))
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
      className={`w-100 text-start border-0 border-bottom px-24 py-16 d-block ${n.is_read ? 'bg-base' : 'bg-primary-50'}`}
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
      <p className="text-sm text-secondary-light mb-4">{n.body_preview}</p>
      <span className="text-xs text-secondary-light">
        {formatNoticeDate(n.published_at)}
        {n.posted_by && ` · ${n.posted_by.name} (${ROLE_LABELS[n.posted_by.role] ?? n.posted_by.role})`}
      </span>
    </button>
  )

  const isEmpty = !loading && !error && pinned.length === 0 && items.length === 0

  return (
    <div className="card mb-24">
      <div className="card-header border-bottom bg-base py-16 px-24 d-flex justify-content-between align-items-center">
        <span className="text-md fw-medium text-secondary-light d-flex align-items-center gap-2">
          <Icon icon="mdi:bulletin-board" className="text-xl" />
          Notice Board
          {unread > 0 && (
            <span className="badge bg-danger-600 text-white rounded-pill text-xs" title="Unread notices">
              {unread}
            </span>
          )}
        </span>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={openCreate}
            className="btn btn-primary text-sm btn-sm px-12 py-8 radius-8 d-flex align-items-center gap-1"
          >
            <Icon icon="ic:baseline-plus" className="icon text-lg" />
            Add Notice
          </Button>
        )}
      </div>

      <div className="card-body p-0" ref={scrollRef} style={{ maxHeight: 480, overflowY: 'auto' }}>
        {loading && (
          <div className="text-center py-24">
            <span className="spinner-border spinner-border-sm" />
            <span className="ms-2 text-sm">Loading notices...</span>
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

        {isEmpty && (
          <div className="text-center py-32 text-secondary-light">
            <i className="ri-notification-off-line text-3xl d-block mb-8" />
            No notices yet
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
          <div className="text-center text-xs text-secondary-light py-12">You're all caught up — no older notices.</div>
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
}
