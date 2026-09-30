import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { applyThemeColor } from '@/theme'
import { getTenantBrandName, setTenantBranding } from '@/utils/branding'
import { fetchTenantBySubdomain } from '../services/authService'

export const TENANT_LOAD_ERROR = 'Unable to load tenant information.'

/**
 * Port of SignInPage's mount effect, step for step:
 * 1. already signed in → /dashboard
 * 2. re-apply the cached tenant colour
 * 3. cached tenant_id → use it
 * 4. no subdomain (fewer than 3 host parts) → resolved with no tenant
 * 5. otherwise GET /tenants/{subdomain}, cache it, apply theme_color
 */
type InitialState = {
  redirect: boolean
  tenantId: number | null
  isResolved: boolean
  subdomain: string | null
}

/** Synchronous part of the legacy effect (steps 1, 3, 4) — decided before first render. */
function readInitialState(): InitialState {
  const none = { redirect: false, tenantId: null, isResolved: true, subdomain: null }
  if (typeof window === 'undefined') return none
  if (window.localStorage.getItem('authToken')) return { ...none, redirect: true, isResolved: false }
  const storedTenantId = window.localStorage.getItem('tenant_id')
  if (storedTenantId) {
    const parsed = Number.parseInt(storedTenantId, 10)
    return { ...none, tenantId: Number.isNaN(parsed) ? null : parsed }
  }
  const parts = window.location.hostname.split('.')
  if (parts.length < 3) return none
  return { ...none, isResolved: false, subdomain: parts[0] }
}

export function useTenantResolution() {
  const navigate = useNavigate()
  const [initial] = useState(readInitialState)
  const [tenantId, setTenantId] = useState<number | null>(initial.tenantId)
  const [isResolved, setIsResolved] = useState(initial.isResolved)
  const [brandName, setBrandName] = useState(getTenantBrandName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initial.redirect) {
      navigate(ROUTES.DASHBOARD)
      return
    }
    const savedColor = window.localStorage.getItem('templateColor')
    if (savedColor) applyThemeColor(savedColor)
    if (!initial.subdomain) return

    fetchTenantBySubdomain(initial.subdomain)
      .then((data) => {
        const tenant = data?.tenant
        if (tenant && typeof tenant.id === 'number') {
          setTenantId(tenant.id)
          window.localStorage.setItem('tenant_id', String(tenant.id))
          setTenantBranding(tenant)
          setBrandName(getTenantBrandName())
          if (tenant.theme_color) {
            applyThemeColor(tenant.theme_color)
            window.localStorage.setItem('templateColor', tenant.theme_color)
          }
        } else {
          setError(TENANT_LOAD_ERROR)
        }
      })
      .catch(() => setError(TENANT_LOAD_ERROR))
      .finally(() => setIsResolved(true))
  }, [initial, navigate])

  const displayBrandName = brandName ? brandName.charAt(0).toUpperCase() + brandName.slice(1) : ''

  // Keep page title in sync with resolved brand (unchanged).
  useEffect(() => {
    if (displayBrandName) document.title = `${displayBrandName} – Sign In`
  }, [displayBrandName])

  return { tenantId, isResolved, displayBrandName, tenantError: error }
}
