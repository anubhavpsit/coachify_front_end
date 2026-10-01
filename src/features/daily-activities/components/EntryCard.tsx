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
    <Card className={cn('tw:gap-4 tw:transition-shadow', hasErrors && 'tw:border-destructive/50 tw:ring-2 tw:ring-destructive/15')}>
      <CardHeader className="tw:flex tw:flex-row tw:flex-wrap tw:items-center tw:gap-2">
        <span className="tw:flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary-soft tw:text-sm tw:font-bold tw:text-primary">{index + 1}</span>
        <CardTitle className="tw:min-w-0 tw:flex-1 tw:truncate">{student ? student.name : 'New entry'}</CardTitle>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5">
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
      <CardContent className="tw:flex tw:flex-col tw:gap-4">
        {id && p.review && <AdminFeedback review={p.review} />}

        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
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
                  <p className="tw:m-0 tw:flex tw:h-10 tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
                    <GraduationCap className="tw:size-4" aria-hidden="true" /> Choose a student to see their subjects.
                  </p>
                ) : p.subjects === 'loading' || p.subjects === undefined ? (
                  <div className="tw:flex tw:h-10 tw:items-center tw:gap-2" role="status" aria-label="Loading subjects">
                    <Skeleton className="tw:h-8 tw:w-24 tw:rounded-full" />
                    <Skeleton className="tw:h-8 tw:w-20 tw:rounded-full" />
                  </div>
                ) : p.subjects === 'error' ? (
                  <p className="tw:m-0 tw:flex tw:h-10 tw:items-center tw:text-sm tw:text-destructive">Couldn&apos;t load this student&apos;s subjects. Pick the student again.</p>
                ) : subjectList.length === 0 ? (
                  <p className="tw:m-0 tw:flex tw:h-10 tw:items-center tw:text-sm tw:text-muted-foreground">This student has no subjects assigned.</p>
                ) : (
                  <FormControl>
                    <div role="radiogroup" aria-label="Subject" className="tw:flex tw:min-h-10 tw:flex-wrap tw:items-center tw:gap-2">
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
                              'tw:m-0 tw:cursor-pointer tw:rounded-full tw:border tw:border-solid tw:px-3 tw:py-1.5 tw:text-sm tw:font-medium tw:transition-colors tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
                              on ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground' : 'tw:border-input tw:bg-transparent tw:text-foreground tw:hover:bg-muted',
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

        <div className="tw:flex tw:flex-col tw:gap-2">
          <span className="tw:text-sm tw:font-medium tw:text-foreground">Attachments</span>
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
