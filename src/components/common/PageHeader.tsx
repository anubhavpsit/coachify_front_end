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
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 text-2xl! font-bold tracking-tight text-foreground">{title}</h1>
        {description && <p className="m-0 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
