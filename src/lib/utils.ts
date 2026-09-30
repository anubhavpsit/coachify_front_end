import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Tailwind runs with the `tw:` prefix while the legacy WowDash/Bootstrap CSS is
// still loaded (their `.p-4`, `.border`, … use !important and would collide).
const twMerge = extendTailwindMerge({ prefix: 'tw' })

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
