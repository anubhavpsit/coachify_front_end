import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Bookmark, ExternalLink, Heart, Pin, Share2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { absoluteUrl, factImageSrc, type Fact } from '../services/factsService'

// Background for facts without an image — cycles by position (legacy palette).
const GRADIENTS = [
  'linear-gradient(160deg,#4f46e5 0%,#7c3aed 100%)',
  'linear-gradient(160deg,#059669 0%,#0d9488 100%)',
  'linear-gradient(160deg,#ea580c 0%,#dc2626 100%)',
  'linear-gradient(160deg,#1d4ed8 0%,#0891b2 100%)',
  'linear-gradient(160deg,#be185d 0%,#ec4899 100%)',
  'linear-gradient(160deg,#b45309 0%,#ea580c 100%)',
]

function RailButton({ label, pressed, onClick, children, caption, activeClass }: { label: string; pressed?: boolean; onClick: () => void; children: ReactNode; caption?: ReactNode; activeClass?: string }) {
  return (
    <div className="tw:flex tw:flex-col tw:items-center tw:gap-1">
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          'tw:m-0 tw:flex tw:size-12 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-full tw:border-0 tw:bg-black/40 tw:p-0 tw:text-white tw:backdrop-blur tw:transition-[transform,background-color] tw:outline-none tw:hover:bg-black/60 tw:focus-visible:ring-[3px] tw:focus-visible:ring-white/60 tw:active:scale-90',
          pressed && activeClass,
        )}
      >
        {children}
      </button>
      {caption !== undefined && <span className="tw:text-[11px] tw:leading-none tw:font-semibold tw:text-white/85">{caption}</span>}
    </div>
  )
}

interface Props {
  fact: Fact
  index: number
  featured: boolean
  onLike: (f: Fact) => void
  onSave: (f: Fact) => void
  onShare: (f: Fact) => void
  onRead: (id: number) => void
  onOptIn: (f: Fact) => void
  onOptOut: (f: Fact) => void
  /** Set on the card a few before the end so scrolling to it loads the next page. */
  waypoint?: (el: HTMLElement | null) => void
}

