import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { fadeIn } from '@/animations'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import EmptyState from './EmptyState'

interface Props {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  loading?: boolean
  /** Message to show instead of content; pair with onRetry. */
  error?: ReactNode
  onRetry?: () => void
  empty?: boolean
  emptyTitle?: ReactNode
  emptyIcon?: LucideIcon
  /** Scroll the body beyond this height (default 300px, like the legacy cards). */
  maxBodyHeight?: string | false
  skeletonRows?: number
  className?: string
  bodyClassName?: string
  children?: ReactNode
}

/** Dashboard widget shell: header, then exactly one of skeleton / error / empty / content. */
export default function WidgetCard({
  title,
  description,
  icon: Icon,
  action,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = 'Nothing here yet',
  emptyIcon,
  maxBodyHeight = '300px',
  skeletonRows = 3,
  className,
  bodyClassName,
  children,
}: Props) {
  const state = loading ? 'loading' : error ? 'error' : empty ? 'empty' : 'content'
  return (
    <Card className={cn('h-full gap-3 pb-3', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent
        className={cn('min-h-0 overflow-y-auto', bodyClassName)}
        style={maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={state} variants={fadeIn} initial="hidden" animate="visible" exit="exit">
            {state === 'loading' && (
              <div className="flex flex-col gap-3" role="status" aria-label="Loading">
                {Array.from({ length: skeletonRows }, (_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {state === 'error' && (
              <div className="flex flex-col items-start gap-2 py-2" role="alert">
                <p className="m-0 text-sm text-destructive">{error}</p>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Try again
                  </Button>
                )}
              </div>
            )}
            {state === 'empty' && <EmptyState icon={emptyIcon} title={emptyTitle} className="py-4" />}
            {state === 'content' && children}
          </m.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
