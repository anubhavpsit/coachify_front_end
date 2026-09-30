import { z } from 'zod'

// Reusable field rules. Keep them at least as strict as the Laravel rules
// they mirror (see UI_AUDIT.md §6) — never looser.

/** Password policy for web (decision D4): minimum 8 characters. */
export const PASSWORD_MIN = 8

export const requiredText = (label: string, max?: number) => {
  const base = z.string().trim().min(1, `${label} is required.`)
  return max ? base.max(max, `${label} must be at most ${max} characters.`) : base
}

export const email = (label = 'Email') =>
  z.string().trim().min(1, `${label} is required.`).email('Enter a valid email address.').max(255, `${label} must be at most 255 characters.`)

export const password = (label = 'Password') =>
  z.string().min(1, `${label} is required.`).min(PASSWORD_MIN, `${label} must be at least ${PASSWORD_MIN} characters.`)
