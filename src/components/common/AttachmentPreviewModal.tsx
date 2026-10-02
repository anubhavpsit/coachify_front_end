import { useRef, useState, type PointerEvent } from 'react'
import { LoaderCircle, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type PreviewableAttachment = {
  id?: number
  original_name: string
  file_type?: 'image' | 'pdf' | 'other'
}

type Props = {
  attachment: PreviewableAttachment | null
  url: string | null
  onHide: () => void
  subtitle?: string
}

/** Image / PDF preview (same props as the react-bootstrap version): rotate, zoom 25–500%, drag to pan when zoomed. */
export default function AttachmentPreviewModal({ attachment, url, onHide, subtitle }: Props) {
  return (
    <Dialog open={!!attachment} onOpenChange={(o) => !o && onHide()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="px-5 py-3">
          <DialogTitle className="truncate pr-8 text-sm">{attachment?.original_name ?? 'Attachment Preview'}</DialogTitle>
          <DialogDescription className={subtitle ? undefined : 'sr-only'}>{subtitle ?? 'Attachment preview'}</DialogDescription>
        </DialogHeader>
        {/* Keyed so zoom / rotation / position reset for each file (legacy reset on url change). */}
        {attachment && url && <Viewer key={url} attachment={attachment} url={url} />}
      </DialogContent>
    </Dialog>
  )
}

function Viewer({ attachment, url }: { attachment: PreviewableAttachment; url: string }) {
  const isPdf = attachment.file_type === 'pdf'
  const [loaded, setLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)

  const zoomIn = () => setScale((s) => Math.min(+(s + 0.25).toFixed(2), 5))
  const zoomOut = () => setScale((s) => Math.max(+(s - 0.25).toFixed(2), 0.25))
  const reset = () => {
    setScale(1)
    setRotation(0)
    setPos({ x: 0, y: 0 })
  }

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (scale <= 1 || isPdf) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y }
    setDragging(true)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    setPos({ x: start.current.ox + (e.clientX - start.current.mx), y: start.current.oy + (e.clientY - start.current.my) })
  }
  const up = () => {
    start.current = null
    setDragging(false)
  }

  return (
    <>
      {!isPdf && (
        <div role="toolbar" aria-label="Image controls" className="flex flex-wrap items-center gap-1.5 border-y border-solid border-border bg-muted/40 px-4 py-2">
          <Button size="icon-sm" variant="outline" onClick={() => setRotation((r) => r - 90)} aria-label="Rotate 90° left" title="Rotate 90° left">
            <RotateCcw aria-hidden="true" />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => setRotation((r) => r + 90)} aria-label="Rotate 90° right" title="Rotate 90° right">
            <RotateCw aria-hidden="true" />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Button size="icon-sm" variant="outline" onClick={zoomOut} disabled={scale <= 0.25} aria-label="Zoom out" title="Zoom out">
            <ZoomOut aria-hidden="true" />
          </Button>
          <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-muted-foreground" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <Button size="icon-sm" variant="outline" onClick={zoomIn} disabled={scale >= 5} aria-label="Zoom in" title="Zoom in">
            <ZoomIn aria-hidden="true" />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Button size="sm" variant="outline" onClick={reset} title="Reset zoom, rotation and position">
            Reset
          </Button>
          {scale > 1 && <span className="ml-auto text-xs text-muted-foreground">Drag image to pan</span>}
        </div>
      )}
      <div
        className={cn(
          'relative flex h-[68vh] touch-none items-center justify-center overflow-hidden bg-neutral-950',
          isPdf ? 'cursor-default' : scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 text-sm text-neutral-400" role="status">
            <LoaderCircle className="size-7 animate-spin text-white motion-reduce:animate-none" aria-hidden="true" />
            Loading…
          </div>
        )}
        {isPdf ? (
          <iframe title={attachment.original_name} src={`${url}#toolbar=1`} className={cn('h-[68vh] w-full border-0 transition-opacity', loaded ? 'opacity-100' : 'opacity-0')} onLoad={() => setLoaded(true)} />
        ) : (
          <img
            src={url}
            alt={attachment.original_name}
            draggable={false}
            onLoad={() => setLoaded(true)}
            className={cn('pointer-events-none block max-h-full max-w-full select-none', loaded ? 'opacity-100' : 'opacity-0')}
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg) scale(${scale})`,
              transformOrigin: 'center center',
              transition: dragging ? 'opacity 0.2s' : 'transform 0.2s ease, opacity 0.2s',
            }}
          />
        )}
      </div>
    </>
  )
}
