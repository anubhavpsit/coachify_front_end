import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

/**
 * Shared Notice Board unread count (sidebar badge). The Notice Board card
 * publishes the server's count when it loads / opens a notice; the sidebar
 * also refreshes it on a timer.
 */
type Listener = (count: number) => void

let count = 0
const listeners = new Set<Listener>()

export function getNoticeUnreadCount() {
  return count
}

export function setNoticeUnreadCount(next: number | undefined | null) {
  if (typeof next !== 'number' || next === count) return
  count = Math.max(0, next)
  listeners.forEach(l => l(count))
}

export function subscribeNoticeUnread(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function refreshNoticeUnread() {
  const token = localStorage.getItem('authToken')
  if (!token) return
  try {
    const res = await axios.get<{ success: boolean; data: { unread_count: number } }>(
      `${API_BASE_URL}/notices/unread-count`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    setNoticeUnreadCount(res.data.data.unread_count)
  } catch {
    // keep last known count
  }
}