/** One full-height fact "reel". Read is reported once when 70% of it is visible (legacy). */
function ReelCard({ fact: f, index, featured, onLike, onSave, onShare, onRead, onOptIn, onOptOut, waypoint }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const hasImage = !!f.image_url

  useLayoutEffect(() => {
    if (!expanded && textRef.current) setTruncated(textRef.current.scrollHeight > textRef.current.clientHeight + 1)
  }, [f.content, expanded])

  useEffect(() => {
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          onRead(f.id)
          io.disconnect()
        }
      },
      { threshold: 0.7 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [f.id, onRead])

  return (
    <section ref={waypoint} aria-label={f.title} className="tw:flex tw:h-full tw:flex-none tw:snap-start tw:items-center tw:justify-center tw:bg-neutral-950 tw:px-4 tw:py-3">
      <div
        ref={cardRef}
        className="tw:relative tw:h-full tw:w-full tw:max-w-[400px] tw:overflow-hidden tw:rounded-[20px] tw:shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
        style={{ background: hasImage ? '#000' : GRADIENTS[index % GRADIENTS.length] }}
      >
        {hasImage && <img src={factImageSrc(f)} alt={f.title} className="tw:absolute tw:inset-0 tw:block tw:size-full tw:object-cover" loading={index > 1 ? 'lazy' : undefined} />}
        <div className="tw:pointer-events-none tw:absolute tw:inset-x-0 tw:top-0 tw:h-[35%] tw:bg-gradient-to-b tw:from-black/45 tw:to-transparent" />
        <div className="tw:pointer-events-none tw:absolute tw:inset-x-0 tw:bottom-0 tw:h-[65%] tw:bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.5)_55%,transparent_100%)]" />

        {/* Action rail */}
        <div className="tw:absolute tw:right-3.5 tw:bottom-24 tw:z-[3] tw:flex tw:flex-col tw:items-center tw:gap-4">
          <RailButton label={f.liked_by_me ? 'Unlike' : 'Like'} pressed={!!f.liked_by_me} activeClass="tw:text-rose-500" onClick={() => onLike(f)} caption={f.likes_count ?? 0}>
            <Heart className={cn('tw:size-6', f.liked_by_me && 'tw:fill-current')} aria-hidden="true" />
          </RailButton>
          <RailButton label={f.saved_by_me ? 'Remove from saved' : 'Save'} pressed={!!f.saved_by_me} activeClass="tw:text-yellow-400" onClick={() => onSave(f)} caption={f.saved_by_me ? 'Saved' : 'Save'}>
            <Bookmark className={cn('tw:size-6', f.saved_by_me && 'tw:fill-current')} aria-hidden="true" />
          </RailButton>
          <RailButton label="Share" onClick={() => onShare(f)} caption={typeof f.shares_count === 'number' ? f.shares_count : undefined}>
            <Share2 className="tw:size-6" aria-hidden="true" />
          </RailButton>
          {f.source_url && (
            <RailButton label="Open source" onClick={() => window.open(absoluteUrl(f.source_url), '_blank', 'noopener,noreferrer')} caption="Source">
              <ExternalLink className="tw:size-6" aria-hidden="true" />
            </RailButton>
          )}
        </div>

        {/* Text */}
        <div
          className={cn(
            'tw:absolute tw:inset-y-0 tw:left-0 tw:right-[68px] tw:z-[2] tw:flex tw:flex-col tw:px-[18px] tw:text-white',
            expanded ? 'tw:overflow-y-auto' : 'tw:overflow-hidden',
            expanded || !hasImage ? 'tw:justify-start tw:py-[26px]' : 'tw:justify-end tw:pb-[26px]',
          )}
        >
          <div className="tw:mb-2 tw:flex tw:flex-wrap tw:gap-1.5">
            {f.is_pinned && (
              <span className="tw:inline-flex tw:items-center tw:gap-1 tw:rounded-full tw:bg-yellow-400/25 tw:px-2 tw:py-0.5 tw:text-[11px] tw:font-bold tw:tracking-wider tw:text-yellow-200 tw:uppercase">
                <Pin className="tw:size-3" aria-hidden="true" /> Pinned
              </span>
            )}
            {featured && (
              <span className="tw:inline-flex tw:items-center tw:gap-1 tw:rounded-full tw:bg-indigo-500/30 tw:px-2 tw:py-0.5 tw:text-[11px] tw:font-bold tw:tracking-wider tw:text-indigo-200 tw:uppercase">
                <Sparkles className="tw:size-3" aria-hidden="true" /> Featured
              </span>
            )}
          </div>
          {(f.tags ?? []).length > 0 && (
            <div className="tw:mb-2.5 tw:flex tw:flex-wrap tw:gap-1.5">
              {(f.tags ?? []).slice(0, 4).map((t) => (
                <span key={t} className="tw:rounded-full tw:bg-white/12 tw:px-2 tw:py-0.5 tw:text-[11px] tw:font-semibold tw:text-white/75">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <h3 className="tw:m-0 tw:mb-2 tw:text-[clamp(17px,3.5vw,22px)]! tw:leading-tight tw:font-extrabold tw:text-white tw:[text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">{f.title}</h3>
          {f.content && (
            <div>
              <p ref={textRef} className={cn('tw:m-0 tw:mb-1 tw:text-[clamp(13px,2.5vw,15px)] tw:leading-relaxed tw:whitespace-pre-line tw:text-white/90', !expanded && 'tw:line-clamp-[8]')}>
                {f.content}
              </p>
              {(truncated || expanded) && (
                <button type="button" onClick={() => setExpanded((v) => !v)} className="tw:m-0 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-[13px] tw:font-bold tw:text-indigo-300">
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
          {featured && (
            <div className="tw:mt-3.5">
              {f.is_opted_in ? (
                <button type="button" onClick={() => onOptOut(f)} className="tw:m-0 tw:cursor-pointer tw:rounded-full tw:border tw:border-solid tw:border-red-500/40 tw:bg-red-500/20 tw:px-4 tw:py-1.5 tw:text-[13px] tw:text-red-300">
                  Opt-out
                </button>
              ) : (
                <button type="button" onClick={() => onOptIn(f)} className="tw:m-0 tw:cursor-pointer tw:rounded-full tw:border tw:border-solid tw:border-indigo-500/45 tw:bg-indigo-500/25 tw:px-4 tw:py-1.5 tw:text-[13px] tw:text-indigo-200">
                  + Opt-in
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default memo(ReelCard)
