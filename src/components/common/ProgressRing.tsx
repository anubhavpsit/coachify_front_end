import { useRef } from 'react'
import { m, useInView, useReducedMotion } from 'motion/react'
import { useCountUp } from '@/animations'
import { cn } from '@/lib/utils'

interface Props {
  /** 0–100 */
  value: number
  size?: number
  stroke?: number
  /** Tailwind text-* class; the ring uses currentColor. */
  toneClassName?: string
  label?: string
  className?: string
}

/** Circular progress that fills (and counts up) the first time it scrolls into view. */
export default function ProgressRing({ value, size = 88, stroke = 8, toneClassName = 'tw:text-primary', label, className }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, value))
  const shown = useCountUp(inView ? pct : 0)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  return (
    <div className={cn('tw:relative tw:inline-flex tw:shrink-0', className)} style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${pct}%`} className="tw:-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="tw:stroke-muted" />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          className={toneClassName}
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - pct / 100) : c }}
          animate={{ strokeDashoffset: inView || reduce ? c * (1 - pct / 100) : c }}
          transition={{ duration: 0.9, ease: [0, 0, 0, 1] }}
        />
      </svg>
      <span className="tw:absolute tw:inset-0 tw:flex tw:items-center tw:justify-center tw:text-lg tw:font-bold tw:tabular-nums tw:text-foreground" aria-hidden="true">
        {Math.round(shown)}%
      </span>
    </div>
  )
}
