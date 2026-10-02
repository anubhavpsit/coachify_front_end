import { useEffect, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormDialog from '@/components/common/FormDialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/apiClient'

/** Backend: remarks required when rejecting, max:500. */
const MAX = 500
const schema = z.object({ remarks: z.string().trim().min(1, 'Tell the teacher what to fix.').max(MAX, `Keep it under ${MAX} characters.`) })

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  submitLabel: string
  initial?: string
  suggestions?: string[]
  /** Rejects to keep the dialog open. */
  onSubmit: (remarks: string) => Promise<void>
}

/** Required-remarks dialog (replaces window.prompt). */
export default function RemarksDialog({ open, onClose, title, description, submitLabel, initial = '', suggestions = [], onSubmit }: Props) {
  const form = useForm<{ remarks: string }>({ resolver: zodResolver(schema), defaultValues: { remarks: '' } })
  const [error, setError] = useState<string | null>(null)
  const remarks = useWatch({ control: form.control, name: 'remarks' })

  useEffect(() => {
    if (open) form.reset({ remarks: initial })
  }, [open, initial, form])

  const submit = async (v: { remarks: string }) => {
    setError(null)
    try {
      await onSubmit(v.remarks.trim())
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update approval. Please try again.'))
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={() => {
        setError(null)
        onClose()
      }}
      title={title}
      description={description}
      form={form}
      onSubmit={submit}
      submitLabel={submitLabel}
      submittingLabel="Sending…"
      error={error}
    >
      <FormField
        control={form.control}
        name="remarks"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-baseline justify-between">
              <FormLabel required>Remarks for the teacher</FormLabel>
              <span className={remarks.length > MAX ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                {remarks.length}/{MAX}
              </span>
            </div>
            <FormControl>
              <Textarea rows={4} autoFocus placeholder="What needs to be regenerated or fixed?" {...field} />
            </FormControl>
            {suggestions.length > 0 && (
              <FormDescription className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => form.setValue('remarks', remarks ? `${remarks.trimEnd()} ${s}` : s, { shouldDirty: true, shouldValidate: true })}
                    className="m-0 cursor-pointer rounded-full border border-solid border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}
