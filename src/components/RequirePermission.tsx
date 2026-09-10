import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { canAny, getAuthUser } from '../lib/auth'

interface Props {
  /** User needs at least one of these permission keys. */
  anyOf: string[]
  /** ...or holds one of these roles outright (e.g. teacher on a shared page). */
  orRoles?: string[]
  /** Where to send a user who fails the check. */
  redirectTo?: string
  children?: ReactNode
}

/**
 * Route guard. Use as a wrapper around a page element, or as a layout route
 * (renders <Outlet /> when it has no children).
 *
 *   <Route element={<RequirePermission anyOf={['fees.view']} />}> ... </Route>
 *   <Route index element={<RequirePermission anyOf={['fees.view']}><FeesPage/></RequirePermission>} />
 */
export default function RequirePermission({
  anyOf,
  orRoles = [],
  redirectTo = '/dashboard',
  children,
}: Props) {
  const user = getAuthUser()
  const allowed =
    (!!user && orRoles.includes(user.role)) || canAny(anyOf, user)

  if (!allowed) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children ?? <Outlet />}</>
}
