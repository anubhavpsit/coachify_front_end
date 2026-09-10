import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { refreshAuthUser } from '../lib/auth'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export default function ProtectedRoute() {
  const initialToken =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('authToken')
      : null

  const [hasToken, setHasToken] = useState<boolean>(!!initialToken)

  // Refresh authUser (incl. permissions) once per app load so an admin's
  // permission change reaches an already-logged-in staff session. A 401 clears
  // the session and bounces to sign-in.
  useEffect(() => {
    let active = true
    if (!initialToken) return
    refreshAuthUser(API_BASE_URL).then((user) => {
      if (active && user === null) setHasToken(false)
    })
    return () => {
      active = false
    }
  }, [initialToken])

  if (!hasToken) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
