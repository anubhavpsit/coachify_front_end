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

/** Edit forms: blank keeps the current password; otherwise the same policy. */
export const optionalPassword = (label = 'Password') =>
  z.string().refine((v) => v === '' || v.length >= PASSWORD_MIN, `${label} must be at least ${PASSWORD_MIN} characters.`)

/** Backend: gender required|in:male,female,other */
export const GENDERS = ['male', 'female', 'other'] as const
export const gender = () => z.enum(GENDERS, { error: 'Please select a gender.' })

/** Backend: dob nullable|date. Empty allowed; a date can't be in the future. */
export const optionalPastDate = (label = 'Date of birth') =>
  z.string().refine((v) => {
    if (!v) return true
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return v <= iso
  }, `${label} can't be in the future.`)

/**
 * Advisory strength score 0–4 for the meter (never blocks saving — D4).
 * Length ≥ 8, ≥ 12, mixed case, digits, symbols.
 */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0
  let score = 0
  if (pw.length >= PASSWORD_MIN) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(4, pw.length < PASSWORD_MIN ? Math.min(score, 1) : score) as 0 | 1 | 2 | 3 | 4
}

/** Backend teacher/student phone rule: nullable|max:20|regex:/^\+?[0-9\s\-]{7,20}$/ */
export const PHONE_PATTERN = /^\+?[0-9\s-]{7,20}$/
export const optionalPhone = (label = 'Phone') =>
  z
    .string()
    .trim()
    .max(20, `${label} must be at most 20 characters.`)
    .refine((v) => v === '' || PHONE_PATTERN.test(v), 'Enter a valid phone number (digits, spaces, dashes, optional +).')

/** Advisory only (D4): 10-digit Indian mobile, optional +91 / 0 prefix. */
export function looksLikeIndianMobile(v: string): boolean {
  const digits = v.replace(/[\s-]/g, '')
  return /^(?:\+91|0)?[6-9]\d{9}$/.test(digits)
}
