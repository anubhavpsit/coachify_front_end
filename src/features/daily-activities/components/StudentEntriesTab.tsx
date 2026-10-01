import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import ErrorState from '@/components/common/ErrorState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { getErrorMessage } from '@/lib/apiClient'
import { blankEntry, dateProblem, duplicateEntry, entriesSchema, entryFromRecord, todayISO, toActivityPayload, type EntriesValues } from '../schemas/activityForm'
import {
  deleteActivity,
  deleteAttachment,
  fetchActivitiesFor,
  fetchStudentSubjects,
  saveActivities,
  uploadAttachment,
  type ActivityAttachment,
  type ActivityRecord,
  type Option,
} from '../services/dailyActivitiesService'
import EntryCard, { type SubjectsState } from './EntryCard'

interface Props {
  date: string
  /** Bumped after a whole-class save so this day's list picks up the new entries. */
  refreshKey: number
  students: Option[]
  studentsLoading: boolean
  canDeleteAttachments: boolean
  onPreview: (a: ActivityAttachment) => void
  onDirtyChange: (dirty: boolean) => void
}

type Meta = { review: Pick<ActivityRecord, 'is_admin_approved' | 'admin_feedback'>; attachments: ActivityAttachment[] }

/** "Individual students": one card per student, all saved together for the chosen day. */
export default function StudentEntriesTab({ date, refreshKey, students, studentsLoading, canDeleteAttachments, onPreview, onDirtyChange }: Props) {
  const dateOk = !dateProblem(date)
  const saved = useAsync(() => fetchActivitiesFor(date, todayISO()), [date, refreshKey], { enabled: dateOk })
  const form = useForm<EntriesValues>({ resolver: zodResolver(entriesSchema), defaultValues: { entries: [blankEntry()] }, mode: 'onTouched' })
  const { fields, append, remove, insert } = useFieldArray({ control: form.control, name: 'entries' })
  const [meta, setMeta] = useState<Record<number, Meta>>({})
  const [subjects, setSubjects] = useState<Record<number, SubjectsState>>({})
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [deletingAttachment, setDeletingAttachment] = useState<number | null>(null)
  const [pendingRemove, setPendingRemove] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const requested = useRef(new Set<number>())

  const { isDirty, isSubmitting } = form.formState
  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange])

  const loadSubjects = (studentId: number) => {
    if (requested.current.has(studentId)) return
    requested.current.add(studentId)
    setSubjects((s) => ({ ...s, [studentId]: 'loading' }))
    fetchStudentSubjects(studentId)
      .then((list) => setSubjects((s) => ({ ...s, [studentId]: list })))
      .catch((e) => {
        console.error('Failed to fetch subjects:', e)
        requested.current.delete(studentId)
        setSubjects((s) => ({ ...s, [studentId]: 'error' }))
      })
  }

  // Saved entries for the day become the form (or one blank card).
  useEffect(() => {
    const records = saved.data
    if (!records) return
    form.reset({ entries: records.length ? records.map(entryFromRecord) : [blankEntry()] })
    setFormError(null)
    setMeta(Object.fromEntries(records.map((r) => [r.id, { review: { is_admin_approved: r.is_admin_approved, admin_feedback: r.admin_feedback }, attachments: r.attachments || [] }])))
    records.forEach((r) => loadSubjects(r.student_id))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when a new day's data arrives
  }, [saved.data])

  const entryPath = (i: number) => `entries.${i}` as const

  const changeStudent = (i: number, studentId: number | '') => {
    form.setValue(`${entryPath(i)}.student_id`, studentId, { shouldDirty: true, shouldValidate: true })
    if (studentId === '') return
    loadSubjects(studentId)
    const list = subjects[studentId]
    const current = form.getValues(`${entryPath(i)}.subject_id`)
    if (Array.isArray(list)) {
      if (list.length === 1) changeSubject(i, list[0].id)
      else if (current !== '' && !list.some((s) => s.id === current)) changeSubject(i, '')
    } else {
      changeSubject(i, '')
    }
  }

  // Auto-pick when a newly loaded student has exactly one subject.
  useEffect(() => {
    form.getValues('entries').forEach((e, i) => {
      if (e.student_id === '' || e.subject_id !== '') return
      const list = subjects[e.student_id]
      if (Array.isArray(list) && list.length === 1) form.setValue(`${entryPath(i)}.subject_id`, list[0].id, { shouldDirty: true })
    })
  }, [subjects, form])

  const changeSubject = (i: number, subjectId: number | '') => {
    const prev = form.getValues(`${entryPath(i)}.subject_id`)
    form.setValue(`${entryPath(i)}.subject_id`, subjectId, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
    // Chapters and topics belong to a subject (legacy kept the old ones).
    if (prev !== subjectId) {
      form.setValue(`${entryPath(i)}.chapter`, null, { shouldDirty: true })
      form.setValue(`${entryPath(i)}.topic`, null, { shouldDirty: true })
    }
  }

  const submit = async (values: EntriesValues) => {
    setFormError(null)
    try {
      await saveActivities(values.entries.map((e) => toActivityPayload(e, date)))
      toast.success(values.entries.length === 1 ? 'Activity saved.' : `${values.entries.length} activities saved.`)
      saved.reload()
    } catch (err) {
      console.error('Error saving activities:', err)
      setFormError(getErrorMessage(err, 'Failed to save activities.'))
    }
  }

  const onInvalid = (errors: FieldErrors<EntriesValues>) => {
    const n = Array.isArray(errors.entries) ? errors.entries.filter(Boolean).length : 0
    setFormError(n > 0 ? `Please fix ${n === 1 ? 'the highlighted entry' : `${n} highlighted entries`} before saving.` : 'Please fix the highlighted fields.')
  }

  const confirmRemove = async () => {
    const i = pendingRemove!
    const id = form.getValues(`${entryPath(i)}.id`)
    if (id) {
      try {
        await deleteActivity(id)
        toast.success('Activity deleted.')
      } catch (err) {
        console.error('Error deleting activity:', err)
        toast.error('Failed to delete activity.')
        throw err
      }
    }
    remove(i)
    if (form.getValues('entries').length === 0) append(blankEntry())
  }

  const askRemove = (i: number) => {
    const e = form.getValues(entryPath(i))
    const empty = !e.id && e.student_id === '' && !e.notes && !e.homework && !e.topic
    if (empty) {
      remove(i)
      if (form.getValues('entries').length === 0) append(blankEntry())
    } else setPendingRemove(i)
  }

  /** Legacy: files need a saved activity, so an unsaved entry is validated and saved on its own first. */
  const ensureSaved = async (i: number): Promise<number | null> => {
    const existing = form.getValues(`${entryPath(i)}.id`)
    if (existing) return existing
    const ok = await form.trigger(entryPath(i))
    if (!ok) {
      toast.error('Complete this entry before attaching files.')
      return null
    }
    try {
      const [rec] = await saveActivities([toActivityPayload(form.getValues(entryPath(i)), date)])
      if (!rec?.id) throw new Error('No id returned')
      form.setValue(`${entryPath(i)}.id`, rec.id)
      form.resetField(entryPath(i), { defaultValue: form.getValues(entryPath(i)) })
      setMeta((m) => ({ ...m, [rec.id]: { review: { is_admin_approved: rec.is_admin_approved, admin_feedback: rec.admin_feedback }, attachments: rec.attachments || [] } }))
      return rec.id
    } catch (err) {
      console.error('Error saving activity before upload:', err)
      toast.error(getErrorMessage(err, 'Failed to save the activity before uploading attachments. Please try again.'))
      return null
    }
  }

  const upload = async (i: number, files: File[]) => {
    setUploadingIndex(i)
    try {
      const id = await ensureSaved(i)
      if (!id) return
      for (const file of files) {
        try {
          const a = await uploadAttachment(id, file)
          if (a) setMeta((m) => ({ ...m, [id]: { ...m[id], attachments: [a, ...(m[id]?.attachments ?? [])] } }))
        } catch (err) {
          console.error('Error uploading attachment:', err)
          toast.error(getErrorMessage(err, `Failed to upload ${file.name}.`))
        }
      }
    } finally {
      setUploadingIndex(null)
    }
  }

  const removeAttachment = async (activityId: number, a: ActivityAttachment) => {
    setDeletingAttachment(a.id)
    try {
      await deleteAttachment(activityId, a.id)
      setMeta((m) => ({ ...m, [activityId]: { ...m[activityId], attachments: m[activityId].attachments.filter((x) => x.id !== a.id) } }))
    } catch (err) {
      console.error('Error deleting attachment:', err)
      toast.error('Failed to delete attachment.')
    } finally {
      setDeletingAttachment(null)
    }
  }

  if (!dateOk) return null
  if (saved.error) return <ErrorState title="Couldn't load this day's activities." onRetry={saved.reload} />
  if (saved.loading && !saved.data)
    return (
      <div className="tw:flex tw:flex-col tw:gap-4" role="status" aria-label="Loading activities">
        <Skeleton className="tw:h-72 tw:rounded-xl" />
      </div>
    )

  const busy = isSubmitting || saved.loading
  const count = fields.length

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit, onInvalid)} noValidate className="tw:flex tw:flex-col tw:gap-4">
        {fields.map((f, i) => {
          const id = form.getValues(`${entryPath(i)}.id`)
          const studentId = form.getValues(`${entryPath(i)}.student_id`)
          const m = id ? meta[id] : undefined
          return (
            <EntryCard
              key={f.id}
              form={form}
              index={i}
              count={count}
              students={students}
              subjects={studentId === '' ? undefined : subjects[studentId]}
              review={m?.review ?? null}
              attachments={m?.attachments ?? []}
              canDeleteAttachments={canDeleteAttachments}
              uploading={uploadingIndex === i}
              deletingAttachmentId={deletingAttachment}
              disabled={busy || studentsLoading}
              onStudentChange={(v) => changeStudent(i, v)}
              onSubjectChange={(v) => changeSubject(i, v)}
              onDuplicate={() => insert(i + 1, duplicateEntry(form.getValues(entryPath(i))))}
              onRemove={() => askRemove(i)}
              onUpload={(files) => void upload(i, files)}
              onRejectedFiles={(problems) => problems.forEach((p) => toast.error(p))}
              onPreview={onPreview}
              onDeleteAttachment={(a) => id && void removeAttachment(id, a)}
            />
          )
        })}

        {formError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="tw:sticky tw:bottom-0 tw:z-10 tw:-mx-1 tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card/95 tw:px-4 tw:py-3 tw:shadow-lg tw:backdrop-blur">
          <Button type="button" variant="outline" onClick={() => append(blankEntry())} disabled={busy}>
            <Plus aria-hidden="true" /> Add student
          </Button>
          <span className="tw:hidden tw:text-sm tw:text-muted-foreground tw:sm:inline">
            {count} {count === 1 ? 'entry' : 'entries'}
            {isDirty ? ' · unsaved changes' : ''}
          </span>
          <Button type="submit" className="tw:ml-auto" loading={isSubmitting} disabled={busy}>
            <Save aria-hidden="true" /> {isSubmitting ? 'Saving…' : count === 1 ? 'Save activity' : `Save ${count} activities`}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(o) => !o && setPendingRemove(null)}
        title="Remove this entry?"
        description={
          pendingRemove !== null && form.getValues(`${entryPath(pendingRemove)}.id`)
            ? 'This activity is already saved. Removing it deletes it for the student and from the admin review queue.'
            : 'This entry has not been saved yet.'
        }
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
      />
    </Form>
  )
}
