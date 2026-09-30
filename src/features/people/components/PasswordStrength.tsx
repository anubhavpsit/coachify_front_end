import { m } from 'motion/react'
import { transitions } from '@/animations'
import { passwordStrength } from '@/lib/validation'
import { cn } from '@/lib/utils'

const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const
const TONES = ['tw:bg-destructive', 'tw:bg-destructive', 'tw:bg-warning', 'tw:bg-info', 'tw:bg-success'] as const

/** Advisory meter under password fields — informs, never blocks (decision D4). */
export default function PasswordStrength({ value }: { value: string }) {
  if (!value) return null
  const score = passwordStrength(value)
  return (
    <div className="tw:flex tw:items-center tw:gap-2" aria-live="polite">
      <div className="tw:grid tw:flex-1 tw:grid-cols-4 tw:gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="tw:h-1.5 tw:overflow-hidden tw:rounded-full tw:bg-muted">
            <m.div
              className={cn('tw:h-full tw:origin-left tw:rounded-full', TONES[score])}
              initial={false}
              animate={{ scaleX: score >= i ? 1 : 0 }}
              transition={transitions.base}
            />
          </div>
        ))}
      </div>
      <span className="tw:w-16 tw:text-right tw:text-xs tw:text-muted-foreground">
        <span className="tw:sr-only">Password strength: </span>
        {LABELS[score]}
      </span>
    </div>
  )
}
