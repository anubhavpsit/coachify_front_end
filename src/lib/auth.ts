// Auth user + permission helpers.
//
// The login / `/auth/me` response `user` object carries `permissions: string[]`
// (the effective key list — admins get the full catalog). It is persisted whole
// to localStorage.authUser, so `can()` works off that without extra state.

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  tenant_id: number
  permissions?: string[]
  [key: string]: unknown
}

export const ADMIN_ROLES = ['coaching_admin', 'super_admin']

export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('authUser')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as AuthUser) : null
  } catch {
    return null
  }
}

/** Does the current (or given) user hold `key`? Admins always do. */
export function can(key: string, user: AuthUser | null = getAuthUser()): boolean {
  if (!user) return false
  if (ADMIN_ROLES.includes(user.role)) return true
  return Array.isArray(user.permissions) && user.permissions.includes(key)
}

/** True if the user holds at least one of the keys. Empty list => allow (no gate). */
export function canAny(keys: string[], user: AuthUser | null = getAuthUser()): boolean {
  if (keys.length === 0) return true
  if (!user) return false
  if (ADMIN_ROLES.includes(user.role)) return true
  return keys.some((k) => can(k, user))
}

/**
 * Refresh authUser (incl. permissions) from the API. Call on app load so an
 * admin's permission edit reaches an already-logged-in staff session.
 * Returns the fresh user, or null if the token is no longer valid.
 */
export async function refreshAuthUser(apiBaseUrl: string): Promise<AuthUser | null> {
  if (typeof window === 'undefined') return null
  const token = window.localStorage.getItem('authToken')
  if (!token) return null

  try {
    const res = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.status === 401) {
      window.localStorage.removeItem('authUser')
      window.localStorage.removeItem('authToken')
      return null
    }
    if (!res.ok) return getAuthUser()
    const body = await res.json()
    const user = body?.user as AuthUser | undefined
    if (user) {
      window.localStorage.setItem('authUser', JSON.stringify(user))
      return user
    }
  } catch {
    /* offline / transient — keep the cached user */
  }
  return getAuthUser()
}
