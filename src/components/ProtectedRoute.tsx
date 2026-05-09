import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const authToken =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('authToken')
      : null

  if (!authToken) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
