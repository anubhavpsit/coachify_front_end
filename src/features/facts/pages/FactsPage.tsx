import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { Bookmark, ChevronDown, ChevronUp, FileText, LoaderCircle, Settings, Sparkles, Star } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { ROLES } from '@/constants/roles'
import { cn } from '@/lib/utils'
import { usePermission } from '@/permissions'
import { getTenantBrandName } from '@/utils/branding'
import ReelCard from '../components/ReelCard'
import ShareSheet from '../components/ShareSheet'
import { fetchFeedPage, markRead, optIn, optOut, toggleLike, toggleSave, type Fact, type FeedTab } from '../services/factsService'

function ReelSkeleton() {
  return (
    <div className="flex h-full items-center justify-center md:py-4 md:pr-20" role="status" aria-label="Loading facts">
      <div className="relative h-full w-full animate-pulse overflow-hidden bg-neutral-800 motion-reduce:animate-none md:aspect-[9/16] md:w-auto md:rounded-2xl">
        <div className="absolute right-2 bottom-28 flex flex-col gap-4 md:hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className="size-12 rounded-full bg-white/10" />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-20 flex flex-col gap-3 p-4 pb-5">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-white/10" />
            <div className="h-3 w-28 rounded-full bg-white/10" />
          </div>
          <div className="h-4 w-4/5 rounded-md bg-white/10" />
          <div className="h-3.5 w-full rounded-md bg-white/10" />
        </div>
      </div>
    </div>
  )
}

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

/**
 * Facts feed, full-screen and vertically snapping like Reels / Shorts.
 * Route has no guard (Q9). In-page gates kept exactly: the "Featured" tab and
 * the "Manage" link are role coaching_admin only.
 */
