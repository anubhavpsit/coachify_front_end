import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'

/** Same request the Topbar used to send. */
export async function logoutRequest(token: string): Promise<void> {
  await axios.post(
    `${API_BASE_URL}/auth/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  )
}

/** Same keys the Topbar cleared on logout. */
export function clearSession(): void {
  window.localStorage.removeItem('authUser')
  window.localStorage.removeItem('authToken')
  window.localStorage.removeItem('tenant_id')
  window.localStorage.removeItem('tenant')
  window.sessionStorage.clear()
}
