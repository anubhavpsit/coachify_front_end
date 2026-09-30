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
export function useTenantResolution() {
  const navigate = useNavigate()
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [isResolved, setIsResolved] = useState(false)
  const [brandName, setBrandName] = useState(getTenantBrandName())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.localStorage.getItem('authToken')) {
      navigate(ROUTES.DASHBOARD)
      return
    }
    const savedColor = window.localStorage.getItem('templateColor')
    if (savedColor) applyThemeColor(savedColor)

    const storedTenantId = window.localStorage.getItem('tenant_id')
    if (storedTenantId) {
      const parsed = Number.parseInt(storedTenantId, 10)
      if (!Number.isNaN(parsed)) setTenantId(parsed)
      setBrandName(getTenantBrandName())
      setIsResolved(true)
      return
    }

    const parts = window.location.hostname.split('.')
    if (parts.length < 3) {
      setIsResolved(true)
      return
    }

    fetchTenantBySubdomain(parts[0])
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
  }, [navigate])

  const displayBrandName = brandName ? brandName.charAt(0).toUpperCase() + brandName.slice(1) : ''

  // Keep page title in sync with resolved brand (unchanged).
  useEffect(() => {
    if (displayBrandName) document.title = `${displayBrandName} – Sign In`
  }, [displayBrandName])

  return { tenantId, isResolved, displayBrandName, tenantError: error }
}
