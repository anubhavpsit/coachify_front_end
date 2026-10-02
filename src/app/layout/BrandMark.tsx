import { NavLink } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { getTenantBrandName, getTenantPrimaryLogoUrl } from '@/utils/branding'

function brandInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

/** Tenant logo, or the tenant name (initials when collapsed) — same fallbacks as before. */
export default function BrandMark({ collapsed }: { collapsed?: boolean }) {
  const raw = getTenantBrandName()
  const brandName = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : ''
  const logoUrl = getTenantPrimaryLogoUrl()

  return (
    <NavLink
      to={ROUTES.DASHBOARD}
      className="flex h-full min-w-0 items-center gap-2 text-foreground no-underline hover:text-foreground"
      aria-label={`${brandName} — dashboard`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${brandName} logo`}
          className={cn('max-h-10 object-contain object-left', collapsed ? 'w-10' : 'max-w-[11rem]')}
        />
      ) : collapsed ? (
        <span
          className="flex size-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground"
          title={brandName}
        >
          {brandInitials(brandName)}
        </span>
      ) : (
        <span className="truncate text-xl font-bold" title={brandName}>
          {brandName}
        </span>
      )}
    </NavLink>
  )
}
