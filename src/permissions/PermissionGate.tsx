import type { ReactNode } from 'react'
import { isAllowed, usePermission } from './usePermission'

interface Props {
  /** User needs at least one of these keys (empty = no permission gate, like canAny). */
  anyOf?: string[]
  /** ...or holds one of these roles outright. */
  orRoles?: string[]
  /** Rendered when the check fails (default: nothing). */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Element-level gate. Same rule as <RequirePermission> but hides instead of
 * redirecting. With neither prop set it only checks the roles — pass
 * `anyOf={[]}` explicitly if you really want "always allow".
 */
export default function PermissionGate({ anyOf, orRoles = [], fallback = null, children }: Props) {
  const api = usePermission()
  const allowed = anyOf === undefined ? api.hasRole(...orRoles) : isAllowed(api, anyOf, orRoles)
  return <>{allowed ? children : fallback}</>
}
