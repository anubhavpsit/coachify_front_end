import axios, { type AxiosError } from 'axios'

/** Same value/fallback every page used to declare locally. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://coachify.local/api/v1'

export const STORAGE_BASE_URL: string | undefined = import.meta.env.VITE_STORAGE_BASE_URL

/**
 * Shared axios instance for feature services. It only centralises what pages
 * did by hand — base URL and `Authorization: Bearer <authToken>`. Services
 * still pass any extra headers (e.g. `Accept: application/json`) exactly as
 * the page did, so requests stay byte-identical. No global 401 redirect
 * (ProtectedRoute still owns that).
 */
export const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null
  if (token && !config.headers.has('Authorization')) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

type LaravelErrorBody = { message?: string; error?: string; errors?: Record<string, string[] | string> }

/** Laravel 422 `errors` object → `{ field: firstMessage }` (dot keys kept, e.g. `activities.0.subject_id`). */
export function getFieldErrors(err: unknown): Record<string, string> {
  if (!axios.isAxiosError(err) || err.response?.status !== 422) return {}
  const errors = (err.response.data as LaravelErrorBody | undefined)?.errors ?? {}
  const out: Record<string, string> = {}
  for (const [field, messages] of Object.entries(errors)) {
    const first = Array.isArray(messages) ? messages[0] : messages
    if (first) out[field] = first
  }
  return out
}

/** Best human message from an API error, else `fallback`. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<LaravelErrorBody>
    if (!e.response) return 'Unable to reach the server. Check your connection and try again.'
    const body = e.response.data
    const first = Object.values(getFieldErrors(err))[0]
    return first || body?.message || body?.error || fallback
  }
  return fallback
}

export function isForbidden(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 403
}
