import { getTenantBrandName } from '@/utils/branding'

export default function Footer() {
  const brandName = getTenantBrandName()
  return (
    <footer className="mt-auto border-t border-solid border-border bg-card px-4 py-4 md:px-6">
      <p className="m-0 text-sm text-muted-foreground">
        © {new Date().getFullYear()} {brandName}. All Rights Reserved.
      </p>
    </footer>
  )
}
