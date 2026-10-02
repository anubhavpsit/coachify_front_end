import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

// Same URLs, headers and bodies as the legacy FactsPage / AdminFactsPage.
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` })

export type ContentType = 'text' | 'image' | 'link' | 'attachment'
export type Fact = {
  id: number
  tenant_id?: number
  title: string
  content?: string | null
  content_type: ContentType
  image_url?: string | null
  attachment_url?: string | null
  source_url?: string | null
  tags?: string[] | null
  target_roles?: string[] | null
  likes_count?: number
  shares_count?: number
  is_pinned: boolean
  is_published?: boolean
  is_active?: boolean
  publish_at?: string | null
  expire_at?: string | null
  updated_at?: string | null
  saved_by_me?: boolean
  liked_by_me?: boolean
  is_opted_in?: boolean
}
export type FeedTab = 'all' | 'saved' | 'superadmin'
export type ShareChannel = 'WHATSAPP' | 'FACEBOOK' | 'TWITTER' | 'EMAIL' | 'COPY_LINK' | 'WEB_SHARE'

/** Relative upload paths resolve against the API host (legacy). */
export function absoluteUrl(url?: string | null): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  try {
    const base = new URL(API_BASE_URL)
    return url.startsWith('/') ? `${base.protocol}//${base.host}${url}` : `${base.protocol}//${base.host}/${url}`
  } catch {
    return url
  }
}

/** Image URL with a cache-buster from updated_at / publish_at (legacy). */
export function factImageSrc(f: Fact): string {
  const abs = absoluteUrl(f.image_url)
  if (!abs) return ''
  const v = f.updated_at || f.publish_at || ''
  return v ? `${abs}${abs.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}` : abs
}

const feedUrl = (tab: FeedTab) => (tab === 'saved' ? `${API_BASE_URL}/facts/saved` : tab === 'superadmin' ? `${API_BASE_URL}/admin/superadmin-facts` : `${API_BASE_URL}/facts`)

export async function fetchFeedPage(tab: FeedTab, page: number): Promise<{ list: Fact[]; current: number; last: number }> {
  const params = new URLSearchParams({ page: String(page), per_page: '10' })
  const res = await axios.get(`${feedUrl(tab)}?${params}`, { headers: auth() })
  const list: Fact[] = res.data?.data?.facts || res.data?.data?.items || []
  const pg = res.data?.data?.pagination || {}
  return { list, current: pg.current_page ?? page, last: pg.last_page ?? page }
}

export async function toggleLike(id: number): Promise<{ liked: boolean; likes_count?: number }> {
  const res = await axios.post(`${API_BASE_URL}/facts/${id}/like`, {}, { headers: auth() })
  const d = res.data?.data || {}
  return { liked: !!d.liked, likes_count: d.likes_count }
}
export async function toggleSave(id: number): Promise<boolean> {
  const res = await axios.post(`${API_BASE_URL}/facts/${id}/save`, {}, { headers: auth() })
  return !!res.data?.data?.saved
}
export const markRead = (id: number) => axios.post(`${API_BASE_URL}/facts/${id}/read`, {}, { headers: auth() })
export async function logShare(id: number, channel: ShareChannel): Promise<number | undefined> {
  const res = await axios.post(`${API_BASE_URL}/facts/${id}/share`, { channel }, { headers: auth() })
  const n = res.data?.data?.shares_count
  return typeof n === 'number' ? n : undefined
}
export const optIn = (id: number) => axios.post(`${API_BASE_URL}/admin/superadmin-facts/${id}/opt-in`, {}, { headers: auth() })
export const optOut = (id: number) => axios.post(`${API_BASE_URL}/admin/superadmin-facts/${id}/opt-out`, {}, { headers: auth() })

// ---- Manage (coaching admin) ----
export type FactPayload = {
  title: string
  content: string | undefined
  content_type: ContentType
  image_url: string | undefined
  source_url: string | undefined
  tags: string[]
  target_roles: string[]
  class_ids?: number[]
  is_published: boolean
  publish_at: string | undefined
}

export async function fetchManagedFacts(search: string): Promise<Fact[]> {
  const params = new URLSearchParams()
  params.append('include_shared', 'true')
  if (search.trim()) params.append('search', search.trim())
  const res = await axios.get(`${API_BASE_URL}/admin/facts?${params.toString()}`, { headers: auth() })
  return res.data?.data?.data || res.data?.data || []
}

export async function fetchClassOptions(): Promise<{ id: number; name: string }[]> {
  const raw = localStorage.getItem('authUser')
  const u = raw ? JSON.parse(raw) : null
  const tenantId = u?.tenant_id ?? u?.tenantId
  if (!tenantId) return []
  const res = await axios.get(`${API_BASE_URL}/classes/${tenantId}`, { headers: auth() })
  return (res.data?.data || res.data || []).map((c: { id: number; name?: string }) => ({ id: c.id, name: c.name || `Class ${c.id}` }))
}

export async function uploadFactImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await axios.post(`${API_BASE_URL}/facts/images`, fd, { headers: auth() })
  return res.data?.data?.url || ''
}
export const createFact = (p: FactPayload) => axios.post(`${API_BASE_URL}/facts`, p, { headers: auth() })
export const updateFact = (id: number, p: FactPayload | { is_active: boolean }) => axios.put(`${API_BASE_URL}/facts/${id}`, p, { headers: auth() })
export const deleteFact = (id: number) => axios.delete(`${API_BASE_URL}/facts/${id}`, { headers: auth() })
