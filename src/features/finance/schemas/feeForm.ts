import { z } from 'zod'
import { todayInputValue } from '@/features/people/schemas/person'
import type { FeePayload } from '../services/feesService'

export const NOTES_MAX = 1000
export const PAYMENT_MODES = ['cash', 'online', 'cheque', 'upi', 'other'] as const

/**
 * StudentFeeController: student_id required; from_date required|date;
 * to_date required|after_or_equal:from_date; amount required|numeric|min:0;
 * payment_mode required|max:50; submitted_on required|before_or_equal:today;
 * notes nullable|max:1000. (The legacy Add form didn't check to >= from; the
 * edit form and the API did — both forms do now.)
 */
export const feeSchema = z
  .object({
    student_id: z.union([z.number().int().positive(), z.literal('')]).refine((v): boolean => v !== '', 'Select a student.'),
    from_date: z.string().min(1, 'From date is required.'),
    to_date: z.string().min(1, 'To date is required.'),
    amount: z
      .string()
      .trim()
      .min(1, 'Amount is required.')
      .refine((v) => !Number.isNaN(Number(v)), 'Enter a valid amount.')
      .refine((v) => Number(v) >= 0, 'Amount cannot be negative.'),
    payment_mode: z.enum(PAYMENT_MODES, { error: 'Select a submission mode.' }),
    submitted_on: z
      .string()
      .min(1, 'Submitted On is required.')
      .refine((v) => v <= todayInputValue(), 'Submitted On date cannot be in the future.'),
    notes: z.string().max(NOTES_MAX, `Notes must be at most ${NOTES_MAX} characters.`),
  })
  .refine((v) => !v.from_date || !v.to_date || v.to_date >= v.from_date, { path: ['to_date'], message: '"To" date must be on or after the "From" date.' })
export type FeeValues = z.infer<typeof feeSchema>

export const FEE_FIELDS = ['student_id', 'from_date', 'to_date', 'amount', 'payment_mode', 'submitted_on', 'notes'] as const

export const feeDefaults = (studentId: number | '' = ''): FeeValues => ({
  student_id: studentId,
  from_date: '',
  to_date: '',
  amount: '',
  payment_mode: 'cash',
  submitted_on: todayInputValue(),
  notes: '',
})

/** Same body for create and edit (legacy). */
export function toFeePayload(v: FeeValues): FeePayload {
  return {
    student_id: Number(v.student_id),
    from_date: v.from_date,
    to_date: v.to_date,
    amount: Number(v.amount),
    payment_mode: v.payment_mode,
    submitted_on: v.submitted_on,
    notes: v.notes.trim() || null,
  }
}