export default function FactsPage() {
  const { hasRole } = usePermission()
  const isCoachingAdmin = hasRole(ROLES.COACHING_ADMIN)
  const reduceMotion = useReducedMotion()
  const [tab, setTab] = useState<FeedTab>('all')
  const [facts, setFacts] = useState<Fact[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState<Fact | null>(null)
  const [optingOut, setOptingOut] = useState<Fact | null>(null)
  const [active, setActive] = useState(0)
  const readSet = useRef(new Set<number>())
  const scroller = useRef<HTMLDivElement | null>(null)
  const brand = getTenantBrandName()

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
    if (scroller.current) scroller.current.scrollTop = 0
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

  // ---- Navigation (buttons, ↑/↓, J/K, PageUp/PageDown) ----
  const go = useCallback(
    (dir: 1 | -1) => {
      const el = scroller.current
      if (!el || !el.clientHeight) return
      const current = Math.round(el.scrollTop / el.clientHeight)
      el.scrollTo({ top: (current + dir) * el.clientHeight, behavior: reduceMotion ? 'auto' : 'smooth' })
    },
    [reduceMotion],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      if (['ArrowDown', 'PageDown', 'j'].includes(e.key)) {
        e.preventDefault()
        go(1)
      } else if (['ArrowUp', 'PageUp', 'k'].includes(e.key)) {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onScroll = () => {
    const el = scroller.current
    if (el && el.clientHeight) setActive(Math.round(el.scrollTop / el.clientHeight))
  }

  const patch = useCallback((id: number, p: Partial<Fact>) => setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, ...p } : f))), [])

  const onRead = useCallback((id: number) => {
    if (readSet.current.has(id)) return
    readSet.current.add(id)
    markRead(id).catch(() => {})
  }, [])

  // Optimistic like (same request); the server's answer wins, a failure rolls back.
  const onLike = useCallback(async (f: Fact) => {
    const before = { liked_by_me: f.liked_by_me, likes_count: f.likes_count }
    const liked = !f.liked_by_me
    patch(f.id, { liked_by_me: liked, likes_count: Math.max(0, (f.likes_count ?? 0) + (liked ? 1 : -1)) })
    try {
      const r = await toggleLike(f.id)
      patch(f.id, { liked_by_me: r.liked, likes_count: r.likes_count ?? (f.likes_count ?? 0) + (r.liked ? 1 : -1) })
    } catch {
      patch(f.id, before)
      toast.error('Could not update the like.')
    }
  }, [patch])

  const onSave = useCallback(async (f: Fact) => {
    try {
      const saved = await toggleSave(f.id)
      patch(f.id, { saved_by_me: saved })
      toast.success(saved ? 'Saved.' : 'Removed from saved.')
    } catch {
      toast.error('Could not update saved facts.')
    }
  }, [patch])

  const onOptIn = useCallback(async (f: Fact) => {
    try {
      await optIn(f.id)
      patch(f.id, { is_opted_in: true })
      toast.success('Added to your institute’s feed.')
    } catch {
      toast.error('Could not opt in.')
    }
  }, [patch])

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

  const hasMore = page < lastPage
  const atEnd = active >= facts.length - 1 && !hasMore
  const showNav = !loading && facts.length > 0

  return (
    <div className="relative h-full overflow-hidden bg-neutral-950 text-white">
      <h1 className="sr-only">Facts</h1>

      {/* Tabs float over the feed, like the For You / Following switch. */}
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 px-3 pt-3 md:pr-20', isCoachingAdmin && 'pr-14')}>
        <div role="tablist" aria-label="Facts feed" className="pointer-events-auto flex gap-1 rounded-full bg-black/45 p-1 backdrop-blur-md">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => {
                  setTab(t.key)
                  setActive(0)
                }}
                className={cn(
                  'm-0 inline-flex cursor-pointer items-center gap-1.5 rounded-full border-0 px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-white/60',
                  tab === t.key ? 'bg-white font-bold text-neutral-900' : 'bg-transparent font-medium text-white/85 hover:bg-white/15 hover:text-white',
                )}
              >
                <t.icon className="size-3.5" aria-hidden="true" /> {t.label}
              </button>
            ))}
        </div>
        {isCoachingAdmin && (
          <Link
            to="/admin/facts"
            aria-label="Manage"
            title="Manage facts"
            className="pointer-events-auto absolute top-3 right-3 inline-flex size-9 items-center justify-center gap-1.5 rounded-full bg-black/45 text-[13px] font-medium text-white no-underline backdrop-blur-md hover:bg-black/65 md:static md:size-auto md:px-3.5 md:py-2"
          >
            <Settings className="size-4" aria-hidden="true" /> <span className="hidden md:inline">Manage</span>
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="absolute inset-x-0 top-16 z-20 m-0 mx-auto w-fit max-w-[90%] rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground shadow-lg">
          {error}
        </p>
      )}

      <div ref={scroller} onScroll={onScroll} data-reel-scroller role="feed" aria-busy={loading || loadingMore} aria-label="Facts" className="absolute inset-0 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
          <ReelSkeleton />
        ) : facts.length === 0 && !error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/10">
              {tab === 'saved' ? <Bookmark className="size-7" aria-hidden="true" /> : <FileText className="size-7" aria-hidden="true" />}
            </span>
            <p className="m-0 text-lg font-semibold">{tab === 'saved' ? 'No saved facts yet' : 'No facts found.'}</p>
            {tab === 'saved' && <p className="m-0 max-w-xs text-sm text-white/70">Tap the bookmark on any fact to keep it here.</p>}
          </div>
        ) : (
          facts.map((f, i) => (
            <ReelCard
              key={f.id}
              fact={f}
              index={i}
              setSize={hasMore ? -1 : facts.length}
              featured={tab === 'superadmin'}
              author={tab === 'superadmin' ? 'Featured' : brand}
              onLike={onLike}
              onSave={onSave}
              onShare={setSharing}
              onRead={onRead}
              onOptIn={onOptIn}
              onOptOut={setOptingOut}
              waypoint={i === Math.max(0, facts.length - 3) ? waypoint : undefined}
            />
          ))
        )}
      </div>

      {/* Desktop: previous / next, like the Shorts arrows. */}
      {showNav && (
        <div className="absolute top-1/2 right-4 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={active <= 0}
            aria-label="Previous fact"
            title="Previous (↑)"
            className="m-0 flex size-12 cursor-pointer items-center justify-center rounded-full border-0 bg-white/10 p-0 text-white outline-none hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-white/60 disabled:cursor-default disabled:opacity-30"
          >
            <ChevronUp className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={atEnd}
            aria-label="Next fact"
            title="Next (↓)"
            className="m-0 flex size-12 cursor-pointer items-center justify-center rounded-full border-0 bg-white/10 p-0 text-white outline-none hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-white/60 disabled:cursor-default disabled:opacity-30"
          >
            <ChevronDown className="size-6" aria-hidden="true" />
          </button>
        </div>
      )}

      {loadingMore && (
        <div role="status" className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 px-4 py-1.5 text-[13px] text-white backdrop-blur">
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
