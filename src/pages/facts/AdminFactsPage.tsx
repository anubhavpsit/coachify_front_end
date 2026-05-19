import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1';

type Fact = {
  id: number;
  title: string;
  content?: string | null;
  content_type: 'text' | 'image' | 'link' | 'attachment';
  image_url?: string | null;
  source_url?: string | null;
  tags?: string[] | null;
  is_active?: boolean;
  is_pinned: boolean;
  is_published?: boolean;
  publish_at?: string | null;
};

export default function AdminFactsPage() {
  const [items, setItems] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    content_type: 'text' as Fact['content_type'],
    image_url: '',
    source_url: '',
    tags: '',
    target_roles: [] as string[],
    is_published: false,
    publish_at: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [classOptions, setClassOptions] = useState<{ id:number; name:string }[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;

  const resolveAbsoluteUrl = (url?: string) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    try {
      const base = new URL(API_BASE_URL);
      const origin = `${base.protocol}//${base.host}`;
      return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
    } catch { return url; }
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('include_shared', 'true');
      if (search.trim()) params.append('search', search.trim());
      const res = await axios.get(`${API_BASE_URL}/admin/facts?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(res.data?.data?.data || res.data?.data || []);
      // Load classes for this coaching
      try {
        const authUserRaw = localStorage.getItem('authUser');
        const authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
        const tenantId = authUser?.tenant_id ?? authUser?.tenantId;
        if (tenantId) {
          const cls = await axios.get(`${API_BASE_URL}/classes/${tenantId}`, { headers: { Authorization: `Bearer ${token}` } });
          const options = (cls.data?.data || cls.data || []).map((c: any) => ({ id: c.id, name: c.name || `Class ${c.id}` }));
          setClassOptions(options);
        }
      } catch {}
    } catch (e) {
      setError('Unable to load facts');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  // If Student role is unselected, clear chosen classes to avoid confusion
  useEffect(() => {
    if (!form.target_roles.includes('student') && selectedClassIds.length) {
      setSelectedClassIds([]);
    }
  }, [form.target_roles]);

  const handleUpload = async (file: File) => {
    if (!token) return;
    const fd = new FormData();
    fd.append('image', file);
    const res = await axios.post(`${API_BASE_URL}/facts/images`, fd, { headers: { Authorization: `Bearer ${token}` } });
    setForm((prev) => ({ ...prev, image_url: res.data?.data?.url || '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const payload: any = {
        title: form.title,
        content: form.content || undefined,
        content_type: form.content_type,
        image_url: form.image_url || undefined,
        source_url: form.source_url || undefined,
        tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        target_roles: form.target_roles,
        class_ids: form.target_roles.includes('student') ? selectedClassIds : [],
        is_published: form.is_published,
        publish_at: form.publish_at || undefined,
      };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/facts/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_BASE_URL}/facts`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      setForm({ title: '', content: '', content_type: 'text', image_url: '', source_url: '', tags: '', target_roles: [], is_published: false, publish_at: '' });
      setSelectedClassIds([]);
      setEditingId(null);
      load();
    } catch (e) {
      setError('Failed to create fact');
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <h5 className="mb-3">Manage Facts</h5>
          {error ? <div className="alert alert-danger">{error}</div> : null}
          <form className="card p-3 mb-3" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12 d-flex justify-content-between align-items-end">
                <h6 className="mb-0">{editingId ? 'Edit Fact' : 'Create Fact'}</h6>
                <div className="d-flex gap-2">
                  <input className="form-control" placeholder="Search facts" value={search} onChange={(e) => setSearch(e.target.value)} />
                  {editingId ? <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setForm({ title: '', content: '', content_type: 'text', image_url: '', source_url: '', tags: '', target_roles: [] as string[], is_published: false, publish_at: '' }); }}>Cancel</button> : null}
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Content Type</label>
                <select className="form-select" value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value as any })}>
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="link">Link</option>
                  <option value="attachment">Attachment</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Content</label>
                <textarea className="form-control" rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Image</label>
                <input type="file" accept="image/*" className="form-control" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); }} />
                {form.image_url ? (
                  <div className="mt-2">
                    <small className="text-success d-block mb-1">{editingId ? 'Image selected' : 'Uploaded'} ✓</small>
                    <img src={resolveAbsoluteUrl(form.image_url)} alt="Fact image preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  </div>
                ) : null}
              </div>
              <div className="col-md-6">
                <label className="form-label">Source URL</label>
                <input className="form-control" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://…" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Tags (comma)</label>
                <input className="form-control" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="famous_places, capitals" />
              </div>

              <div className="col-md-4">
                <label className="form-label">Publish Date/Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={form.publish_at}
                  onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
                />
                <small className="text-muted">Facts will be visible only after this time when published.</small>
              </div>
              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check">
                  <input id="is-published" className="form-check-input" type="checkbox" checked={form.is_published} onChange={(e)=> setForm({ ...form, is_published: e.target.checked })} />
                  <label className="form-check-label" htmlFor="is-published">Published</label>
                </div>
              </div>
              
              <div className="col-12 d-flex gap-2">
                <div className="form-check">
                  <input id="role-student" className="form-check-input" type="checkbox" checked={form.target_roles.includes('student')} onChange={(e) => setForm({ ...form, target_roles: e.target.checked ? [...form.target_roles, 'student'] : form.target_roles.filter(r => r !== 'student') })} />
                  <label className="form-check-label" htmlFor="role-student">Student</label>
                </div>
                <div className="form-check">
                  <input id="role-teacher" className="form-check-input" type="checkbox" checked={form.target_roles.includes('teacher')} onChange={(e) => setForm({ ...form, target_roles: e.target.checked ? [...form.target_roles, 'teacher'] : form.target_roles.filter(r => r !== 'teacher') })} />
                  <label className="form-check-label" htmlFor="role-teacher">Teacher</label>
                </div>
              </div>
              {form.target_roles.includes('student') && (
                <div className="col-12">
                  <p className="text-xs text-secondary-light mb-1">Unchecking the Student role will clear your class selection.</p>
                  <label className="form-label">Target Classes</label>
                  <div className="border rounded p-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {classOptions.length === 0 ? (
                      <div className="text-muted">No classes found for your institute.</div>
                    ) : (
                      classOptions.map((c) => (
                        <div className="form-check" key={c.id}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`class-${c.id}`}
                            checked={selectedClassIds.includes(c.id)}
                            onChange={(e) => {
                              setSelectedClassIds((prev) =>
                                e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                              );
                            }}
                          />
                          <label className="form-check-label" htmlFor={`class-${c.id}`}>{c.name}</label>
                        </div>
                      ))
                    )}
                  </div>
                  <small className="text-muted">Only applies when Student role is selected.</small>
                </div>
              )}
              <div className="col-12">
                <button className="btn btn-primary" type="submit">{editingId ? 'Update Fact' : 'Create Fact'}</button>
              </div>
            </div>
          </form>

          <div className="card p-3">
            <h6>Existing Facts</h6>
            {loading ? <p>Loading…</p> : (
              items.length === 0 ? <p>No facts yet.</p> : (
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Title</th><th>Type</th><th>Active</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {items.map((f) => (
                        <tr key={f.id}>
                          <td>{f.title}</td>
                          <td>{f.content_type}</td>
                          <td>{f.is_active ? 'Yes' : 'No'}</td>
                          <td>{f.is_published ? 'Published' : 'Draft'}{f.publish_at ? ` • ${new Date(f.publish_at).toLocaleString()}` : ''}</td>
                          <td className="d-flex gap-2">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => {
                              setEditingId(f.id);
                              setForm({
                                title: f.title,
                                content: f.content || '',
                                content_type: f.content_type,
                                image_url: f.image_url || '',
                                source_url: f.source_url || '',
                                tags: (f.tags || []).join(', '),
                                target_roles: [],
                                is_published: !!f.is_published,
                                publish_at: f.publish_at ? new Date(f.publish_at).toISOString().slice(0,16) : '',
                              });
                            }}>Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                              if (!token) return;
                              if (!confirm('Delete this fact?')) return;
                              await axios.delete(`${API_BASE_URL}/facts/${f.id}`, { headers: { Authorization: `Bearer ${token}` } });
                              load();
                            }}>Delete</button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={async () => {
                              if (!token) return;
                              await axios.put(`${API_BASE_URL}/facts/${f.id}`, { is_active: !(f.is_active ?? true) }, { headers: { Authorization: `Bearer ${token}` } });
                              load();
                            }}>{f.is_active ? 'Deactivate' : 'Activate'}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
