import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: ReactNode
  description?: ReactNode
  /** Right-aligned actions (buttons). Gate them with PermissionGate where needed. */
  actions?: ReactNode
  className?: string
}

export default function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div className={cn('tw:mb-6 tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-3', className)}>
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
        <h1 className="tw:m-0 tw:text-2xl! tw:font-bold tw:tracking-tight tw:text-foreground">{title}</h1>
        {description && <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{actions}</div>}
    </div>
  )
}
