import { memo, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { m } from 'motion/react'
import { Bookmark, ExternalLink, Heart, Lightbulb, Pin, Share2, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { compactCount, hostOf, timeAgo } from '../lib/reelFormat'
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
          'm-0 flex size-12 cursor-pointer items-center justify-center rounded-full border-0 bg-black/35 p-0 text-white backdrop-blur-sm transition-[transform,background-color] outline-none hover:bg-black/55 focus-visible:ring-[3px] focus-visible:ring-white/60 active:scale-90 md:bg-white/10 md:hover:bg-white/20',
          pressed && activeClass,
        )}
      >
        {children}
      </button>
      {caption !== undefined && <span className="text-xs leading-none font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">{caption}</span>}
    </div>
  )
}

interface Props {
  fact: Fact
  index: number
  /** Total loaded so far (aria-setsize; -1 while more pages exist). */
  setSize: number
  featured: boolean
  /** Shown as the "account" on the post: the institute, or "Featured" for shared facts. */
  author: string
  onLike: (f: Fact) => void
  onSave: (f: Fact) => void
  onShare: (f: Fact) => void
  onRead: (id: number) => void
  onOptIn: (f: Fact) => void
  onOptOut: (f: Fact) => void
  /** Set on the card a few before the end so scrolling to it loads the next page. */
  waypoint?: (el: HTMLElement | null) => void
}

/**
 * One full-height fact "reel" (Shorts/Reels layout): media fills a 9:16 card,
 * a short caption sits at the bottom, actions on the right. Double-tap likes.
 * Read is reported once when 70% of the card is visible (legacy).
 */
