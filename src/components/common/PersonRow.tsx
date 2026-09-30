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
    <div className={cn('tw:flex tw:items-center tw:justify-between tw:gap-3 tw:py-2', className)}>
      <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3">
        <UserAvatar name={name} image={image} toneClassName={avatarToneClassName} />
        <div className="tw:flex tw:min-w-0 tw:flex-col">
          <span className="tw:truncate tw:text-sm tw:font-medium tw:text-foreground">{name}</span>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5 tw:text-xs tw:text-muted-foreground">
            {subtitle}
            {status && (
              <Badge variant={status === 'active' ? 'success' : 'secondary'} className="tw:capitalize">
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
