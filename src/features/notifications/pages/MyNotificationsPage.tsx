import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, CheckCheck } from 'lucide-react'
import { m } from 'motion/react'
import { toast } from 'sonner'
import { slideUp, stagger } from '@/animations'
import PageHeader from '@/components/common/PageHeader'
import SegmentedControl from '@/components/common/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { markNotificationRead, notificationLink, type InboxNotification } from '@/lib/myNotifications'
import { useAuthUser } from '@/permissions'
import InboxItem from '../components/InboxItem'
import { useInboxFeed, type InboxFilter } from '../hooks/useInboxFeed'

/** The signed-in user's notification history (every role). */
export default function MyNotificationsPage() {
  const navigate = useNavigate()
  const role = useAuthUser()?.role
  const feed = useInboxFeed()
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const { hasMore, loadMore } = feed

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: '200px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore, feed.loading])

  const openItem = async (n: InboxNotification) => {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id) // emits INBOX_CHANGED_EVENT → local update
      } catch {
        // non-fatal
      }
    }
    const link = notificationLink(n, role)
    if (link) navigate(link)
  }

  const markAll = async () => {
    if (await feed.markAll()) toast.success('All notifications marked as read.')
  }

  return (
    <div>
      <PageHeader
        title="My Notifications"
        description="Everything sent to you, newest first"
        actions={
          feed.unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => void markAll()}>
              <CheckCheck aria-hidden="true" />
              Mark all as read ({feed.unread})
            </Button>
          )
        }
      />

      <Card className="gap-0 py-0">
        <div className="border-b border-solid border-border px-4 py-3 sm:px-6">
          <SegmentedControl<InboxFilter>
            size="sm"
            label="Notification filter"
            value={feed.filter}
            onChange={feed.setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: `Unread${feed.unread > 0 ? ` (${feed.unread})` : ''}` },
            ]}
          />
        </div>

        {feed.loading && (
          <div className="flex flex-col gap-4 p-6" role="status" aria-label="Loading notifications">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-4/5" />
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

        {!feed.loading && !feed.error && feed.items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
            <BellOff className="size-7" aria-hidden="true" />
            {feed.filter === 'unread' ? "You're all caught up." : 'No notifications yet'}
          </div>
        )}

        {!feed.loading && (
          <m.div key={feed.filter} variants={stagger(0.03)} initial="hidden" animate="visible">
            {feed.items.map((n) => (
              <m.div key={n.id} variants={slideUp}>
                <InboxItem n={n} onOpen={(item) => void openItem(item)} />
              </m.div>
            ))}
          </m.div>
        )}

        {!feed.loading && feed.hasMore && <div ref={sentinelRef} className="h-px" />}
        {feed.loadingMore && (
          <div className="flex flex-col gap-2 p-4" role="status" aria-label="Loading more notifications">
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {!feed.loading && !feed.error && feed.items.length > 0 && !feed.hasMore && (
          <div className="py-3 text-center text-xs text-muted-foreground">No older notifications.</div>
        )}
      </Card>
    </div>
  )
}
