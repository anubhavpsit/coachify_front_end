import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export default function EmptyState({ title, description, icon: Icon = Inbox, action, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-6 py-8 text-center', className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="m-0 text-sm font-medium text-foreground">{title}</p>
      {description && <p className="m-0 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
