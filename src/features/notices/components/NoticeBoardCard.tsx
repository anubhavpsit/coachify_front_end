import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BellOff, Megaphone, Plus } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { pop, slideUp, stagger } from '@/animations'
import SegmentedControl from '@/components/common/SegmentedControl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useNoticeFeed, type NoticeTab } from '../hooks/useNoticeFeed'
import type { Notice } from '../types'
import NoticeDetailDialog from './NoticeDetailDialog'
import NoticeListItem from './NoticeListItem'

// The form (react-hook-form + zod) is only fetched the first time it's opened,
// so it stays off the dashboard's first load.
const NoticeFormDialog = lazy(() => import('./NoticeFormDialog'))

function noticeIdFromUrl() {
  const id = Number(new URLSearchParams(window.location.search).get('notice'))
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Notice Board — every role. Pinned notices first, then the feed (newest
 * first) with cursor-based infinite scroll. On the dashboard (`compact`) it
 * scrolls inside the card; `fullPage` (/notices) scrolls with the page.
 * `?notice=<id>` opens that notice directly. Create/Edit/Delete are shown
 * only when the API says `meta.can_manage`.
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
  const feed = useNoticeFeed()
  const [openId, setOpenId] = useState<number | null>(noticeIdFromUrl)
  const [formNotice, setFormNotice] = useState<Notice | null>(null)
  const [showForm, setShowForm] = useState(false)
  // Stays mounted after the first open so its close animation still runs.
  const [formLoaded, setFormLoaded] = useState(false)
  if (showForm && !formLoaded) setFormLoaded(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const { hasMore, loadMore } = feed

  // Infinite scroll: fetch the next page when the sentinel nears view.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      // Full page: watch the viewport. A non-scrolling root would report the
      // sentinel as always visible and fetch every page at once.
      { root: fullPage ? null : scrollRef.current, rootMargin: '120px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, fullPage, feed.loading])

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

  const isEmpty = !feed.loading && !feed.error && feed.pinned.length === 0 && feed.items.length === 0
  const all = [...feed.pinned, ...feed.items]

  const content = (
    <Card className={cn('gap-0 py-0', compact ? 'h-full' : '', !compact && !fullPage && 'mb-6')}>
      <div className={cn('flex flex-wrap items-center justify-between gap-2 border-b border-solid border-border', compact ? 'px-4 py-3' : 'px-6 py-4')}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 flex items-center gap-2 text-base! font-semibold text-foreground">
            <Megaphone className="size-4 text-muted-foreground" aria-hidden="true" />
            Notice Board
            <AnimatePresence>
              {feed.unread > 0 && (
                <m.span key={feed.unread} variants={pop} initial="hidden" animate="visible" exit="exit">
                  <Badge variant="destructive" title="Unread notices">
                    {feed.unread}
                  </Badge>
                </m.span>
              )}
            </AnimatePresence>
          </h2>
          <SegmentedControl<NoticeTab>
            size="sm"
            label="Notice filter"
            value={feed.tab}
            onChange={feed.setTab}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
        </div>
        {feed.canManage && (
          <Button size={compact ? 'icon-sm' : 'sm'} onClick={openCreate} title="Add Notice" aria-label="Add Notice">
            <Plus aria-hidden="true" />
            {!compact && 'Add Notice'}
          </Button>
        )}
      </div>

      <div ref={scrollRef} className={cn(!fullPage && 'overflow-y-auto', !fullPage && (compact ? 'max-h-[300px]' : 'max-h-[480px]'))}>
        {feed.loading && (
          <div className="flex flex-col gap-4 p-5" role="status" aria-label="Loading notices">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        )}

        {feed.error && !feed.loading && (
          <div className="flex items-center gap-2 px-6 py-4 text-sm" role="alert">
            <span className="text-destructive">{feed.error}</span>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void feed.loadFirstPage()}>
              Retry
            </Button>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <BellOff className="size-6" aria-hidden="true" />
            {feed.tab === 'expired' ? 'No expired notices' : 'No notices yet'}
          </div>
        )}

        {!feed.loading && (
          <m.div key={feed.tab} variants={stagger(0.03)} initial="hidden" animate="visible">
            {all.map((n) => (
              <m.div key={n.id} variants={slideUp}>
                <NoticeListItem notice={n} compact={compact} onOpen={setOpenId} />
              </m.div>
            ))}
          </m.div>
        )}

        {!feed.loading && feed.hasMore && <div ref={sentinelRef} className="h-px" />}

        {feed.loadingMore && (
          <div className="flex flex-col gap-2 p-4" role="status" aria-label="Loading more notices">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        )}

        {!feed.loading && !isEmpty && !feed.hasMore && !feed.error && (
          <div className="py-3 text-center text-xs text-muted-foreground">
            {feed.tab === 'expired' ? 'No older expired notices.' : "You're all caught up — no older notices."}
          </div>
        )}
      </div>

      <NoticeDetailDialog
        noticeId={openId}
        canManage={feed.canManage}
        onHide={closeDetail}
        onOpened={feed.markReadLocally}
        onEdit={openEdit}
        onDeleted={() => {
          closeDetail()
          void feed.loadFirstPage()
        }}
      />

      {feed.canManage && formLoaded && (
        <Suspense fallback={null}>
          <NoticeFormDialog
            show={showForm}
            notice={formNotice}
            onHide={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false)
              void feed.loadFirstPage()
            }}
          />
        </Suspense>
      )}
    </Card>
  )

  return compact && !bare ? <div className="col-xxl-4 col-md-6">{content}</div> : content
}
