import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, FileText, LoaderCircle, Settings, Sparkles, Star } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { ROLES } from '@/constants/roles'
import { cn } from '@/lib/utils'
import { usePermission } from '@/permissions'
import ReelCard from '../components/ReelCard'
import ShareSheet from '../components/ShareSheet'
import { fetchFeedPage, markRead, optIn, optOut, toggleLike, toggleSave, type Fact, type FeedTab } from '../services/factsService'

// Feed fills the screen under the top bar (64px) and the tab bar (52px).
const REEL_H = 'calc(100dvh - 116px)'

function Skeleton() {
  return (
    <div className="tw:flex tw:h-full tw:flex-none tw:items-center tw:justify-center tw:bg-neutral-950 tw:px-4 tw:py-3" aria-hidden="true">
      <div className="tw:relative tw:h-full tw:w-full tw:max-w-[400px] tw:animate-pulse tw:overflow-hidden tw:rounded-[20px] tw:bg-[#1a1a2e] tw:motion-reduce:animate-none">
        <div className="tw:absolute tw:right-4 tw:bottom-28 tw:flex tw:flex-col tw:gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tw:size-11 tw:rounded-full tw:bg-white/10" />
          ))}
        </div>
        <div className="tw:absolute tw:bottom-0 tw:left-0 tw:right-20 tw:flex tw:flex-col tw:gap-3 tw:p-6">
          <div className="tw:h-3 tw:w-2/5 tw:rounded-full tw:bg-white/10" />
          <div className="tw:h-5 tw:w-4/5 tw:rounded-md tw:bg-white/10" />
          <div className="tw:h-3.5 tw:w-full tw:rounded-md tw:bg-white/10" />
        </div>
      </div>
    </div>
  )
}

/**
 * Facts feed. Route has no guard (Q9). In-page gates kept exactly: the
 * "Featured" tab and the "Manage" link are role coaching_admin only.
 */
