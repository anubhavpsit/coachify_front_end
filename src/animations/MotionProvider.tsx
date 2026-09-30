import type { ReactNode } from 'react'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'

/**
 * - LazyMotion + `m.*` keeps the motion bundle small (strict: `motion.*` throws).
 * - reducedMotion="user": with prefers-reduced-motion, transform animations are
 *   skipped and only opacity changes run.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
