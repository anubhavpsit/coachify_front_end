import { getTenantBrandName } from '@/utils/branding'

export default function Footer() {
  const brandName = getTenantBrandName()
  return (
    <footer className="tw:mt-auto tw:border-t tw:border-solid tw:border-border tw:bg-card tw:px-4 tw:py-4 tw:md:px-6">
      <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">
        © {new Date().getFullYear()} {brandName}. All Rights Reserved.
      </p>
    </footer>
  )
}
