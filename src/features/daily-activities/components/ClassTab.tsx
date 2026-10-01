import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { CircleAlert, Info, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { NativeSelect } from '@/components/ui/native-select'
import { batchDefaults, batchSchema, dateProblem, toBatchPayload, type BatchValues } from '../schemas/activityForm'
import { saveBatch, type Option, type SubjectOption } from '../services/dailyActivitiesService'
import { FilePicker, PendingFiles } from './Attachments'
import LessonFields from './LessonFields'

interface Props {
  date: string
  classes: Option[]
  subjects: SubjectOption[]
  loading: boolean
  onDirtyChange: (dirty: boolean) => void
  onSaved: () => void
}

/** "Whole class": the same lesson for every student of a class who takes the subject. */
export default function ClassTab({ date, classes, subjects, loading, onDirtyChange, onSaved }: Props) {
  const form = useForm<BatchValues>({ resolver: zodResolver(batchSchema), defaultValues: batchDefaults(), mode: 'onTouched' })
  const [formError, setFormError] = useState<string | null>(null)
  const [subjectId, files] = useWatch({ control: form.control, name: ['subject_id', 'files'] })
  const { isDirty, isSubmitting } = form.formState
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])
  const dateErr = dateProblem(date)

  const submit = async (values: BatchValues) => {
    if (dateErr) return
    setFormError(null)
    try {
      const message = await saveBatch(toBatchPayload(values, date), values.files)
      toast.success(message || 'Batch activity saved successfully!')
      form.reset(batchDefaults())
      onSaved()
    } catch (err) {
      console.error('Error saving batch activity:', err)
      // Backend explains 404/403 cases ("No students found for this class and subject assigned to you.").
      const msg = axios.isAxiosError(err) && err.response?.data?.message ? String(err.response.data.message) : 'Failed to save batch activity.'
      const fieldErrors = axios.isAxiosError(err) ? (err.response?.data?.errors as Record<string, string[]> | undefined) : undefined
      if (fieldErrors) {
        for (const [k, v] of Object.entries(fieldErrors)) {
          const name = k.startsWith('attachments') ? 'files' : k
          if (['class_id', 'subject_id', 'notes', 'homework', 'files'].includes(name)) form.setError(name as keyof BatchValues, { message: v[0] })
        }
      }
      setFormError(msg)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tw:flex tw:items-center tw:gap-2">
          <Users className="tw:size-4 tw:text-primary" aria-hidden="true" /> Same lesson for a whole class
        </CardTitle>
        <CardDescription>Saved for every active student in the class who takes the subject (only your assigned students if you are a teacher).</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} noValidate className="tw:flex tw:flex-col tw:gap-5">
            <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Class</FormLabel>
                    <FormControl>
                      <NativeSelect {...field} disabled={loading || isSubmitting}>
                        <option value="">{loading ? 'Loading…' : 'Select class'}</option>
                        {classes.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
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
                name="subject_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Subject</FormLabel>
                    <FormControl>
                      <NativeSelect
                        {...field}
                        disabled={loading || isSubmitting}
                        onChange={(e) => {
                          field.onChange(e.target.value)
                          form.setValue('chapter', null)
                          form.setValue('topic', null)
                        }}
                      >
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
            </div>

            <LessonFields
              control={form.control}
              setValue={form.setValue}
              names={{ chapter: 'chapter', topic: 'topic', notes: 'notes', homework: 'homework' }}
              subjectId={subjectId ? Number(subjectId) : null}
              disabled={isSubmitting}
            />

            <FormField
              control={form.control}
              name="files"
              render={() => (
                <FormItem>
                  <FormLabel>Attachments</FormLabel>
                  <PendingFiles
                    files={files}
                    onRemove={(i) =>
                      form.setValue(
                        'files',
                        files.filter((_, idx) => idx !== i),
                        { shouldDirty: true, shouldValidate: true },
                      )
                    }
                  />
                  <FilePicker
                    disabled={isSubmitting}
                    hint="JPG, PNG, WebP or PDF · up to 10 MB each · added for every student"
                    onFiles={(ok) => form.setValue('files', [...files, ...ok], { shouldDirty: true, shouldValidate: true })}
                    onRejected={(problems) => problems.forEach((p) => toast.error(p))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <Info aria-hidden="true" />
              <AlertDescription>If a student already has an entry for this subject on this day, it is updated with this lesson.</AlertDescription>
            </Alert>

            {formError && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="tw:flex tw:justify-end">
              <Button type="submit" loading={isSubmitting} disabled={loading || !!dateErr}>
                {isSubmitting ? 'Saving…' : 'Save for whole class'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
