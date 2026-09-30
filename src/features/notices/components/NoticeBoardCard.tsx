import { useEffect, useRef, useState } from 'react'
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
import NoticeFormDialog from './NoticeFormDialog'
import NoticeListItem from './NoticeListItem'

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
    <Card className={cn('tw:gap-0 tw:py-0', compact ? 'tw:h-full' : '', !compact && !fullPage && 'tw:mb-6')}>
      <div className={cn('tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-b tw:border-solid tw:border-border', compact ? 'tw:px-4 tw:py-3' : 'tw:px-6 tw:py-4')}>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <h2 className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:text-base! tw:font-semibold tw:text-foreground">
            <Megaphone className="tw:size-4 tw:text-muted-foreground" aria-hidden="true" />
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

      <div ref={scrollRef} className={cn(!fullPage && 'tw:overflow-y-auto', !fullPage && (compact ? 'tw:max-h-[300px]' : 'tw:max-h-[480px]'))}>
        {feed.loading && (
          <div className="tw:flex tw:flex-col tw:gap-4 tw:p-5" role="status" aria-label="Loading notices">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="tw:flex tw:flex-col tw:gap-2">
                <Skeleton className="tw:h-4 tw:w-1/2" />
                <Skeleton className="tw:h-3 tw:w-full" />
                <Skeleton className="tw:h-3 tw:w-1/3" />
              </div>
            ))}
          </div>
        )}

        {feed.error && !feed.loading && (
          <div className="tw:flex tw:items-center tw:gap-2 tw:px-6 tw:py-4 tw:text-sm" role="alert">
            <span className="tw:text-destructive">{feed.error}</span>
            <Button variant="link" size="sm" className="tw:h-auto tw:p-0" onClick={() => void feed.loadFirstPage()}>
              Retry
            </Button>
          </div>
        )}

        {isEmpty && (
          <div className="tw:flex tw:flex-col tw:items-center tw:gap-2 tw:py-8 tw:text-sm tw:text-muted-foreground">
            <BellOff className="tw:size-6" aria-hidden="true" />
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

        {!feed.loading && feed.hasMore && <div ref={sentinelRef} className="tw:h-px" />}

        {feed.loadingMore && (
          <div className="tw:flex tw:flex-col tw:gap-2 tw:p-4" role="status" aria-label="Loading more notices">
            <Skeleton className="tw:h-4 tw:w-1/2" />
            <Skeleton className="tw:h-3 tw:w-full" />
          </div>
        )}

        {!feed.loading && !isEmpty && !feed.hasMore && !feed.error && (
          <div className="tw:py-3 tw:text-center tw:text-xs tw:text-muted-foreground">
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

      {feed.canManage && (
        <NoticeFormDialog
          show={showForm}
          notice={formNotice}
          onHide={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            void feed.loadFirstPage()
          }}
        />
      )}
    </Card>
  )

  return compact && !bare ? <div className="col-xxl-4 col-md-6">{content}</div> : content
}
