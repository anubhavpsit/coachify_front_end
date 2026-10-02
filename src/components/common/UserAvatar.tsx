import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const TONES = [
  'bg-primary-soft text-primary-soft-foreground',
  'bg-success-soft text-success',
  'bg-destructive-soft text-destructive',
  'bg-warning-soft text-warning',
  'bg-info-soft text-info',
  'bg-violet-500/12 text-violet-600',
  'bg-pink-500/12 text-pink-600',
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
    // Decorative: the name is always rendered next to it, so screen readers skip the initials.
    <Avatar className={cn('size-9', className)} aria-hidden="true">
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className={cn('text-xs', toneClassName ?? toneFor(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
