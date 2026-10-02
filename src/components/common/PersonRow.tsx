import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import UserAvatar from './UserAvatar'

interface Props {
  name: string
  image?: string | null
  /** Shown under the name (e.g. role). */
  subtitle?: ReactNode
  /** Student status badge (active/inactive), shown when provided. */
  status?: string | null
  trailing?: ReactNode
  avatarToneClassName?: string
  className?: string
}

/** Avatar + name + subtitle row used by dashboard people lists. */
export default function PersonRow({ name, image, subtitle, status, trailing, avatarToneClassName, className }: Props) {
  return (
    <div className={cn('flex items-center justify-between gap-3 py-2', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={name} image={image} toneClassName={avatarToneClassName} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {subtitle}
            {status && (
              <Badge variant={status === 'active' ? 'success' : 'secondary'} className="capitalize">
                {status}
              </Badge>
            )}
          </div>
        </div>
      </div>
      {trailing}
    </div>
  )
}
