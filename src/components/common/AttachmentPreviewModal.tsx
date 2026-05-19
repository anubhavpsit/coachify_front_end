import { useState, useEffect, useRef } from 'react';
import { Modal, Spinner } from 'react-bootstrap';

export type PreviewableAttachment = {
  id?: number;
  original_name: string;
  file_type?: 'image' | 'pdf' | 'other';
};

type Props = {
  attachment: PreviewableAttachment | null;
  url: string | null;
  onHide: () => void;
  subtitle?: string;
};

export default function AttachmentPreviewModal({ attachment, url, onHide, subtitle }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setLoaded(false);
    setScale(1);
    setRotation(0);
    setPos({ x: 0, y: 0 });
    setIsDragging(false);
    dragStart.current = null;
  }, [url]);

  const isPdf = attachment?.file_type === 'pdf';

  const zoomIn = () => setScale((s) => Math.min(+(s + 0.25).toFixed(2), 5));
  const zoomOut = () => setScale((s) => Math.max(+(s - 0.25).toFixed(2), 0.25));
  const rotateLeft = () => setRotation((r) => r - 90);
  const rotateRight = () => setRotation((r) => r + 90);
  const reset = () => { setScale(1); setRotation(0); setPos({ x: 0, y: 0 }); };

  const onContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (scale <= 1 || isPdf) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    setIsDragging(true);
  };

  const onContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setPos({
      x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
      y: dragStart.current.oy + (e.clientY - dragStart.current.my),
    });
  };

  const onContainerMouseUp = () => {
    dragStart.current = null;
    setIsDragging(false);
  };

  return (
    <Modal show={!!attachment} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="py-2">
        <div>
          <div className="fw-semibold" style={{ fontSize: '14px' }}>
            {attachment?.original_name ?? 'Attachment Preview'}
          </div>
          {subtitle && <div className="text-secondary small">{subtitle}</div>}
        </div>
      </Modal.Header>

      <Modal.Body className="p-0">
        {/* Toolbar — images only */}
        {!isPdf && (
          <div
            className="d-flex align-items-center gap-2 px-3 py-2 border-bottom"
            style={{ backgroundColor: '#f8f9fa', flexWrap: 'wrap' }}
          >
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={rotateLeft}
              title="Rotate 90° left"
            >
              ↺
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={rotateRight}
              title="Rotate 90° right"
            >
              ↻
            </button>
            <div className="vr" />
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={zoomOut}
              disabled={scale <= 0.25}
              title="Zoom out"
            >
              −
            </button>
            <span
              className="text-secondary small fw-semibold"
              style={{ minWidth: 40, textAlign: 'center' }}
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={zoomIn}
              disabled={scale >= 5}
              title="Zoom in"
            >
              +
            </button>
            <div className="vr" />
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={reset}
              title="Reset zoom, rotation and position"
            >
              Reset
            </button>
            {scale > 1 && (
              <span className="text-secondary small ms-auto" style={{ fontSize: '0.75rem' }}>
                Drag image to pan
              </span>
            )}
          </div>
        )}

        {/* Content area */}
        <div
          style={{
            height: '68vh',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111',
            position: 'relative',
            cursor: isPdf
              ? 'default'
              : scale > 1
              ? isDragging
                ? 'grabbing'
                : 'grab'
              : 'zoom-in',
          }}
          onMouseDown={onContainerMouseDown}
          onMouseMove={onContainerMouseMove}
          onMouseUp={onContainerMouseUp}
          onMouseLeave={onContainerMouseUp}
        >
          {/* Loading spinner */}
          {!loaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                zIndex: 10,
              }}
            >
              <Spinner animation="border" variant="light" />
              <span style={{ color: '#aaa', fontSize: 13 }}>Loading…</span>
            </div>
          )}

          {/* PDF */}
          {attachment && url && isPdf && (
            <iframe
              key={url}
              title={attachment.original_name}
              src={`${url}#toolbar=1`}
              style={{
                width: '100%',
                height: '68vh',
                border: 'none',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
              onLoad={() => setLoaded(true)}
            />
          )}

          {/* Image */}
          {attachment && url && !isPdf && (
            <img
              key={url}
              src={url}
              alt={attachment.original_name}
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block',
                opacity: loaded ? 1 : 0,
                transform: `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'opacity 0.2s' : 'transform 0.2s ease, opacity 0.2s',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
              }}
              onLoad={() => setLoaded(true)}
            />
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}
