import { useMemo, useSyncExternalStore } from 'react'
import { AUTH_CHANGED_EVENT, type AuthUser } from '@/lib/auth'

const STORAGE_KEY = 'authUser'

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange()
  }
  window.addEventListener(AUTH_CHANGED_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * The signed-in user from localStorage.authUser — the same source `getAuthUser()`
 * reads — read synchronously on first render (no "render then hide") and
 * re-rendered when `refreshAuthUser()` updates it after GET /auth/me.
 */
export function useAuthUser(): AuthUser | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null)
  return useMemo(() => {
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as AuthUser) : null
    } catch {
      return null
    }
  }, [raw])
}
