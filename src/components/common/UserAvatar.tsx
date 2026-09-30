import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const TONES = [
  'tw:bg-primary-soft tw:text-primary-soft-foreground',
  'tw:bg-success-soft tw:text-success',
  'tw:bg-destructive-soft tw:text-destructive',
  'tw:bg-warning-soft tw:text-warning',
  'tw:bg-info-soft tw:text-info',
  'tw:bg-violet-500/12 tw:text-violet-600',
  'tw:bg-pink-500/12 tw:text-pink-600',
]

// Same hash as the legacy Avatar so people keep their colour.
function toneFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return TONES[Math.abs(hash) % TONES.length]
}

interface Props {
  name: string
  image?: string | null
  className?: string
  /** Override the hashed colour (e.g. by role). */
  toneClassName?: string
}

export default function UserAvatar({ name, image, className, toneClassName }: Props) {
  const src = typeof image === 'string' && image.trim() ? image : undefined
  return (
    <Avatar className={cn('tw:size-9', className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className={cn('tw:text-xs', toneClassName ?? toneFor(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
