import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormDialog from '@/components/common/FormDialog'
import RichTextEditor from '@/components/common/RichTextEditor'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { friendlyDuplicate, GRADES, toTopicPayload, topicDefaults, topicSchema, type TopicValues } from '../schemas/contentForms'
import { createTopic, fetchChapters, updateTopic, type Subject, type Topic } from '../services/contentLibraryService'

interface Props {
  open: boolean
  onClose: () => void
  /** null = create */
  topic: Topic | null
  subjects: Subject[]
  subjectsLoading?: boolean
  /** Values to start a new topic from (e.g. the current filters, or this chapter). */
  preset?: Partial<TopicValues>
  /** Lock subject + chapter (adding a topic from a chapter page). */
  lockSubjectAndChapter?: boolean
  onSaved: (values: TopicValues) => void
}

/** Add / edit a topic with the backend's validation and duplicate-name message. */
export default function TopicFormDialog({ open, onClose, topic, subjects, subjectsLoading, preset, lockSubjectAndChapter, onSaved }: Props) {
  const form = useForm<TopicValues>({ resolver: zodResolver(topicSchema), defaultValues: topicDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)
  const subjectId = useWatch({ control: form.control, name: 'subject_id' })
  const chapters = useAsync(() => fetchChapters(subjectId).catch((e) => (console.error('Error fetching chapters:', e), [])), [subjectId], { enabled: open && !!subjectId })

  useEffect(() => {
    if (!open) return
    form.reset(topicDefaults(topic, preset))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open, topic])

  const submit = async (v: TopicValues) => {
    setError(null)
    try {
      if (topic) await updateTopic(topic.id, toTopicPayload(v))
      else await createTopic(toTopicPayload(v))
      onSaved(v)
      onClose()
    } catch (err) {
      console.error(topic ? 'Error updating topic:' : 'Error creating topic:', err)
      setError(applyServerErrors(err, form.setError, ['subject_id', 'chapter_id', 'grade', 'name', 'explanation_html'], { fallback: topic ? 'Failed to update topic.' : 'Failed to create topic.' }))
      const nameErr = form.getFieldState('name').error?.message
      if (nameErr) form.setError('name', { type: 'server', message: friendlyDuplicate(nameErr, 'topic') })
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={() => {
        setError(null)
        onClose()
      }}
      title={topic ? 'Edit Topic' : 'Add Topic'}
      description={topic ? undefined : 'Teachers will be able to pick this topic when they log a lesson.'}
      form={form}
      onSubmit={submit}
      submitLabel={topic ? 'Update' : 'Save'}
      submittingLabel={topic ? 'Updating...' : 'Saving...'}
      error={error}
      className="sm:max-w-2xl"
    >
      <FormField
        control={form.control}
        name="subject_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Subject</FormLabel>
            <FormControl>
              <NativeSelect
                {...field}
                disabled={subjectsLoading || lockSubjectAndChapter}
                onChange={(e) => {
                  field.onChange(e.target.value)
                  form.setValue('chapter_id', '') // chapters belong to a subject (legacy reset)
                }}
              >
                <option value="">{subjectsLoading ? 'Loading…' : 'Select subject'}</option>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="chapter_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chapter</FormLabel>
              <FormControl>
                <NativeSelect {...field} disabled={!subjectId || chapters.loading || lockSubjectAndChapter}>
                  <option value="">{!subjectId ? 'Select a subject first' : chapters.loading ? 'Loading…' : 'No chapter'}</option>
                  {subjectId &&
                    (chapters.data ?? []).map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                </NativeSelect>
              </FormControl>
              {!lockSubjectAndChapter && <FormDescription>Optional.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="">All grades (shared)</option>
                  {GRADES.map((g) => (
                    <option key={g} value={String(g)}>
                      Grade {g}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormDescription>Leave as “All grades” unless it is grade-specific.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Topic name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Profit and Loss" autoComplete="off" maxLength={255} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="explanation_html"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Explanation</FormLabel>
            <FormControl>
              <RichTextEditor value={field.value} onChange={field.onChange} aria-invalid={!!fieldState.error} label="Explanation" placeholder="Explain the topic for students (optional)." />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}
