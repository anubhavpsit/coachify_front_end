import { useWatch, type UseFormReturn } from 'react-hook-form'
import { Copy, GraduationCap, Trash2 } from 'lucide-react'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { EntriesValues } from '../schemas/activityForm'
import type { ActivityAttachment, ActivityRecord, Option, SubjectOption } from '../services/dailyActivitiesService'
import { AttachmentChips, FilePicker } from './Attachments'
import LessonFields from './LessonFields'
import { AdminFeedback, ReviewBadge } from './ReviewStatus'

export type SubjectsState = SubjectOption[] | 'loading' | 'error' | undefined

interface Props {
  form: UseFormReturn<EntriesValues>
  index: number
  count: number
  students: Option[]
  subjects: SubjectsState
  review: Pick<ActivityRecord, 'is_admin_approved' | 'admin_feedback'> | null
  attachments: ActivityAttachment[]
  canDeleteAttachments: boolean
  uploading: boolean
  deletingAttachmentId: number | null
  disabled: boolean
  onStudentChange: (studentId: number | '') => void
  onSubjectChange: (subjectId: number | '') => void
  onDuplicate: () => void
  onRemove: () => void
  onUpload: (files: File[]) => void
  onRejectedFiles: (problems: string[]) => void
  onPreview: (a: ActivityAttachment) => void
  onDeleteAttachment: (a: ActivityAttachment) => void
}

/** One student's lesson for the day. */
export default function EntryCard(p: Props) {
  const { form, index } = p
  const [studentId, subjectId, id] = useWatch({ control: form.control, name: [`entries.${index}.student_id`, `entries.${index}.subject_id`, `entries.${index}.id`] })
  const dirty = !!form.formState.dirtyFields.entries?.[index]
  const hasErrors = !!form.formState.errors.entries?.[index]
  const student = p.students.find((s) => s.id === studentId)
  const subjectList = Array.isArray(p.subjects) ? p.subjects : []
  const prefix = `entries.${index}` as const

  return (
    <Card className={cn('gap-4 transition-shadow', hasErrors && 'border-destructive/50 ring-2 ring-destructive/15')}>
      <CardHeader className="flex flex-row flex-wrap items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">{index + 1}</span>
        <CardTitle className="min-w-0 flex-1 truncate">{student ? student.name : 'New entry'}</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          {id && p.review && <ReviewBadge review={p.review} />}
          {!id ? <Badge variant="secondary">Not saved</Badge> : dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
          <IconAction label={`Copy entry ${index + 1} for another student`} onClick={p.onDuplicate}>
            <Copy aria-hidden="true" />
          </IconAction>
          <IconAction label={`Remove entry ${index + 1}`} onClick={p.onRemove} destructive>
            <Trash2 aria-hidden="true" />
          </IconAction>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {id && p.review && <AdminFeedback review={p.review} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={`${prefix}.student_id`}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Student</FormLabel>
                <FormControl>
                  <NativeSelect
                    name={field.name}
                    value={field.value}
                    onBlur={field.onBlur}
                    disabled={p.disabled || p.students.length === 0}
                    onChange={(e) => p.onStudentChange(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">{p.students.length === 0 ? 'No students assigned to you' : 'Select student'}</option>
                    {p.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
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
            name={`${prefix}.subject_id`}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Subject</FormLabel>
                {studentId === '' ? (
                  <p className="m-0 flex h-10 items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="size-4" aria-hidden="true" /> Choose a student to see their subjects.
                  </p>
                ) : p.subjects === 'loading' || p.subjects === undefined ? (
                  <div className="flex h-10 items-center gap-2" role="status" aria-label="Loading subjects">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                ) : p.subjects === 'error' ? (
                  <p className="m-0 flex h-10 items-center text-sm text-destructive">Couldn&apos;t load this student&apos;s subjects. Pick the student again.</p>
                ) : subjectList.length === 0 ? (
                  <p className="m-0 flex h-10 items-center text-sm text-muted-foreground">This student has no subjects assigned.</p>
                ) : (
                  <FormControl>
                    <div role="radiogroup" aria-label="Subject" className="flex min-h-10 flex-wrap items-center gap-2">
                      {subjectList.map((s) => {
                        const on = field.value === s.id
                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={p.disabled}
                            onClick={() => p.onSubjectChange(on ? '' : s.id)}
                            className={cn(
                              'm-0 cursor-pointer rounded-full border border-solid px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                              on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-transparent text-foreground hover:bg-muted',
                            )}
                          >
                            {s.subject}
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <LessonFields
          control={form.control}
          setValue={form.setValue}
          names={{ chapter: `${prefix}.chapter`, topic: `${prefix}.topic`, notes: `${prefix}.notes`, homework: `${prefix}.homework` }}
          subjectId={subjectId === '' ? null : subjectId}
          disabled={p.disabled}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Attachments</span>
          <AttachmentChips attachments={p.attachments} onPreview={p.onPreview} onDelete={p.onDeleteAttachment} canDelete={p.canDeleteAttachments} deletingId={p.deletingAttachmentId} />
          <FilePicker
            onFiles={p.onUpload}
            onRejected={p.onRejectedFiles}
            busy={p.uploading}
            disabled={p.disabled || p.uploading || studentId === '' || subjectId === ''}
            hint={
              studentId === '' || subjectId === ''
                ? 'Choose the student and subject first.'
                : id
                  ? 'JPG, PNG, WebP or PDF · up to 10 MB each'
                  : 'This entry is saved first, then the files upload · JPG, PNG, WebP or PDF · up to 10 MB'
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
