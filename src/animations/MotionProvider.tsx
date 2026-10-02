import type { ReactNode } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'

const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default)

/**
 * - LazyMotion + `m.*` keeps the motion bundle small (strict: `motion.*` throws).
 *   The animation features load in their own chunk after first paint; until
 *   then `m.*` elements render in their final state without animating.
 * - reducedMotion="user": with prefers-reduced-motion, transform animations are
 *   skipped and only opacity changes run.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
