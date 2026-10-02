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
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className={cn(
          'm-0 flex size-12 cursor-pointer items-center justify-center rounded-full border-0 bg-black/40 p-0 text-white backdrop-blur transition-[transform,background-color] outline-none hover:bg-black/60 focus-visible:ring-[3px] focus-visible:ring-white/60 active:scale-90',
          pressed && activeClass,
        )}
      >
        {children}
      </button>
      {caption !== undefined && <span className="text-[11px] leading-none font-semibold text-white/85">{caption}</span>}
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
    <section ref={waypoint} aria-label={f.title} className="flex h-full flex-none snap-start items-center justify-center bg-neutral-950 px-4 py-3">
      <div
        ref={cardRef}
        className="relative h-full w-full max-w-[400px] overflow-hidden rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
        style={{ background: hasImage ? '#000' : GRADIENTS[index % GRADIENTS.length] }}
      >
        {hasImage && <img src={factImageSrc(f)} alt={f.title} className="absolute inset-0 block size-full object-cover" loading={index > 1 ? 'lazy' : undefined} />}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[35%] bg-gradient-to-b from-black/45 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] bg-[linear-gradient(to_top,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.5)_55%,transparent_100%)]" />

        {/* Action rail */}
        <div className="absolute right-3.5 bottom-24 z-[3] flex flex-col items-center gap-4">
          <RailButton label={f.liked_by_me ? 'Unlike' : 'Like'} pressed={!!f.liked_by_me} activeClass="text-rose-500" onClick={() => onLike(f)} caption={f.likes_count ?? 0}>
            <Heart className={cn('size-6', f.liked_by_me && 'fill-current')} aria-hidden="true" />
          </RailButton>
          <RailButton label={f.saved_by_me ? 'Remove from saved' : 'Save'} pressed={!!f.saved_by_me} activeClass="text-yellow-400" onClick={() => onSave(f)} caption={f.saved_by_me ? 'Saved' : 'Save'}>
            <Bookmark className={cn('size-6', f.saved_by_me && 'fill-current')} aria-hidden="true" />
          </RailButton>
          <RailButton label="Share" onClick={() => onShare(f)} caption={typeof f.shares_count === 'number' ? f.shares_count : undefined}>
            <Share2 className="size-6" aria-hidden="true" />
          </RailButton>
          {f.source_url && (
            <RailButton label="Open source" onClick={() => window.open(absoluteUrl(f.source_url), '_blank', 'noopener,noreferrer')} caption="Source">
              <ExternalLink className="size-6" aria-hidden="true" />
            </RailButton>
          )}
        </div>

        {/* Text */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 right-[68px] z-[2] flex flex-col px-[18px] text-white',
            expanded ? 'overflow-y-auto' : 'overflow-hidden',
            expanded || !hasImage ? 'justify-start py-[26px]' : 'justify-end pb-[26px]',
          )}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {f.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/25 px-2 py-0.5 text-[11px] font-bold tracking-wider text-yellow-200 uppercase">
                <Pin className="size-3" aria-hidden="true" /> Pinned
              </span>
            )}
            {featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/30 px-2 py-0.5 text-[11px] font-bold tracking-wider text-indigo-200 uppercase">
                <Sparkles className="size-3" aria-hidden="true" /> Featured
              </span>
            )}
          </div>
          {(f.tags ?? []).length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {(f.tags ?? []).slice(0, 4).map((t) => (
                <span key={t} className="rounded-full bg-white/12 px-2 py-0.5 text-[11px] font-semibold text-white/75">
                  #{t}
                </span>
              ))}
            </div>
          )}
          <h3 className="m-0 mb-2 text-[clamp(17px,3.5vw,22px)]! leading-tight font-extrabold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.4)]">{f.title}</h3>
          {f.content && (
            <div>
              <p ref={textRef} className={cn('m-0 mb-1 text-[clamp(13px,2.5vw,15px)] leading-relaxed whitespace-pre-line text-white/90', !expanded && 'line-clamp-[8]')}>
                {f.content}
              </p>
              {(truncated || expanded) && (
                <button type="button" onClick={() => setExpanded((v) => !v)} className="m-0 cursor-pointer border-0 bg-transparent p-0 text-[13px] font-bold text-indigo-300">
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
          {featured && (
            <div className="mt-3.5">
              {f.is_opted_in ? (
                <button type="button" onClick={() => onOptOut(f)} className="m-0 cursor-pointer rounded-full border border-solid border-red-500/40 bg-red-500/20 px-4 py-1.5 text-[13px] text-red-300">
                  Opt-out
                </button>
              ) : (
                <button type="button" onClick={() => onOptIn(f)} className="m-0 cursor-pointer rounded-full border border-solid border-indigo-500/45 bg-indigo-500/25 px-4 py-1.5 text-[13px] text-indigo-200">
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
