import { z } from 'zod'
import { email, password } from '@/lib/validation'

// Pre-refactor rules: email required + type=email (trimmed), password
// required + minLength 8 (kept at 8 — decision D4). Password is not trimmed.
export const signInSchema = z.object({
  email: email(),
  password: password(),
})

export type SignInValues = z.infer<typeof signInSchema>

export const SIGN_IN_FIELDS = ['email', 'password'] as const
