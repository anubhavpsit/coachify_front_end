import { useEffect, useState } from 'react';
import axios from 'axios';

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
  is_pinned: boolean;
  is_published: boolean;
  publish_at?: string | null;
  expire_at?: string | null;
  is_read?: boolean;
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
  const [facts, setFacts] = useState<Fact[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  // Overlay removed per requirement

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;

  useEffect(() => {
    if (!token) {
      setError('Sign in to view facts.');
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('per_page', '20');
    if (search.trim()) params.append('search', search.trim());
    if (date) params.append('date', date);
    if (tags.trim()) params.append('tags', tags);
    setLoading(true);
    setError(null);
    params.append('pinned_by_me', 'true');
    axios
      .get<ApiResponse>(`${API_BASE_URL}/facts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((res) => {
        const list = res.data.data.facts || [];
        setFacts(list);
        setPage(res.data.data.pagination.current_page);
        setLastPage(res.data.data.pagination.last_page);
        if (typeof window !== 'undefined') {
          if (list.length > 0) {
            window.localStorage.setItem('hasPinnedFacts', 'true');
          } else {
            window.localStorage.removeItem('hasPinnedFacts');
          }
        }
      })
      .catch((e) => {
        if (axios.isCancel(e)) return;
        setError('Unable to load facts.');
        setFacts([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token, page, search, date, tags]);

  // Overlay disabled per requirement

  const canPrev = page > 1;
  const canNext = page < lastPage;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          {/* Overlay removed */}
          <div className="card mb-3">
            <div className="card-body d-flex gap-2 align-items-end flex-wrap">
              <div>
                <label className="form-label">Search</label>
                <input className="form-control" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Find facts" />
              </div>
              <div>
                <label className="form-label">Date</label>
                <input type="date" className="form-control" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
              </div>
              <div>
                <label className="form-label">Tags</label>
                <input className="form-control" value={tags} onChange={(e) => { setTags(e.target.value); setPage(1); }} placeholder="e.g. capitals, famous_places" />
              </div>
              <div className="ms-auto d-flex gap-2">
                <button className="btn btn-outline-secondary" disabled={!canPrev || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
                <button className="btn btn-primary" disabled={!canNext || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="alert alert-danger">{error}</div>
          ) : null}

          {loading ? (
            <div className="text-center p-5">Loading…</div>
          ) : facts.length === 0 ? (
            <div className="text-center p-5">No facts found.</div>
          ) : (
            facts.map((f) => (
              <div key={f.id} className={`card mb-2 ${f.is_pinned ? 'border-warning' : ''}`}>
                <div className="card-body" onClick={async () => {
                  if (!token) return;
                  try { await axios.post(`${API_BASE_URL}/facts/${f.id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
                    setFacts((prev) => prev.map((x) => x.id === f.id ? { ...x, is_read: true } : x));
                  } catch {}
                }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      {f.is_pinned ? <span className="badge bg-warning text-dark me-2">Pinned</span> : null}
                      {f.title}
                    </h6>
                    {!f.is_read ? <span className="badge bg-primary">Unread</span> : null}
                  </div>
                  {f.content ? <p className="mt-2 mb-1 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{f.content}</p> : null}
                  {f.tags && f.tags.length ? (
                    <div className="d-flex gap-1 mt-1 flex-wrap">
                      {f.tags.map((t) => (
                        <span key={t} className="badge bg-light text-secondary">{t}</span>
                      ))}
                    </div>
                  ) : null}
                  <small className="text-secondary">{f.publish_at ? new Date(f.publish_at).toLocaleString() : ''}</small>
                </div>
              </div>
            ))
          )}

          <div className="d-flex justify-content-center align-items-center gap-3 my-3">
            <button className="btn btn-outline-secondary" disabled={!canPrev || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <span>Page {page} of {lastPage}</span>
            <button className="btn btn-primary" disabled={!canNext || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
