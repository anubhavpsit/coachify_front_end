import { z } from 'zod'
import type { ExpensePayload } from '../services/expensesService'

/**
 * ExpenseController: amount required|numeric|min:0; expense_date required|date;
 * description nullable|max:500; note nullable; expense_by required|exists.
 */
export const expenseSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, 'Amount is required.')
    .refine((v) => !Number.isNaN(Number(v)), 'Enter a valid amount.')
    .refine((v) => Number(v) >= 0, 'Amount cannot be negative.'),
  expense_date: z.string().min(1, 'Expense date is required.'),
  expense_by: z.union([z.number().int().positive(), z.literal('')]).refine((v): boolean => v !== '', 'Select who made the expense.'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters.'),
  note: z.string().trim(),
})
export type ExpenseValues = z.infer<typeof expenseSchema>

export const expenseDefaults = (): ExpenseValues => ({ amount: '', expense_date: '', expense_by: '', description: '', note: '' })

/** Legacy body: numbers for amount/expense_by, empty strings → null. */
export function toExpensePayload(v: ExpenseValues): ExpensePayload {
  return {
    amount: Number(v.amount),
    expense_date: v.expense_date,
    description: v.description || null,
    note: v.note || null,
    expense_by: Number(v.expense_by),
  }
}
