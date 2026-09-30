import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { clearSession, logoutRequest } from '../services/authService'

/** Logout flow, unchanged: call the API (errors ignored), clear the session, go to sign-in. */
export function useLogout() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const logout = useCallback(async () => {
    setLoggingOut(true)
    try {
      const token = window.localStorage.getItem('authToken')
      if (token) await logoutRequest(token)
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      clearSession()
      setLoggingOut(false)
      navigate(ROUTES.SIGN_IN)
    }
  }, [navigate])

  return { logout, loggingOut }
}
