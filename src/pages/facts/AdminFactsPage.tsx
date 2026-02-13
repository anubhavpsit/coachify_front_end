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
  is_pinned: boolean;
  is_published: boolean;
  publish_at?: string | null;
  expire_at?: string | null;
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
    is_pinned: false,
    is_published: true,
    publish_at: '',
    expire_at: '',
    target_roles: [] as string[],
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('include_shared', 'true');
      if (search.trim()) params.append('search', search.trim());
      const res = await axios.get(`${API_BASE_URL}/admin/facts?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(res.data?.data?.data || res.data?.data || []);
    } catch (e) {
      setError('Unable to load facts');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

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
        is_pinned: form.is_pinned,
        is_published: form.is_published,
        publish_at: form.publish_at || undefined,
        expire_at: form.expire_at || undefined,
        target_roles: form.target_roles,
      };
      if (editingId) {
        await axios.put(`${API_BASE_URL}/facts/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_BASE_URL}/facts`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      setForm({ title: '', content: '', content_type: 'text', image_url: '', source_url: '', tags: '', is_pinned: false, is_published: true, publish_at: '', expire_at: '', target_roles: [] });
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
                  {editingId ? <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setForm({ title: '', content: '', content_type: 'text', image_url: '', source_url: '', tags: '', is_pinned: false, is_published: true, publish_at: '', expire_at: '', target_roles: [] }); }}>Cancel</button> : null}
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
                {form.image_url ? <small className="text-success">Uploaded ✓</small> : null}
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
                <label className="form-label">Publish At</label>
                <input type="datetime-local" className="form-control" value={form.publish_at} onChange={(e) => setForm({ ...form, publish_at: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Expire At</label>
                <input type="datetime-local" className="form-control" value={form.expire_at} onChange={(e) => setForm({ ...form, expire_at: e.target.value })} />
              </div>
              <div className="col-12 d-flex gap-3">
                <div className="form-check">
                  <input id="pin" className="form-check-input" type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
                  <label className="form-check-label" htmlFor="pin">Pinned</label>
                </div>
                <div className="form-check">
                  <input id="pub" className="form-check-input" type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
                  <label className="form-check-label" htmlFor="pub">Published</label>
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
                <div className="form-check">
                  <input id="role-admin" className="form-check-input" type="checkbox" checked={form.target_roles.includes('coaching_admin')} onChange={(e) => setForm({ ...form, target_roles: e.target.checked ? [...form.target_roles, 'coaching_admin'] : form.target_roles.filter(r => r !== 'coaching_admin') })} />
                  <label className="form-check-label" htmlFor="role-admin">Admin</label>
                </div>
              </div>
              <div className="col-12">
                <button className="btn btn-primary" type="submit">Create Fact</button>
              </div>
            </div>
          </form>

          <div className="card p-3">
            <h6>Existing Facts</h6>
            {loading ? <p>Loading…</p> : (
              items.length === 0 ? <p>No facts yet.</p> : (
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Title</th><th>Type</th><th>Pinned</th><th>Published</th><th>Publish At</th><th>Actions</th></tr></thead>
                    <tbody>
                      {items.map((f) => (
                        <tr key={f.id}>
                          <td>{f.title}</td>
                          <td>{f.content_type}</td>
                          <td>{f.is_pinned ? 'Yes' : 'No'}</td>
                          <td>{f.is_published ? 'Yes' : 'No'}</td>
                          <td>{f.publish_at ? new Date(f.publish_at).toLocaleString() : ''}</td>
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
                                is_pinned: f.is_pinned,
                                is_published: f.is_published,
                                publish_at: f.publish_at ? new Date(f.publish_at).toISOString().slice(0,16) : '',
                                expire_at: f.expire_at ? new Date(f.expire_at).toISOString().slice(0,16) : '',
                                target_roles: [],
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
                              await axios.post(`${API_BASE_URL}/facts/${f.id}/publish`, { is_published: !f.is_published }, { headers: { Authorization: `Bearer ${token}` } });
                              load();
                            }}>{f.is_published ? 'Unpublish' : 'Publish'}</button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={async () => {
                              if (!token) return;
                              await axios.post(`${API_BASE_URL}/facts/${f.id}/pin`, { is_pinned: !f.is_pinned }, { headers: { Authorization: `Bearer ${token}` } });
                              load();
                            }}>{f.is_pinned ? 'Unpin' : 'Pin'}</button>
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
