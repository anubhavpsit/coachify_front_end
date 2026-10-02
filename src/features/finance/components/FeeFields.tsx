import type { ReactNode } from 'react'
import type { Control } from 'react-hook-form'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { todayInputValue } from '@/features/people/schemas/person'
import { cn } from '@/lib/utils'
import { NOTES_MAX, PAYMENT_MODES, type FeeValues } from '../schemas/feeForm'
import type { FeeStudent } from '../services/feesService'

interface Props {
  control: Control<FeeValues>
  students: FeeStudent[]
  disabled?: boolean
  studentHint?: ReactNode
  /** Rendered under From Date (suggestion status). */
  fromHint?: ReactNode
  onStudentChange?: (id: number | '') => void
  className?: string
  fromDateMin?: string
}

/** Student / period / amount / mode / submitted-on / notes — shared by Add and Edit. */
export default function FeeFields({ control, students, disabled, studentHint, fromHint, onStudentChange, className }: Props) {
  return (
    <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
      <FormField
        control={control}
        name="student_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Student</FormLabel>
            <FormControl>
              <NativeSelect
                value={field.value}
                name={field.name}
                onBlur={field.onBlur}
                disabled={disabled}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : ''
                  field.onChange(v)
                  onStudentChange?.(v)
                }}
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
            {studentHint && <FormDescription>{studentHint}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="from_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>From Date</FormLabel>
            <FormControl>
              <Input type="date" disabled={disabled} {...field} />
            </FormControl>
            {fromHint}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="to_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>To Date</FormLabel>
            <FormControl>
              <Input type="date" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Amount Submitted</FormLabel>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
                ₹
              </span>
              <FormControl>
                <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" className="pl-7" disabled={disabled} {...field} />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="payment_mode"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Submission Mode</FormLabel>
            <FormControl>
              <NativeSelect disabled={disabled} {...field}>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === 'upi' ? 'UPI' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="submitted_on"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Submitted On</FormLabel>
            <FormControl>
              <Input type="date" max={todayInputValue()} disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem className="sm:col-span-2 lg:col-span-3">
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea rows={2} maxLength={NOTES_MAX} placeholder="Optional (receipt no., remarks…)" disabled={disabled} {...field} />
            </FormControl>
            <div className="flex justify-between">
              <FormMessage />
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                {field.value.length}/{NOTES_MAX}
              </span>
            </div>
          </FormItem>
        )}
      />
    </div>
  )
}
