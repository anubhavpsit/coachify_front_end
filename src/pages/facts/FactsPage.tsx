import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { NavLink } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

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
};

type ApiResponse = {
  success: boolean;
  data: {
    facts: Fact[];
    pagination: { current_page: number; last_page: number; total: number };
    unread_count: number;
  };
};

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

  const feedUrl = useMemo(() => {
    if (tab === 'saved') return `${API_BASE_URL}/facts/saved`;
    if (tab === 'superadmin') return `${API_BASE_URL}/admin/superadmin-facts`;
    return `${API_BASE_URL}/facts`;
  }, [tab]);

  // Normalize possible relative URLs from API (e.g., /storage/..)
  const resolveAbsoluteUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    try {
      const base = new URL(API_BASE_URL);
      const origin = `${base.protocol}//${base.host}`;
      return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
    } catch {
      return url;
    }
  }, []);

  const imageSrcFor = (f: Fact) => {
    const abs = resolveAbsoluteUrl(f.image_url || undefined);
    if (!abs) return '';
    const v = f.updated_at || (f as any).publish_at || (f as any).created_at || '';
    return v ? `${abs}${abs.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}` : abs;
  };

  // Normalize API response shapes into a uniform list + pagination
  const extractListAndPg = (res: any) => {
    const list = res.data?.data?.facts || res.data?.data?.items || [];
    const pg = res.data?.data?.pagination || {};
    return { list, pg } as { list: Fact[]; pg: { current_page?: number; last_page?: number } };
  };

  const fetchPage = useCallback(async (p: number) => {
    const params = new URLSearchParams();
    params.append('page', String(p));
    params.append('per_page', '10');
    const res = await axios.get<any>(`${feedUrl}?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
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
      // Prefetch next page quietly to avoid any visible loading while scrolling
      const next = cur + 1;
      if (next <= last) {
        setPrefetching(true);
        fetchPage(next)
          .then(({ list: nextList }) => setBuffer(nextList))
          .catch(() => {})
          .finally(() => setPrefetching(false));
      }
    } catch {
      setError('Unable to load facts.');
      if (p === 1) { setFacts([]); setBuffer([]); }
    } finally { if (p === 1) setLoading(false); }
  }, [token, fetchPage]);

  useEffect(() => { setFacts([]); setPage(1); setLastPage(1); load(1); }, [load, tab]);

  // Infinite scroll with background prefetch buffer
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const waypointRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = waypointRef.current || sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading && page < lastPage) {
        if (buffer.length) {
          // Append prefetched items seamlessly and prefetch the next page
          setFacts(prev => [...prev, ...buffer]);
          setBuffer([]);
          const nextPage = page + 1;
          setPage(nextPage);
          const nextPrefetch = nextPage + 1;
          if (nextPrefetch <= lastPage && !prefetching) {
            setPrefetching(true);
            fetchPage(nextPrefetch).then(({ list: nextList }) => setBuffer(nextList)).catch(() => {}).finally(() => setPrefetching(false));
          }
        } else if (!prefetching) {
          // Fallback: fetch next page and append immediately
          const next = page + 1;
          setPrefetching(true);
          fetchPage(next).then(({ list: nextList }) => {
            setFacts(prev => [...prev, ...nextList]);
            setPage(next);
          }).catch(() => {}).finally(() => setPrefetching(false));
        }
      }
    }, { root: null, rootMargin: '200px', threshold: 0.2 });
    io.observe(node);
    return () => io.disconnect();
  }, [loading, page, lastPage, buffer, prefetching, fetchPage]);

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
  // Share modal state
  const [shareTarget, setShareTarget] = useState<Fact | null>(null);
  const openShare = (f: Fact) => setShareTarget(f);
  const closeShare = () => setShareTarget(null);
  const shareTextFor = (f: Fact) => `${f.title}${f.content ? `\n\n${f.content}` : ''}`;
  const shareUrlFor = (f: Fact) => f.source_url || window.location.origin;
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.left = '-1000px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };
  const logShare = async (factId: number, channel: string) => {
    if (!token) return;
    try { await axios.post(`${API_BASE_URL}/facts/${factId}/share`, { channel }, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
  };
  const shareTo = async (channel: 'WHATSAPP'|'FACEBOOK'|'TWITTER'|'EMAIL'|'COPY_LINK'|'WEB_SHARE', f: Fact) => {
    const text = shareTextFor(f);
    const url = shareUrlFor(f);
    try {
      switch (channel) {
        case 'WHATSAPP':
          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n' + url)}`,'_blank','noopener,noreferrer');
          break;
        case 'FACEBOOK':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
          break;
        case 'TWITTER':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,'_blank','noopener,noreferrer');
          break;
        case 'EMAIL':
          window.location.href = `mailto:?subject=${encodeURIComponent(f.title)}&body=${encodeURIComponent(text + '\n' + url)}`;
          break;
        case 'COPY_LINK': {
          const ok = await copyToClipboard(url);
          if (ok) alert('Link copied to clipboard');
          else alert('Copy failed. Please copy manually: ' + url);
          break;
        }
        case 'WEB_SHARE':
          if ((navigator as any).share) {
            await (navigator as any).share({ title: f.title, text, url });
          }
          break;
      }
    } finally {
      await logShare(f.id, channel);
      closeShare();
    }
  };

  const canPrev = page > 1;
  const canNext = page < lastPage;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex gap-2 mb-3">
            <button className={`btn ${tab==='all'?'btn-primary':'btn-outline-primary'}`} onClick={() => setTab('all')}>All Facts</button>
            <button className={`btn ${tab==='saved'?'btn-primary':'btn-outline-primary'}`} onClick={() => setTab('saved')}>Saved Facts</button>
            {user?.role === 'coaching_admin' && (
              <>
                <NavLink to="/admin/facts" className="btn btn-outline-secondary">My Coaching Facts</NavLink>
                <button className={`btn ${tab==='superadmin'?'btn-primary':'btn-outline-primary'}`} onClick={() => setTab('superadmin')}>Superadmin Facts</button>
              </>
            )}
          </div>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          {loading ? (
            <div className="text-center p-5">Loading…</div>
          ) : facts.length === 0 ? (
            <div className="text-center p-5">No facts found.</div>
          ) : (
            <div style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', scrollSnapType: 'y mandatory', position: 'relative' }}>
              {tab === 'superadmin' ? facts.map((f: any, idx: number) => (
                <div key={f.id} style={{ minHeight: 'calc(100vh - 160px)', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                  <div className="card border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.10)', maxWidth: 420, width: '100%' }}>
                    {f.image_url ? (
                      <div style={{ background: '#000', height: '65vh', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <img src={imageSrcFor(f)} style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block' }} />
                      </div>
                    ) : null}
                    <div className="card-body" style={{ padding: '12px 12px 10px' }}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="badge bg-info text-dark">Superadmin</span>
                      </div>
                      <h5 className="mb-2 d-flex align-items-center gap-2" style={{ fontWeight: 700, fontSize: 16 }}>
                        {f.title}
                      </h5>
                      {f.content ? (
                        <p className="mb-2" style={{ color: '#4B5563', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontSize: 14 }}>{f.content}</p>
                      ) : null}
                      {Array.isArray(f.tags) && f.tags.length ? (
                        <div className="d-flex gap-1 flex-wrap mb-2">
                          {f.tags.slice(0, 5).map((t: string) => (
                            <span key={t} className="badge bg-light text-secondary">#{t}</span>
                          ))}
                        </div>
                      ) : null}
                      <div>
                        {f.is_opted_in ? (
                          <button className="btn btn-outline-danger btn-sm" onClick={async () => { if (!token) return; await axios.post(`${API_BASE_URL}/admin/superadmin-facts/${f.id}/opt-out`, {}, { headers: { Authorization: `Bearer ${token}` } }); load(page); }}>Opt-out</button>
                        ) : (
                          <button className="btn btn-primary btn-sm" onClick={async () => { if (!token) return; await axios.post(`${API_BASE_URL}/admin/superadmin-facts/${f.id}/opt-in`, {}, { headers: { Authorization: `Bearer ${token}` } }); load(page); }}>Opt-in</button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* External side action rail */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <button aria-label="Like" onClick={() => handleLike(f.id)} style={{ border: 'none', background: 'transparent', fontSize: 22, lineHeight: 1 }}>👍</button>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{f.likes_count ?? 0}</span>
                    <button aria-label="Save" onClick={() => handleSave(f.id)} style={{ border: 'none', background: 'transparent', fontSize: 22, lineHeight: 1 }}>{f.saved_by_me ? '💾' : '💾'}</button>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{f.saved_by_me ? 'Saved' : 'Save'}</span>
                    <button aria-label="Share" onClick={() => openShare(f)} style={{ border: 'none', background: 'transparent', fontSize: 22, lineHeight: 1 }}>↗️</button>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Share</span>
                    {f.source_url ? (
                      <>
                        <button aria-label="Source" onClick={() => window.open(f.source_url, '_blank', 'noopener,noreferrer')} style={{ border: 'none', background: 'transparent', fontSize: 20, lineHeight: 1 }}>🔗</button>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>Source</span>
                      </>
                    ) : null}
                  </div>
                </div>
              )) : facts.map((f, idx) => (
                <div
                  key={f.id}
                  ref={(el) => {
                    const waypointIndex = Math.max(0, facts.length - 3);
                    if (idx === waypointIndex) waypointRef.current = el as HTMLDivElement;
                  }}
                  style={{ minHeight: 'calc(100vh - 160px)', scrollSnapAlign: 'start', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}
                >
                  <div className="card border-0" style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.10)', maxWidth: 420, width: '100%' }}>
                    {f.image_url ? (
                      <div style={{ background: '#000', height: '65vh', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <img src={imageSrcFor(f)} style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', display: 'block' }} />
                      </div>
                    ) : null}
                    <div className="card-body" style={{ padding: '12px 12px 10px' }}>
                      <h5 className="mb-2 d-flex align-items-center gap-2" style={{ fontWeight: 700, fontSize: 16 }}>
                        {f.title}
                      </h5>
                      {f.content ? (
                        <p className="mb-2" style={{ color: '#4B5563', lineHeight: 1.5, whiteSpace: 'pre-wrap', fontSize: 14 }}>{f.content}</p>
                      ) : null}
                      {Array.isArray(f.tags) && f.tags.length ? (
                        <div className="d-flex gap-1 flex-wrap mb-2">
                          {f.tags.slice(0, 5).map((t: string) => (
                            <span key={t} className="badge bg-light text-secondary">#{t}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {/* External side action rail */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <button aria-label="Like" onClick={() => handleLike(f.id)} style={{ border: 'none', background: 'transparent', fontSize: 22, lineHeight: 1 }}>👍</button>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{f.likes_count ?? 0}</span>
                    <button aria-label="Save" onClick={() => handleSave(f.id)} style={{ border: 'none', background: 'transparent', fontSize: 22, lineHeight: 1 }}>{f.saved_by_me ? '💾' : '💾'}</button>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{f.saved_by_me ? 'Saved' : 'Save'}</span>
                    <button aria-label="Share" onClick={() => openShare(f)} style={{ border: 'none', background: 'transparent', fontSize: 22, lineHeight: 1 }}>↗️</button>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>Share</span>
                    {f.source_url ? (
                      <>
                        <button aria-label="Source" onClick={() => window.open(f.source_url, '_blank', 'noopener,noreferrer')} style={{ border: 'none', background: 'transparent', fontSize: 20, lineHeight: 1 }}>🔗</button>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>Source</span>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
              {/* Sentinel for infinite load (fallback when waypoint not mounted) */}
              <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
          )}
          {/* Share modal */}
          {shareTarget ? (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeShare}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 16, width: 'min(92vw, 420px)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Share</strong>
                  <button aria-label="Close" onClick={closeShare} style={{ border: 'none', background: 'transparent', fontSize: 20 }}>✖</button>
                </div>
                <div className="d-flex justify-content-between" style={{ gap: 12, flexWrap: 'wrap' }}>
                  <button className="btn btn-light" style={{ flex: '1 1 45%' }} onClick={() => shareTo('WHATSAPP', shareTarget)}>WhatsApp</button>
                  <button className="btn btn-light" style={{ flex: '1 1 45%' }} onClick={() => shareTo('FACEBOOK', shareTarget)}>Facebook</button>
                  <button className="btn btn-light" style={{ flex: '1 1 45%' }} onClick={() => shareTo('TWITTER', shareTarget)}>Twitter/X</button>
                  <button className="btn btn-light" style={{ flex: '1 1 45%' }} onClick={() => shareTo('EMAIL', shareTarget)}>Email</button>
                  <button className="btn btn-outline-secondary" style={{ flex: '1 1 45%' }} onClick={() => shareTo('COPY_LINK', shareTarget)}>Copy Link</button>
                  {(navigator as any).share ? (
                    <button className="btn btn-primary" style={{ flex: '1 1 45%' }} onClick={() => shareTo('WEB_SHARE', shareTarget)}>System Share</button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
