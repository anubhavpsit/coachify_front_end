import type { LucideIcon } from 'lucide-react'
import { m } from 'motion/react'
import { slideUp, useCountUp } from '@/animations'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type StatTone = 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'violet' | 'pink'

const TONES: Record<StatTone, string> = {
  primary: 'tw:bg-primary-soft tw:text-primary-soft-foreground',
  success: 'tw:bg-success-soft tw:text-success',
  warning: 'tw:bg-warning-soft tw:text-warning',
  destructive: 'tw:bg-destructive-soft tw:text-destructive',
  info: 'tw:bg-info-soft tw:text-info',
  violet: 'tw:bg-violet-500/12 tw:text-violet-600',
  pink: 'tw:bg-pink-500/12 tw:text-pink-600',
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
        'tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4 tw:shadow-xs tw:sm:gap-4 tw:sm:p-5 tw:transition-[transform,box-shadow] tw:duration-200 tw:hover:-translate-y-0.5 tw:hover:shadow-md',
        className,
      )}
    >
      <div className="tw:flex tw:items-center tw:gap-3">
        <span className={cn('tw:flex tw:size-9 tw:shrink-0 tw:sm:size-11 tw:items-center tw:justify-center tw:rounded-full', TONES[tone])}>
          <Icon className="tw:size-4 tw:sm:size-5" aria-hidden="true" />
        </span>
        <span className="tw:text-xs tw:font-medium tw:text-muted-foreground tw:sm:text-sm">{label}</span>
      </div>
      <div className="tw:truncate tw:text-xl tw:font-bold tw:tabular-nums tw:tracking-tight tw:text-foreground tw:sm:text-3xl" aria-label={`${label}: ${format(value ?? 0)}`}>
        <span aria-hidden="true">{format(shown)}</span>
      </div>
    </m.div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-5">
      <div className="tw:flex tw:items-center tw:gap-3">
        <Skeleton className="tw:size-11 tw:rounded-full" />
        <Skeleton className="tw:h-4 tw:w-28" />
      </div>
      <Skeleton className="tw:h-8 tw:w-20" />
    </div>
  )
}
