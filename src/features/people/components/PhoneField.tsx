import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { looksLikeIndianMobile, PHONE_PATTERN } from '@/lib/validation'

/** Optional phone; validation = backend regex, plus a non-blocking hint for non-Indian mobile patterns (D4). */
export default function PhoneField<T extends FieldValues>({ control, name, label = 'Phone' }: { control: Control<T>; name: FieldPath<T>; label?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const v = String(field.value ?? '').trim()
        const hint = v && !fieldState.error && PHONE_PATTERN.test(v) && !looksLikeIndianMobile(v)
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input type="tel" inputMode="tel" autoComplete="off" maxLength={20} placeholder="e.g. 98765 43210" {...field} />
            </FormControl>
            {hint && <FormDescription className="tw:text-warning">This doesn't look like a 10-digit Indian mobile number — double-check it.</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
