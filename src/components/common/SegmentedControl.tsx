import { useId } from 'react'
import { m } from 'motion/react'
import { transitions } from '@/animations'
import { cn } from '@/lib/utils'

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
  size?: 'sm' | 'default'
  className?: string
}

/** Pill tabs with a sliding indicator (role=tablist, arrow-key friendly via native buttons). */
export default function SegmentedControl<T extends string>({ value, onChange, options, label, size = 'default', className }: Props<T>) {
  const id = useId()
  return (
    <div role="tablist" aria-label={label} className={cn('tw:inline-flex tw:rounded-full tw:bg-muted tw:p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'tw:relative tw:m-0 tw:cursor-pointer tw:rounded-full tw:border-0 tw:bg-transparent tw:font-semibold tw:outline-none tw:transition-colors tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
              size === 'sm' ? 'tw:px-3 tw:py-1 tw:text-xs' : 'tw:px-4 tw:py-1.5 tw:text-sm',
              active ? 'tw:text-primary-foreground' : 'tw:text-muted-foreground tw:hover:text-foreground',
            )}
          >
            {active && <m.span layoutId={`seg-${id}`} transition={transitions.snappy} className="tw:absolute tw:inset-0 tw:rounded-full tw:bg-primary tw:shadow-sm" />}
            <span className="tw:relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
