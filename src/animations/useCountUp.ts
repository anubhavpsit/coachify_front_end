import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { duration as durations, easing } from '@/theme/tokens'

/**
 * Counts from 0 to `value` once (first time a numeric value arrives), then
 * follows later changes without replaying from zero. Reduced motion: jumps
 * straight to the value.
 */
export function useCountUp(value: number | null | undefined, { duration = durations.slow * 2 } = {}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState<number>(() => (reduce ? (value ?? 0) : 0))
  const from = useRef(0)

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return
    if (reduce) {
      setDisplay(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration,
      ease: easing.decelerate,
      onUpdate: (v) => setDisplay(v),
    })
    from.current = value
    return () => controls.stop()
  }, [value, reduce, duration])

  return display
}
