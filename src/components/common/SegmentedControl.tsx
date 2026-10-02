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
    <div role="tablist" aria-label={label} className={cn('inline-flex rounded-full bg-muted p-1', className)}>
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
              'relative m-0 cursor-pointer rounded-full border-0 bg-transparent font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && <m.span layoutId={`seg-${id}`} transition={transitions.snappy} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
