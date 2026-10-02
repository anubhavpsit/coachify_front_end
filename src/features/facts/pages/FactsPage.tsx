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
    <div className="flex h-full flex-none items-center justify-center bg-neutral-950 px-4 py-3" aria-hidden="true">
      <div className="relative h-full w-full max-w-[400px] animate-pulse overflow-hidden rounded-[20px] bg-[#1a1a2e] motion-reduce:animate-none">
        <div className="absolute right-4 bottom-28 flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="size-11 rounded-full bg-white/10" />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-20 flex flex-col gap-3 p-6">
          <div className="h-3 w-2/5 rounded-full bg-white/10" />
          <div className="h-5 w-4/5 rounded-md bg-white/10" />
          <div className="h-3.5 w-full rounded-md bg-white/10" />
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
    <div className="-m-4 overflow-hidden md:-m-6">
      <div className="flex h-[52px] items-center gap-1.5 overflow-x-auto border-b border-solid border-border bg-card px-4">
        <h1 className="sr-only">Facts</h1>
        <div role="tablist" aria-label="Facts feed" className="flex gap-1.5">
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
                  'm-0 inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 px-4 py-1.5 text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  tab === t.key ? 'bg-primary font-bold text-primary-foreground' : 'bg-muted font-medium text-foreground hover:bg-muted/70',
                )}
              >
                <t.icon className="size-3.5" aria-hidden="true" /> {t.label}
              </button>
            ))}
        </div>
        {isCoachingAdmin && (
          <Link
            to="/admin/facts"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap text-foreground no-underline hover:bg-muted/70"
          >
            <Settings className="size-3.5" aria-hidden="true" /> Manage
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="m-0 bg-destructive-soft px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex snap-y snap-mandatory flex-col overflow-y-scroll [scrollbar-width:none]" style={{ height: REEL_H }}>
        {loading ? (
          [0, 1].map((i) => (
            <div key={i} className="flex-none" style={{ height: REEL_H }}>
              <Skeleton />
            </div>
          ))
        ) : facts.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground" style={{ height: REEL_H }}>
            <FileText className="size-8" aria-hidden="true" />
            <span className="text-[15px]">{tab === 'saved' ? 'No saved facts yet — tap the bookmark on any fact.' : 'No facts found.'}</span>
          </div>
        ) : (
          facts.map((f, i) => (
            <div key={f.id} className="flex-none" style={{ height: REEL_H }}>
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
        <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-4 py-1.5 text-[13px] text-white backdrop-blur">
          <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading more…
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
