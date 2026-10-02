import type { ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { m } from 'motion/react'
import { slideUp } from '@/animations'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export default function ErrorState({
  title = 'Something went wrong',
  description = 'This section could not be loaded. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: Props) {
  return (
    <m.div
      role="alert"
      variants={slideUp}
      initial="hidden"
      animate="visible"
      className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center', className)}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive-soft text-destructive">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-base! font-semibold text-foreground">{title}</h2>
        <p className="m-0 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </m.div>
  )
}