export default function FactsPage() {
  const { hasRole } = usePermission()
  const isCoachingAdmin = hasRole(ROLES.COACHING_ADMIN)
  const [tab, setTab] = useState<FeedTab>('all')
  const [facts, setFacts] = useState<Fact[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState<Fact | null>(null)
  const [optingOut, setOptingOut] = useState<Fact | null>(null)
  const readSet = useRef(new Set<number>())

  useEffect(() => {
    let alive = true
    const token = localStorage.getItem('authToken')
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no request to wait for
      setError('Sign in to view facts.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setFacts([])
    fetchFeedPage(tab, 1)
      .then((r) => {
        if (!alive) return
        setFacts(r.list)
        setPage(r.current)
        setLastPage(r.last)
      })
      .catch(() => alive && setError('Unable to load facts.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [tab])

  // Next page when the card three from the end comes into view (legacy waypoint).
  const loadMore = useCallback(() => {
    if (loading || loadingMore || page >= lastPage) return
    setLoadingMore(true)
    fetchFeedPage(tab, page + 1)
      .then((r) => {
        setFacts((prev) => [...prev, ...r.list.filter((f) => !prev.some((p) => p.id === f.id))])
        setPage(r.current)
        setLastPage(r.last)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [loading, loadingMore, page, lastPage, tab])

  const observer = useRef<IntersectionObserver | null>(null)
  const waypoint = useCallback(
    (el: HTMLElement | null) => {
      observer.current?.disconnect()
      if (!el || typeof IntersectionObserver === 'undefined') return
      observer.current = new IntersectionObserver(([e]) => e.isIntersecting && loadMore(), { rootMargin: '200px', threshold: 0.2 })
      observer.current.observe(el)
    },
    [loadMore],
  )

  const patch = (id: number, p: Partial<Fact>) => setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, ...p } : f)))

  const onRead = useCallback((id: number) => {
    if (readSet.current.has(id)) return
    readSet.current.add(id)
    markRead(id).catch(() => {})
  }, [])

  const onLike = useCallback(async (f: Fact) => {
    try {
      const r = await toggleLike(f.id)
      patch(f.id, { liked_by_me: r.liked, likes_count: r.likes_count })
    } catch {
      toast.error('Could not update the like.')
    }
  }, [])

  const onSave = useCallback(async (f: Fact) => {
    try {
      const saved = await toggleSave(f.id)
      patch(f.id, { saved_by_me: saved })
      toast.success(saved ? 'Saved.' : 'Removed from saved.')
    } catch {
      toast.error('Could not update saved facts.')
    }
  }, [])

  const onOptIn = useCallback(async (f: Fact) => {
    try {
      await optIn(f.id)
      patch(f.id, { is_opted_in: true })
      toast.success('Added to your institute’s feed.')
    } catch {
      toast.error('Could not opt in.')
    }
  }, [])

  const confirmOptOut = async () => {
    try {
      await optOut(optingOut!.id)
      patch(optingOut!.id, { is_opted_in: false })
      toast.success('Removed from your institute’s feed.')
    } catch (err) {
      toast.error('Could not opt out.')
      throw err
    }
  }

  const tabs: { key: FeedTab; label: string; icon: typeof Star; show: boolean }[] = [
    { key: 'all', label: 'For You', icon: Star, show: true },
    { key: 'saved', label: 'Saved', icon: Bookmark, show: true },
    { key: 'superadmin', label: 'Featured', icon: Sparkles, show: isCoachingAdmin },
  ]

  return (
    <div className="tw:-m-4 tw:overflow-hidden tw:md:-m-6">
      <div className="tw:flex tw:h-[52px] tw:items-center tw:gap-1.5 tw:overflow-x-auto tw:border-b tw:border-solid tw:border-border tw:bg-card tw:px-4">
        <h1 className="tw:sr-only">Facts</h1>
        <div role="tablist" aria-label="Facts feed" className="tw:flex tw:gap-1.5">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'tw:m-0 tw:inline-flex tw:cursor-pointer tw:items-center tw:gap-1.5 tw:rounded-full tw:border-0 tw:px-4 tw:py-1.5 tw:text-[13px] tw:whitespace-nowrap tw:transition-colors tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
                  tab === t.key ? 'tw:bg-primary tw:font-bold tw:text-primary-foreground' : 'tw:bg-muted tw:font-medium tw:text-foreground tw:hover:bg-muted/70',
                )}
              >
                <t.icon className="tw:size-3.5" aria-hidden="true" /> {t.label}
              </button>
            ))}
        </div>
        {isCoachingAdmin && (
          <Link
            to="/admin/facts"
            className="tw:ml-auto tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-full tw:bg-muted tw:px-3.5 tw:py-1.5 tw:text-[13px] tw:font-medium tw:whitespace-nowrap tw:text-foreground tw:no-underline tw:hover:bg-muted/70"
          >
            <Settings className="tw:size-3.5" aria-hidden="true" /> Manage
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="tw:m-0 tw:bg-destructive-soft tw:px-4 tw:py-2.5 tw:text-sm tw:text-destructive">
          {error}
        </p>
      )}

      <div className="tw:flex tw:snap-y tw:snap-mandatory tw:flex-col tw:overflow-y-scroll tw:[scrollbar-width:none]" style={{ height: REEL_H }}>
        {loading ? (
          [0, 1].map((i) => (
            <div key={i} className="tw:flex-none" style={{ height: REEL_H }}>
              <Skeleton />
            </div>
          ))
        ) : facts.length === 0 && !error ? (
          <div className="tw:flex tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:text-muted-foreground" style={{ height: REEL_H }}>
            <FileText className="tw:size-8" aria-hidden="true" />
            <span className="tw:text-[15px]">{tab === 'saved' ? 'No saved facts yet — tap the bookmark on any fact.' : 'No facts found.'}</span>
          </div>
        ) : (
          facts.map((f, i) => (
            <div key={f.id} className="tw:flex-none" style={{ height: REEL_H }}>
              <ReelCard
                fact={f}
                index={i}
                featured={tab === 'superadmin'}
                onLike={onLike}
                onSave={onSave}
                onShare={setSharing}
                onRead={onRead}
                onOptIn={onOptIn}
                onOptOut={setOptingOut}
                waypoint={i === Math.max(0, facts.length - 3) ? waypoint : undefined}
              />
            </div>
          ))
        )}
      </div>

      {loadingMore && (
        <div role="status" className="tw:fixed tw:bottom-5 tw:left-1/2 tw:z-50 tw:flex tw:-translate-x-1/2 tw:items-center tw:gap-2 tw:rounded-full tw:bg-black/65 tw:px-4 tw:py-1.5 tw:text-[13px] tw:text-white tw:backdrop-blur">
          <LoaderCircle className="tw:size-3.5 tw:animate-spin tw:motion-reduce:animate-none" aria-hidden="true" /> Loading more…
        </div>
      )}

      <ShareSheet fact={sharing} onClose={() => setSharing(null)} onShared={(id, n) => patch(id, { shares_count: n })} />
      <ConfirmDialog
        open={!!optingOut}
        onOpenChange={(o) => !o && setOptingOut(null)}
        title="Opt out of this featured fact?"
        description={
          <>
            <strong>{optingOut?.title}</strong> will no longer show in your institute&apos;s feed. You can opt in again from this tab.
          </>
        }
        confirmLabel="Yes, opt out"
        cancelLabel="No"
        destructive
        onConfirm={confirmOptOut}
      />
    </div>
  )
}
