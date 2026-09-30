// Design tokens that live in JS (motion). Colour, radius, shadow, spacing and
// type tokens are CSS variables in src/styles/tailwind.css so they can change
// at runtime; keep the two files in sync.

/** Durations in seconds (Framer Motion units). */
export const duration = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
} as const

/** Cubic-bezier easings. */
export const easing = {
  standard: [0.2, 0, 0, 1],
  decelerate: [0, 0, 0, 1],
  accelerate: [0.3, 0, 1, 1],
} as const

export const spring = {
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.8 },
  gentle: { type: 'spring', stiffness: 260, damping: 26 },
  bouncy: { type: 'spring', stiffness: 420, damping: 14 },
} as const
