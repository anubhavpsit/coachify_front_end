import { Navigate, Outlet } from 'react-router-dom'
import { ROLES } from '../constants/roles'

export default function SuperAdminRoute() {
  const authUser = JSON.parse(
    (typeof window !== 'undefined' && window.localStorage.getItem('authUser')) || '{}',
  )

  if (authUser?.role !== ROLES.SUPER_ADMIN) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
