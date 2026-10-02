import { m } from 'motion/react'
import { transitions } from '@/animations'
import { passwordStrength } from '@/lib/validation'
import { cn } from '@/lib/utils'

const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const
const TONES = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-info', 'bg-success'] as const

/** Advisory meter under password fields — informs, never blocks (decision D4). */
export default function PasswordStrength({ value }: { value: string }) {
  if (!value) return null
  const score = passwordStrength(value)
  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 overflow-hidden rounded-full bg-muted">
            <m.div
              className={cn('h-full origin-left rounded-full', TONES[score])}
              initial={false}
              animate={{ scaleX: score >= i ? 1 : 0 }}
              transition={transitions.base}
            />
          </div>
        ))}
      </div>
      <span className="w-16 text-right text-xs text-muted-foreground">
        <span className="sr-only">Password strength: </span>
        {LABELS[score]}
      </span>
    </div>
  )
}
