import { useMemo } from 'react'
import { can, canAny, type AuthUser } from '@/lib/auth'
import { useAuthUser } from './useAuthUser'

export interface PermissionApi {
  user: AuthUser | null
  role: string | undefined
  /** Existing `can()` — admins always pass. */
  can: (key: string) => boolean
  /** Existing `canAny()` — empty list allows. */
  canAny: (keys: string[]) => boolean
  /** Exact role comparison (no admin bypass), same as the `user.role === …` checks it replaces. */
  hasRole: (...roles: string[]) => boolean
}

/** Thin wrapper over lib/auth — evaluation logic is not duplicated here. */
export function createPermissionApi(user: AuthUser | null): PermissionApi {
  return {
    user,
    role: user?.role,
    can: (key: string) => can(key, user),
    canAny: (keys: string[]) => canAny(keys, user),
    hasRole: (...roles: string[]) => !!user && roles.includes(user.role),
  }
}

export function usePermission(): PermissionApi {
  const user = useAuthUser()
  return useMemo(() => createPermissionApi(user), [user])
}

/** Same rule as <RequirePermission>: role match OR canAny(anyOf). */
export function isAllowed(api: Pick<PermissionApi, 'hasRole' | 'canAny'>, anyOf: string[], orRoles: string[] = []) {
  return api.hasRole(...orRoles) || api.canAny(anyOf)
}
