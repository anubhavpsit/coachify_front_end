import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';
import Icon from '../../components/common/Icon';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

// Height of each reel card = scroll container height (one card per snap)
const REEL_H = 'calc(100vh - 142px)';

// Gradient backgrounds for facts without images — cycles by card index
const GRADIENTS = [
  'linear-gradient(160deg,#4f46e5 0%,#7c3aed 100%)',
  'linear-gradient(160deg,#059669 0%,#0d9488 100%)',
  'linear-gradient(160deg,#ea580c 0%,#dc2626 100%)',
  'linear-gradient(160deg,#1d4ed8 0%,#0891b2 100%)',
  'linear-gradient(160deg,#be185d 0%,#ec4899 100%)',
  'linear-gradient(160deg,#b45309 0%,#ea580c 100%)',
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Fact = {
  id: number;
  title: string;
  content?: string | null;
  content_type: 'text' | 'image' | 'link' | 'attachment';
  image_url?: string | null;
  attachment_url?: string | null;
  source_url?: string | null;
  tags?: string[] | null;
  likes_count?: number;
  shares_count?: number;
  is_pinned: boolean;
  is_published: boolean;
  publish_at?: string | null;
  expire_at?: string | null;
  is_read?: boolean;
  updated_at?: string | null;
  saved_by_me?: boolean;
  liked_by_me?: boolean;
  is_opted_in?: boolean;
};

// ─── Skeleton card ────────────────────────────────────────────────────────────

function ReelSkeleton() {
  return (
    <div style={{
      height: REEL_H, flex: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f0f0f', padding: '12px 16px',
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 400, height: '100%',
        borderRadius: 20, overflow: 'hidden', background: '#1a1a2e',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }}>
        <div className="reel-shimmer" style={{ position: 'absolute', inset: 0 }} />
        {/* Simulated action rail */}
        <div style={{ position: 'absolute', right: 16, bottom: 120, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[44, 44, 44].map((s, i) => (
            <div key={i} style={{ width: s, height: s, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          ))}
        </div>
        {/* Simulated text content */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 72, padding: '24px 20px 28px' }}>
          <div className="reel-shimmer-bar" style={{ height: 13, width: '45%', borderRadius: 20, marginBottom: 14 }} />
          <div className="reel-shimmer-bar" style={{ height: 22, width: '85%', borderRadius: 6, marginBottom: 12 }} />
          <div className="reel-shimmer-bar" style={{ height: 14, width: '100%', borderRadius: 6, marginBottom: 7 }} />
          <div className="reel-shimmer-bar" style={{ height: 14, width: '75%', borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Action button (right rail) ───────────────────────────────────────────────

function ActionBtn({
  icon,
  count,
  active,
  activeColor,
  onClick,
}: {
  icon: string;
  count?: string | number;
  active?: boolean;
  activeColor?: string;
  onClick: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        onClick={onClick}
        style={{
          border: 'none',
          background: 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '50%',
          width: 46,
          height: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: active ? (activeColor ?? '#f472b6') : '#fff',
          fontSize: 22,
          padding: 0,
          transition: 'transform 0.15s, background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.58)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.38)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.88)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Icon icon={icon} />
      </button>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 600, lineHeight: 1 }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Single reel card ─────────────────────────────────────────────────────────

type ReelCardProps = {
  fact: Fact;
  idx: number;
  tab: string;
  waypointRef: React.MutableRefObject<HTMLDivElement | null>;
  isWaypoint: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onRead: () => void;
  onOptIn: () => void;
  onOptOut: () => void;
  imageSrc: string;
  resolveUrl: (url?: string | null) => string;
};

function ReelCard({
  fact: f,
  idx,
  tab,
  waypointRef,
  isWaypoint,
  onLike,
  onSave,
  onShare,
  onRead,
  onOptIn,
  onOptOut,
  imageSrc,
  resolveUrl,
}: ReelCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const hasImage = !!f.image_url;
  const gradient = GRADIENTS[idx % GRADIENTS.length];

  // Read tracking — fire once when 70% of the card is visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { onRead(); io.disconnect(); } },
      { threshold: 0.7 },
    );
    io.observe(el);
    return () => io.disconnect();
    // onRead is stable (useCallback with no deps that change per render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.id]);

  return (
    // Full-width snap section — dark stage behind the card
    <div
      ref={el => { if (isWaypoint) waypointRef.current = el; }}
      style={{
        height: REEL_H,
        flex: 'none',
        scrollSnapAlign: 'start',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f0f',
        padding: '12px 16px',
      }}
    >
      {/* Constrained card */}
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          height: '100%',
          borderRadius: 20,
          overflow: 'hidden',
          background: hasImage ? '#000' : gradient,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      >
      {/* ── Background image ── */}
      {hasImage && (
        <img
          src={imageSrc}
          alt={f.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}

      {/* ── Gradient overlays ── */}
      {/* Top fade — softens any busy image at the top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '35%',
        background: 'linear-gradient(to bottom,rgba(0,0,0,0.45) 0%,transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Bottom fade — text readability */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
        background: 'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.5) 55%,transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Right action rail ── */}
      <div style={{
        position: 'absolute',
        right: 14,
        bottom: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        zIndex: 3,
      }}>
        <ActionBtn
          icon={f.liked_by_me ? 'solar:heart-bold' : 'solar:heart-outline'}
          count={f.likes_count ?? 0}
          active={!!f.liked_by_me}
          activeColor="#f43f5e"
          onClick={onLike}
        />
        <ActionBtn
          icon={f.saved_by_me ? 'solar:bookmark-bold' : 'solar:bookmark-outline'}
          count={f.saved_by_me ? 'Saved' : 'Save'}
          active={!!f.saved_by_me}
          activeColor="#facc15"
          onClick={onSave}
        />
        <ActionBtn
          icon="solar:share-outline"
          count={typeof f.shares_count === 'number' ? f.shares_count : undefined}
          onClick={onShare}
        />
        {f.source_url ? (
          <ActionBtn
            icon="solar:link-broken"
            count="Source"
            onClick={() => window.open(resolveUrl(f.source_url), '_blank', 'noopener,noreferrer')}
          />
        ) : null}
      </div>

      {/* ── Content overlay (bottom) ── */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 68,  // clear of the action rail
        padding: '20px 18px 26px',
        zIndex: 2,
        color: '#fff',
      }}>
        {/* Pinned badge */}
        {f.is_pinned && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            background: 'rgba(250,204,21,0.25)', color: '#fde68a',
            borderRadius: 20, padding: '2px 8px', marginBottom: 8,
          }}>
            <Icon icon="solar:pin-bold" /> Pinned
          </span>
        )}

        {/* Superadmin badge */}
        {tab === 'superadmin' && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
            background: 'rgba(99,102,241,0.3)', color: '#c7d2fe',
            borderRadius: 20, padding: '2px 8px', marginBottom: 8,
          }}>
            <Icon icon="solar:star-bold" /> Superadmin
          </span>
        )}

        {/* Tags */}
        {Array.isArray(f.tags) && f.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {f.tags.slice(0, 4).map(t => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 20, padding: '2px 8px',
              }}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 style={{
          margin: '0 0 8px',
          fontSize: 'clamp(17px, 3.5vw, 22px)',
          fontWeight: 800,
          lineHeight: 1.25,
          color: '#fff',
          textShadow: '0 1px 6px rgba(0,0,0,0.4)',
        }}>
          {f.title}
        </h3>

        {/* Content */}
        {f.content && (
          <p style={{
            margin: 0,
            fontSize: 'clamp(13px, 2.5vw, 15px)',
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.88)',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {f.content}
          </p>
        )}

        {/* Superadmin opt-in / opt-out */}
        {tab === 'superadmin' && (
          <div style={{ marginTop: 14 }}>
            {f.is_opted_in ? (
              <button
                onClick={onOptOut}
                style={{
                  background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: 20, padding: '5px 16px', fontSize: 13, cursor: 'pointer',
                }}
              >
                Opt-out
              </button>
            ) : (
              <button
                onClick={onOptIn}
                style={{
                  background: 'rgba(99,102,241,0.25)', color: '#c7d2fe',
                  border: '1px solid rgba(99,102,241,0.45)',
                  borderRadius: 20, padding: '5px 16px', fontSize: 13, cursor: 'pointer',
                }}
              >
                + Opt-in
              </button>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FactsPage() {
  const [tab, setTab] = useState<'all' | 'saved' | 'admin' | 'superadmin'>('all');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [buffer, setBuffer] = useState<Fact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;
  const user = typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('authUser') || '{}') : null;

  const readSet = useRef<Set<number>>(new Set());

  const feedUrl = useMemo(() => {
    if (tab === 'saved') return `${API_BASE_URL}/facts/saved`;
    if (tab === 'superadmin') return `${API_BASE_URL}/admin/superadmin-facts`;
    return `${API_BASE_URL}/facts`;
  }, [tab]);

  const resolveAbsoluteUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    try {
      const base = new URL(API_BASE_URL);
      return url.startsWith('/') ? `${base.protocol}//${base.host}${url}` : `${base.protocol}//${base.host}/${url}`;
    } catch { return url; }
  }, []);

  const imageSrcFor = useCallback((f: Fact) => {
    const abs = resolveAbsoluteUrl(f.image_url || undefined);
    if (!abs) return '';
    const v = f.updated_at || f.publish_at || '';
    return v ? `${abs}${abs.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}` : abs;
  }, [resolveAbsoluteUrl]);

  const extractListAndPg = (res: any) => {
    const list = res.data?.data?.facts || res.data?.data?.items || [];
    const pg = res.data?.data?.pagination || {};
    return { list, pg } as { list: Fact[]; pg: { current_page?: number; last_page?: number } };
  };

  const fetchPage = useCallback(async (p: number) => {
    const params = new URLSearchParams({ page: String(p), per_page: '10' });
    const res = await axios.get<any>(`${feedUrl}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    return extractListAndPg(res);
  }, [feedUrl, token]);

  const load = useCallback(async (p = 1) => {
    if (!token) { setError('Sign in to view facts.'); return; }
    if (p === 1) setLoading(true);
    setError(null);
    try {
      const { list, pg } = await fetchPage(p);
      setFacts(list);
      setBuffer([]);
      const cur = pg.current_page ?? p;
      const last = pg.last_page ?? p;
      setPage(cur);
      setLastPage(last);
      const next = cur + 1;
      if (next <= last) {
        setPrefetching(true);
        fetchPage(next).then(({ list: nl }) => setBuffer(nl)).catch(() => {}).finally(() => setPrefetching(false));
      }
    } catch {
      setError('Unable to load facts.');
      if (p === 1) { setFacts([]); setBuffer([]); }
    } finally { if (p === 1) setLoading(false); }
  }, [token, fetchPage]);

  useEffect(() => { setFacts([]); setPage(1); setLastPage(1); load(1); }, [load, tab]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const waypointRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = waypointRef.current || sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading && page < lastPage) {
        if (buffer.length) {
          setFacts(prev => [...prev, ...buffer]);
          setBuffer([]);
          const nextPage = page + 1;
          setPage(nextPage);
          const nextPrefetch = nextPage + 1;
          if (nextPrefetch <= lastPage && !prefetching) {
            setPrefetching(true);
            fetchPage(nextPrefetch).then(({ list: nl }) => setBuffer(nl)).catch(() => {}).finally(() => setPrefetching(false));
          }
        } else if (!prefetching) {
          const next = page + 1;
          setPrefetching(true);
          fetchPage(next).then(({ list: nl }) => {
            setFacts(prev => [...prev, ...nl]);
            setPage(next);
          }).catch(() => {}).finally(() => setPrefetching(false));
        }
      }
    }, { root: null, rootMargin: '200px', threshold: 0.2 });
    io.observe(node);
    return () => io.disconnect();
  }, [loading, page, lastPage, buffer, prefetching, fetchPage]);

  // ── Interactions ────────────────────────────────────────────────────────────

  const handleLike = async (id: number) => {
    if (!token) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/facts/${id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const { liked, likes_count } = res.data?.data || {};
      setFacts(prev => prev.map(f => f.id === id ? { ...f, likes_count, liked_by_me: !!liked } : f));
    } catch {}
  };

  const handleSave = async (id: number) => {
    if (!token) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/facts/${id}/save`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const saved = !!res.data?.data?.saved;
      setFacts(prev => prev.map(f => f.id === id ? { ...f, saved_by_me: saved } : f));
    } catch {}
  };

  const markRead = useCallback(async (id: number) => {
    if (!token || readSet.current.has(id)) return;
    readSet.current.add(id);
    try {
      await axios.post(`${API_BASE_URL}/facts/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  }, [token]);

  const logShare = async (factId: number, channel: string) => {
    if (!token) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/facts/${factId}/share`, { channel }, { headers: { Authorization: `Bearer ${token}` } });
      const shares_count = res.data?.data?.shares_count;
      if (typeof shares_count === 'number') {
        setFacts(prev => prev.map(f => f.id === factId ? { ...f, shares_count } : f));
      }
    } catch {}
  };

  // ── Share modal ─────────────────────────────────────────────────────────────

  const [shareTarget, setShareTarget] = useState<Fact | null>(null);
  const openShare = (f: Fact) => setShareTarget(f);
  const closeShare = () => setShareTarget(null);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-9999px';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
    } catch { return false; }
  };

  const shareTo = async (channel: 'WHATSAPP' | 'FACEBOOK' | 'TWITTER' | 'EMAIL' | 'COPY_LINK' | 'WEB_SHARE', f: Fact) => {
    const text = `${f.title}${f.content ? `\n\n${f.content}` : ''}`;
    const url = f.source_url || window.location.origin;
    try {
      switch (channel) {
        case 'WHATSAPP': window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`, '_blank', 'noopener'); break;
        case 'FACEBOOK': window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank', 'noopener'); break;
        case 'TWITTER': window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener'); break;
        case 'EMAIL': window.location.href = `mailto:?subject=${encodeURIComponent(f.title)}&body=${encodeURIComponent(text + '\n' + url)}`; break;
        case 'COPY_LINK': { const ok = await copyToClipboard(url); alert(ok ? 'Link copied!' : 'Copy failed: ' + url); break; }
        case 'WEB_SHARE': if ((navigator as any).share) await (navigator as any).share({ title: f.title, text, url }); break;
      }
    } finally { await logShare(f.id, channel); closeShare(); }
  };

  // ── Opt-in / Opt-out ────────────────────────────────────────────────────────

  const handleOptIn = async (id: number) => {
    if (!token) return;
    await axios.post(`${API_BASE_URL}/admin/superadmin-facts/${id}/opt-in`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setFacts(prev => prev.map(f => f.id === id ? { ...f, is_opted_in: true } : f));
  };

  const handleOptOut = async (id: number) => {
    if (!token) return;
    await axios.post(`${API_BASE_URL}/admin/superadmin-facts/${id}/opt-out`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setFacts(prev => prev.map(f => f.id === id ? { ...f, is_opted_in: false } : f));
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabItems: { key: typeof tab; label: string; icon: string; show: boolean }[] = [
    { key: 'all',        label: 'For You',      icon: 'solar:star-shine-bold-duotone',  show: true },
    { key: 'saved',      label: 'Saved',        icon: 'solar:bookmark-bold-duotone',    show: true },
    { key: 'superadmin', label: 'Featured',     icon: 'solar:verified-check-bold',      show: user?.role === 'coaching_admin' },
  ];

  return (
    <>
      {/* ── Shimmer + reel CSS ── */}
      <style>{`
        @keyframes reelShimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .reel-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.10) 50%,
            rgba(255,255,255,0.04) 75%
          );
          background-size: 1200px 100%;
          animation: reelShimmer 1.6s infinite linear;
        }
        .reel-shimmer-bar {
          background: rgba(255,255,255,0.10);
        }
        .reel-scroll-container {
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .reel-scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Break out of the dashboard body padding */}
      <div style={{ margin: '-15px -15px 0', overflow: 'hidden' }}>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 16px',
          background: 'var(--white, #fff)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {tabItems.filter(t => t.show).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 16px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontWeight: tab === t.key ? 700 : 500,
                fontSize: 13,
                whiteSpace: 'nowrap',
                transition: 'all 0.18s',
                background: tab === t.key ? 'var(--primary-600, #4f46e5)' : 'rgba(0,0,0,0.06)',
                color: tab === t.key ? '#fff' : 'var(--text-primary-light, #374151)',
              }}
            >
              <Icon icon={t.icon} />
              {t.label}
            </button>
          ))}

          {/* Admin manage link pushed to the right */}
          {user?.role === 'coaching_admin' && (
            <NavLink
              to="/admin/facts"
              style={{
                marginLeft: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20,
                background: 'rgba(0,0,0,0.06)',
                color: 'var(--text-primary-light, #374151)',
                textDecoration: 'none', fontSize: 13, fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              <Icon icon="solar:settings-outline" />
              Manage
            </NavLink>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* ── Reel scroll area ── */}
        <div className="reel-scroll-container" style={{ height: REEL_H }}>
          {loading ? (
            // Skeleton cards while loading
            Array.from({ length: 3 }).map((_, i) => <ReelSkeleton key={i} />)
          ) : facts.length === 0 ? (
            <div style={{
              height: REEL_H,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', gap: 12,
            }}>
              <Icon icon="solar:document-text-outline" />
              <span style={{ fontSize: 15 }}>No facts found.</span>
            </div>
          ) : (
            facts.map((f, idx) => (
              <ReelCard
                key={f.id}
                fact={f}
                idx={idx}
                tab={tab}
                waypointRef={waypointRef}
                isWaypoint={idx === Math.max(0, facts.length - 3)}
                onLike={() => handleLike(f.id)}
                onSave={() => handleSave(f.id)}
                onShare={() => openShare(f)}
                onRead={() => markRead(f.id)}
                onOptIn={() => handleOptIn(f.id)}
                onOptOut={() => handleOptOut(f.id)}
                imageSrc={imageSrcFor(f)}
                resolveUrl={resolveAbsoluteUrl}
              />
            ))
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1, scrollSnapAlign: 'none' }} />

          {/* Loading more indicator */}
          {prefetching && (
            <div style={{
              position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 20,
              padding: '6px 16px', fontSize: 13, zIndex: 100,
              backdropFilter: 'blur(8px)',
            }}>
              Loading more…
            </div>
          )}
        </div>
      </div>

      {/* ── Share modal ── */}
      {shareTarget && (
        <div
          onClick={closeShare}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--white, #fff)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 32px',
              width: 'min(100vw, 480px)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
            }}
          >
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <strong style={{ fontSize: 16 }}>Share</strong>
              <button onClick={closeShare} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}>
                <Icon icon="solar:close-circle-outline" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { ch: 'WHATSAPP', label: 'WhatsApp',     icon: 'logos:whatsapp-icon',     bg: '#25D366', color: '#fff' },
                { ch: 'FACEBOOK', label: 'Facebook',     icon: 'logos:facebook',           bg: '#1877F2', color: '#fff' },
                { ch: 'TWITTER',  label: 'Twitter / X',  icon: 'pajamas:twitter',          bg: '#000',    color: '#fff' },
                { ch: 'EMAIL',    label: 'Email',         icon: 'solar:letter-outline',    bg: '#6B7280', color: '#fff' },
                { ch: 'COPY_LINK',label: 'Copy Link',     icon: 'solar:copy-outline',      bg: 'rgba(0,0,0,0.06)', color: '#374151' },
                ...(navigator as any).share ? [{ ch: 'WEB_SHARE', label: 'More Options', icon: 'solar:share-outline', bg: 'rgba(0,0,0,0.06)', color: '#374151' }] : [],
              ].map(({ ch, label, icon, bg, color }) => (
                <button
                  key={ch}
                  onClick={() => shareTo(ch as any, shareTarget)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', borderRadius: 12, border: 'none',
                    background: bg, color, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Icon icon={icon} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
