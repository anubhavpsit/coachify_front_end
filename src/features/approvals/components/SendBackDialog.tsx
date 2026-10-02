import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import FormDialog from '@/components/common/FormDialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/apiClient'
import type { ReviewActivity } from '../services/activityApprovalsService'

/** Backend: remarks required when rejecting, max:500. */
export const REMARKS_MAX = 500
const schema = z.object({
  remarks: z.string().trim().min(1, 'Tell the teacher what to fix.').max(REMARKS_MAX, `Keep it under ${REMARKS_MAX} characters.`),
})
type Values = z.infer<typeof schema>

const SUGGESTIONS = ['Please add the homework.', 'Please pick the topic you taught.', 'Class notes are too short — add the key points.', 'The attachment is unclear; please re-upload.']

interface Props {
  activity: ReviewActivity | null
  onClose: () => void
  /** Rejects to keep the dialog open. */
  onSubmit: (activity: ReviewActivity, remarks: string) => Promise<void>
}

/**
 * Replaces window.prompt. For a pending entry this sends it back to the
 * teacher (the student never sees it); for an approved one it also hides it
 * from the student again ("Mark pending" in the legacy page).
 */
export default function SendBackDialog({ activity, onClose, onSubmit }: Props) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { remarks: '' } })
  const [error, setError] = useState<string | null>(null)
  const remarks = useWatch({ control: form.control, name: 'remarks' })
  const approved = !!activity?.is_admin_approved

  useEffect(() => {
    if (activity) form.reset({ remarks: activity.admin_feedback ?? '' })
  }, [activity, form])

  const submit = async (v: Values) => {
    setError(null)
    try {
      await onSubmit(activity!, v.remarks.trim())
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update approval. Please try again.'))
    }
  }

  return (
    <FormDialog
      open={!!activity}
      onClose={() => {
        setError(null)
        onClose()
      }}
      title={approved ? 'Mark as pending' : 'Send back to teacher'}
      description={
        activity ? (
          <>
            {activity.student?.name ?? 'Student'} · {activity.subject?.subject ?? '-'}
            {activity.teacher?.name ? ` · by ${activity.teacher.name}` : ''}.{' '}
            {approved ? 'The student will stop seeing this activity until it is approved again.' : 'The teacher is notified; the student does not see it.'}
          </>
        ) : null
      }
      form={form}
      onSubmit={submit}
      submitLabel={approved ? 'Mark pending' : 'Send back'}
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
              <span className={remarks.length > REMARKS_MAX ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                {remarks.length}/{REMARKS_MAX}
              </span>
            </div>
            <FormControl>
              <Textarea rows={4} autoFocus placeholder="What should the teacher change?" {...field} />
            </FormControl>
            <FormDescription className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
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
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}
