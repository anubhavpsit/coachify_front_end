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
      className="tw:flex tw:h-full tw:min-w-0 tw:items-center tw:gap-2 tw:text-foreground tw:no-underline tw:hover:text-foreground"
      aria-label={`${brandName} — dashboard`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${brandName} logo`}
          className={cn('tw:max-h-10 tw:object-contain tw:object-left', collapsed ? 'tw:w-10' : 'tw:max-w-[11rem]')}
        />
      ) : collapsed ? (
        <span
          className="tw:flex tw:size-10 tw:items-center tw:justify-center tw:rounded-lg tw:bg-primary tw:text-base tw:font-bold tw:text-primary-foreground"
          title={brandName}
        >
          {brandInitials(brandName)}
        </span>
      ) : (
        <span className="tw:truncate tw:text-xl tw:font-bold" title={brandName}>
          {brandName}
        </span>
      )}
    </NavLink>
  )
}
