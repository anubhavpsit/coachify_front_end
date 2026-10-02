import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormDialog from '@/components/common/FormDialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors } from '@/lib/forms'
import { createDefaults, createSchema, DESCRIPTION_MAX, toCreatePayload, type CreateValues } from '../schemas/assessmentForms'
import { createAssessment, type Assessment } from '../services/assessmentsService'

interface Props {
  open: boolean
  onClose: () => void
  subjects: { id: number; subject: string }[]
  classes: { id: number; name: string }[]
  loading: boolean
  onCreated: (a: Assessment) => void
}

const QUICK_MARKS = [10, 20, 25, 50, 100]

export default function CreateAssessmentDialog({ open, onClose, subjects, classes, loading, onCreated }: Props) {
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: createDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)
  const [description, marks] = useWatch({ control: form.control, name: ['description', 'total_marks'] })

  useEffect(() => {
    if (open) form.reset(createDefaults())
  }, [open, form])

  const submit = async (v: CreateValues) => {
    setError(null)
    try {
      const created = await createAssessment(toCreatePayload(v))
      if (!created) {
        setError('Failed to create assessment')
        return
      }
      onCreated(created)
      onClose()
    } catch (err) {
      console.error('Error creating assessment:', err)
      setError(applyServerErrors(err, form.setError, ['title', 'subject_id', 'class_id', 'total_marks', 'scheduled_date', 'description'], { fallback: 'Failed to create assessment' }))
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={() => {
        setError(null)
        onClose()
      }}
      title="Create Assessment"
      description="Create the test, then assign students and add its question paper."
      form={form}
      onSubmit={submit}
      submitLabel="Create"
      submittingLabel="Saving..."
      error={error}
      className="sm:max-w-xl"
    >
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Title</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Unit Test 1 — Linear Equations" autoComplete="off" maxLength={255} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="subject_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Subject</FormLabel>
              <FormControl>
                <NativeSelect {...field} disabled={loading}>
                  <option value="">{loading ? 'Loading…' : 'Select subject'}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.subject}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="class_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class</FormLabel>
              <FormControl>
                <NativeSelect {...field} disabled={loading}>
                  <option value="">Any class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormDescription>Limits who you can assign it to.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="total_marks"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Total marks</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" min={1} max={1000} step={1} placeholder="e.g. 50" {...field} />
              </FormControl>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common totals">
                {QUICK_MARKS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={marks === String(m)}
                    onClick={() => form.setValue('total_marks', String(m), { shouldDirty: true, shouldValidate: true })}
                    className={
                      marks === String(m)
                        ? 'm-0 cursor-pointer rounded-full border border-solid border-primary bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary'
                        : 'm-0 cursor-pointer rounded-full border border-solid border-border bg-transparent px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted'
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scheduled_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>Optional — you can set it when assigning.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-baseline justify-between">
              <FormLabel>Description</FormLabel>
              <span className="text-xs text-muted-foreground">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <FormControl>
              <Textarea rows={3} maxLength={DESCRIPTION_MAX} placeholder="Syllabus covered, instructions for students… (optional)" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}
