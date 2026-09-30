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
      className={cn('tw:flex tw:flex-col tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-dashed tw:border-border tw:bg-card tw:px-6 tw:py-10 tw:text-center', className)}
    >
      <span className="tw:flex tw:size-12 tw:items-center tw:justify-center tw:rounded-full tw:bg-destructive-soft tw:text-destructive">
        <TriangleAlert className="tw:size-6" aria-hidden="true" />
      </span>
      <div className="tw:flex tw:flex-col tw:gap-1">
        <h2 className="tw:m-0 tw:text-base! tw:font-semibold tw:text-foreground">{title}</h2>
        <p className="tw:m-0 tw:max-w-md tw:text-sm tw:text-muted-foreground">{description}</p>
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
