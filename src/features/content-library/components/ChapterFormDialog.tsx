import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormDialog from '@/components/common/FormDialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { applyServerErrors } from '@/lib/forms'
import { chapterDefaults, chapterSchema, friendlyDuplicate, toChapterPayload, type ChapterValues } from '../schemas/contentForms'
import { createChapter, updateChapter, type Chapter, type Subject } from '../services/contentLibraryService'

interface Props {
  open: boolean
  onClose: () => void
  /** null = create */
  chapter: Chapter | null
  subjects: Subject[]
  subjectsLoading?: boolean
  /** Subject to preselect when creating. */
  presetSubjectId?: string
  /** Called with the API's chapter (create) or the submitted values (update). */
  onSaved: (result: { id?: number; values: ChapterValues }) => void
}

/** Add / edit a chapter (subject + name), with the backend's validation and duplicate-name message. */
export default function ChapterFormDialog({ open, onClose, chapter, subjects, subjectsLoading, presetSubjectId = '', onSaved }: Props) {
  const form = useForm<ChapterValues>({ resolver: zodResolver(chapterSchema), defaultValues: chapterDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    form.reset(chapterDefaults(chapter, presetSubjectId))
  }, [open, chapter, presetSubjectId, form])

  const submit = async (v: ChapterValues) => {
    setError(null)
    try {
      if (chapter) {
        await updateChapter(chapter.id, toChapterPayload(v))
        onSaved({ id: chapter.id, values: v })
      } else {
        const res = await createChapter(toChapterPayload(v))
        onSaved({ id: res.data?.data?.id, values: v })
      }
      onClose()
    } catch (err) {
      console.error(chapter ? 'Error updating chapter:' : 'Error creating chapter:', err)
      setError(applyServerErrors(err, form.setError, ['subject_id', 'name'], { fallback: chapter ? 'Failed to update chapter.' : 'Failed to create chapter.' }))
      const nameErr = form.getFieldState('name').error?.message
      if (nameErr) form.setError('name', { type: 'server', message: friendlyDuplicate(nameErr, 'chapter') })
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={() => {
        setError(null)
        onClose()
      }}
      title={chapter ? 'Edit Chapter' : 'Add Chapter'}
      description={chapter ? undefined : 'Chapters belong to one subject. Add topics to it afterwards.'}
      form={form}
      onSubmit={submit}
      submitLabel={chapter ? 'Update' : 'Save'}
      submittingLabel={chapter ? 'Updating...' : 'Saving...'}
      error={error}
    >
      <FormField
        control={form.control}
        name="subject_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Subject</FormLabel>
            <FormControl>
              <NativeSelect {...field} disabled={subjectsLoading}>
                <option value="">{subjectsLoading ? 'Loading…' : 'Select subject'}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.subject}
                  </option>
                ))}
              </NativeSelect>
            </FormControl>
            {chapter && <FormDescription>Changing the subject only affects the chapter itself — topics already added stay assigned.</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Chapter name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Rational And Irrational Numbers" autoComplete="off" maxLength={255} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}
