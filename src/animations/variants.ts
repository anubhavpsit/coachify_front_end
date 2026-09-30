import type { Transition, Variants } from 'motion/react'
import { duration, easing, spring } from '@/theme/tokens'

// Shared motion variants. Components import these — no ad-hoc inline configs.
// Only transform + opacity are animated.

export const transitions = {
  fast: { duration: duration.fast, ease: easing.standard },
  base: { duration: duration.base, ease: easing.standard },
  slow: { duration: duration.slow, ease: easing.decelerate },
  snappy: spring.snappy,
  gentle: spring.gentle,
  bouncy: spring.bouncy,
} satisfies Record<string, Transition>

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
  exit: { opacity: 0, transition: transitions.fast },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: 4, transition: transitions.fast },
}

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: transitions.bouncy },
  exit: { opacity: 0, scale: 0.6, transition: transitions.fast },
}

/** Parent for staggered children (use with slideUp/fadeIn on the children). */
export const stagger = (step = 0.04, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren } },
})

/** Horizontal shake for invalid fields / failed actions (keyframes, ~300ms). */
export const shake: Variants = {
  idle: { x: 0 },
  shake: { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.3 } },
}

/** One-shot bell wiggle for a new notification. */
export const wiggle: Variants = {
  idle: { rotate: 0 },
  wiggle: { rotate: [0, -14, 12, -8, 6, 0], transition: { duration: 0.5 } },
}
