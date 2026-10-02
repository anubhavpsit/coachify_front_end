import type { LucideIcon } from 'lucide-react'
import { m } from 'motion/react'
import { slideUp, useCountUp } from '@/animations'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type StatTone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'violet' | 'pink'

const TONES: Record<StatTone, string> = {
  primary: 'bg-primary-soft text-primary-soft-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  destructive: 'bg-destructive-soft text-destructive',
  info: 'bg-info-soft text-info',
  violet: 'bg-violet-500/12 text-violet-600',
  pink: 'bg-pink-500/12 text-pink-600',
}

interface Props {
  label: string
  value: number | undefined
  icon: LucideIcon
  tone?: StatTone
  /** Format the (animated) number for display. */
  format?: (value: number) => string
  className?: string
}

/** KPI tile; the number counts up on first load (instant with reduced motion). */
export default function StatCard({ label, value, icon: Icon, tone = 'primary', format = (v) => Math.round(v).toLocaleString(), className }: Props) {
  const shown = useCountUp(typeof value === 'number' ? value : 0)
  return (
    <m.div
      variants={slideUp}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-xl border border-solid border-border bg-card p-4 shadow-xs sm:gap-4 sm:p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('flex size-9 shrink-0 sm:size-11 items-center justify-center rounded-full', TONES[tone])}>
          <Icon className="size-4 sm:size-5" aria-hidden="true" />
        </span>
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
      </div>
      <div className="truncate text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
        {/* Screen readers get the final value, not the count-up frames. */}
        <span className="sr-only">{format(value ?? 0)}</span>
        <span aria-hidden="true">{format(shown)}</span>
      </div>
    </m.div>
  )
}

/** Same box as StatCard at every breakpoint, so the grid doesn't jump when the numbers arrive. */
export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-solid border-border bg-card p-4 sm:gap-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full sm:size-11" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-7 w-20 sm:h-9" />
    </div>
  )
}