function ReelCard({ fact: f, index, setSize, featured, author, onLike, onSave, onShare, onRead, onOptIn, onOptOut, waypoint }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLParagraphElement | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [details, setDetails] = useState(false)
  const [burst, setBurst] = useState(0)
  const hasImage = !!f.image_url
  const src = hasImage ? factImageSrc(f) : ''
  const when = timeAgo(f.publish_at || f.updated_at)
  const tags = (f.tags ?? []).slice(0, 4)
  const host = hostOf(absoluteUrl(f.source_url))
  // Clamped previews drop blank lines so the "…" never lands on an empty line; the panel shows the full text.
  const preview = (f.content ?? '').replace(/\n\s*\n+/g, '\n')

  useLayoutEffect(() => {
    if (textRef.current) setTruncated(textRef.current.scrollHeight > textRef.current.clientHeight + 1)
  }, [f.content])

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

  // Double-tap / double-click on the media likes it (never un-likes), like Reels.
  const onDoubleClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, [data-reel-panel]')) return
    if (!f.liked_by_me) onLike(f)
    setBurst((n) => n + 1)
  }

  const meta = (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-white/70">
        {featured ? <Sparkles className="size-4" aria-hidden="true" /> : <Lightbulb className="size-4" aria-hidden="true" />}
      </span>
      <span className="truncate font-semibold">{author}</span>
      {when && <span className="shrink-0 text-white/70">· {when}</span>}
      {f.is_pinned && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow-400/25 px-2 py-0.5 text-[11px] font-bold tracking-wider text-yellow-200 uppercase">
          <Pin className="size-3" aria-hidden="true" /> Pinned
        </span>
      )}
    </div>
  )

  return (
    <article
      ref={waypoint}
      aria-label={f.title}
      aria-posinset={index + 1}
      aria-setsize={setSize}
      className="relative flex h-full shrink-0 snap-start snap-always items-center justify-center overflow-hidden"
    >
      {/* Ambient glow from the image behind the card (desktop, like YouTube Shorts). */}
      {hasImage && <img src={src} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 hidden size-full scale-125 object-cover opacity-30 blur-3xl md:block" />}

      <div className="relative h-full w-full md:w-auto md:py-4 md:pr-20">
        <div
          ref={cardRef}
          onDoubleClick={onDoubleClick}
          className="relative h-full w-full touch-manipulation overflow-hidden bg-black select-none md:aspect-[9/16] md:w-auto md:max-w-[calc(100vw-2rem)] md:rounded-2xl md:shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
          style={hasImage ? undefined : { background: GRADIENTS[index % GRADIENTS.length] }}
        >
          {hasImage ? (
            <>
              {/* Blurred fill + the whole picture, so wide photos aren't cropped. */}
              <img src={src} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl" />
              <img src={src} alt={f.title} className="absolute inset-0 block size-full object-contain" loading={index > 1 ? 'lazy' : undefined} draggable={false} />
            </>
          ) : (
            // Text-only fact: big centred text, like a coloured-background post.
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pt-16 pr-[4.5rem] pb-44 pl-6 text-center text-white md:px-7">
              <h2 className="m-0 text-[clamp(22px,4.5vw,30px)]! leading-tight font-extrabold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.25)]">{f.title}</h2>
              {f.content && (
                <p ref={textRef} className="m-0 line-clamp-[7] text-[clamp(15px,2.8vw,18px)] leading-relaxed whitespace-pre-line text-white/90">
                  {preview}
                </p>
              )}
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.35)_60%,transparent_100%)]" />

          {/* Caption */}
          <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col gap-2 p-4 pr-[4.5rem] pb-5 text-white md:pr-4">
            {meta}
            {hasImage && (
              <>
                <h2 className="m-0 line-clamp-2 text-base! leading-snug font-bold text-white">{f.title}</h2>
                {f.content && (
                  <p ref={textRef} className="m-0 line-clamp-2 text-sm leading-snug whitespace-pre-line text-white/85">
                    {preview}
                  </p>
                )}
              </>
            )}
            {tags.length > 0 && <p className="m-0 truncate text-sm font-semibold text-white/90">{tags.map((t) => `#${t}`).join(' ')}</p>}
            {(truncated || host) && (
              <button
                type="button"
                onClick={() => setDetails(true)}
                aria-expanded={details}
                className="m-0 w-fit cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-white/80 underline-offset-2 hover:text-white hover:underline"
              >
                …more
              </button>
            )}
            {featured && (
              <div className="pt-1">
                {f.is_opted_in ? (
                  <button type="button" onClick={() => onOptOut(f)} className="m-0 cursor-pointer rounded-full border border-solid border-red-400/50 bg-red-500/25 px-4 py-1.5 text-[13px] font-medium text-red-100 hover:bg-red-500/35">
                    Opt-out
                  </button>
                ) : (
                  <button type="button" onClick={() => onOptIn(f)} className="m-0 cursor-pointer rounded-full border-0 bg-white px-4 py-1.5 text-[13px] font-semibold text-neutral-900 hover:bg-white/90">
                    + Opt-in
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Double-tap heart */}
          {burst > 0 && (
            <m.div
              key={burst}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.1] }}
              transition={{ duration: 0.8, times: [0, 0.25, 0.7, 1] }}
            >
              <Heart className="size-28 fill-rose-500 text-rose-500 drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]" />
            </m.div>
          )}

          {/* Full description, like the Shorts "…more" panel. */}
          {details && (
            <div
              data-reel-panel
              role="region"
              aria-label={`About: ${f.title}`}
              onKeyDown={(e) => e.key === 'Escape' && setDetails(false)}
              className="absolute inset-x-0 bottom-0 z-[5] flex max-h-[75%] flex-col rounded-t-2xl bg-neutral-900/95 text-white shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-2 border-b border-solid border-white/10 px-5 py-3">
                <span className="text-sm font-semibold">Description</span>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setDetails(false)}
                  aria-label="Close description"
                  className="m-0 flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-white/10 p-0 text-white outline-none hover:bg-white/20 focus-visible:ring-[3px] focus-visible:ring-white/60"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
                {meta}
                <p className="m-0 text-lg leading-snug font-bold">{f.title}</p>
                {f.content && <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-white/90">{f.content}</p>}
                {tags.length > 0 && <p className="m-0 text-sm font-semibold text-sky-300">{tags.map((t) => `#${t}`).join(' ')}</p>}
                {host && (
                  <a
                    href={absoluteUrl(f.source_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white no-underline hover:bg-white/20"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" /> {host}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions: over the card on phones, beside it on desktop. */}
        <div className="absolute right-2 bottom-28 z-[3] flex flex-col items-center gap-4 md:right-3 md:bottom-4">
          <RailButton label={f.liked_by_me ? 'Unlike' : 'Like'} pressed={!!f.liked_by_me} activeClass="text-rose-500" onClick={() => onLike(f)} caption={compactCount(f.likes_count)}>
            <Heart className={cn('size-6 transition-transform', f.liked_by_me && 'scale-110 fill-current')} aria-hidden="true" />
          </RailButton>
          <RailButton label={f.saved_by_me ? 'Remove from saved' : 'Save'} pressed={!!f.saved_by_me} activeClass="text-yellow-400" onClick={() => onSave(f)} caption={f.saved_by_me ? 'Saved' : 'Save'}>
            <Bookmark className={cn('size-6', f.saved_by_me && 'fill-current')} aria-hidden="true" />
          </RailButton>
          <RailButton label="Share" onClick={() => onShare(f)} caption={typeof f.shares_count === 'number' ? compactCount(f.shares_count) : 'Share'}>
            <Share2 className="size-6" aria-hidden="true" />
          </RailButton>
          {f.source_url && (
            <RailButton label="Open source" onClick={() => window.open(absoluteUrl(f.source_url), '_blank', 'noopener,noreferrer')} caption="Source">
              <ExternalLink className="size-6" aria-hidden="true" />
            </RailButton>
          )}
        </div>
      </div>
    </article>
  )
}

export default memo(ReelCard)
