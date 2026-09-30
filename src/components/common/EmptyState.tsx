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
    <div className={cn('tw:flex tw:flex-col tw:items-center tw:gap-2 tw:px-6 tw:py-8 tw:text-center', className)}>
      <span className="tw:flex tw:size-11 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted tw:text-muted-foreground">
        <Icon className="tw:size-5" aria-hidden="true" />
      </span>
      <p className="tw:m-0 tw:text-sm tw:font-medium tw:text-foreground">{title}</p>
      {description && <p className="tw:m-0 tw:max-w-sm tw:text-sm tw:text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
