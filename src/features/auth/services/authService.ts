import axios from 'axios'
import { API_BASE_URL } from '@/lib/apiClient'
import type { LoginPayload, LoginResponse, TenantResponse } from '../types'

// Requests are byte-identical to the pre-refactor pages (plain axios, same
// URLs and headers) — the backend and mobile app share these endpoints.

/** Public tenant lookup by subdomain (SignInPage). */
export async function fetchTenantBySubdomain(subdomain: string): Promise<TenantResponse> {
  const response = await axios.get<TenantResponse>(`${API_BASE_URL}/tenants/${subdomain}`)
  return response.data
}

/** POST /auth/login (SignInPage). */
export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  return response.data
}

/** Same keys SignInPage wrote after a successful login. */
export function storeSession({ user, token }: LoginResponse): void {
  window.localStorage.setItem('authUser', JSON.stringify(user))
  window.localStorage.setItem('authToken', token)
  window.localStorage.setItem('tenant_id', String(user.tenant_id))
}

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
