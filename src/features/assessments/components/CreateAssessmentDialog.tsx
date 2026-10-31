import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormDialog from '@/components/common/FormDialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors } from '@/lib/forms'
import { createDefaults, createSchema, DESCRIPTION_MAX, editDefaults, toCreatePayload, type CreateValues } from '../schemas/assessmentForms'
import StudentPicker from './StudentPicker'
import { createAssessment, updateAssessment, type Assessment, type StudentOption } from '../services/assessmentsService'

interface Props {
  open: boolean
  onClose: () => void
  subjects: { id: number; subject: string }[]
  classes: { id: number; name: string }[]
  loading: boolean
  students: StudentOption[]
  studentsLoaded: boolean
  /** Set → edit this test instead of creating one. */
  assessment?: Assessment | null
  onCreated: (a: Assessment) => void
  onUpdated?: (a: Assessment) => void
}

const QUICK_MARKS = [10, 20, 25, 50, 100]

export default function CreateAssessmentDialog({ open, onClose, subjects, classes, loading, students, studentsLoaded, assessment, onCreated, onUpdated }: Props) {
  const form = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: createDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)
  const [description, marks, classValue] = useWatch({ control: form.control, name: ['description', 'total_marks', 'class_id'] })
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Same rules as the API (AssessmentController::assertEditAllowed).
  const hasResults = (assessment?.progress?.result_out ?? 0) > 0
  const hasStudents = (assessment?.progress?.total ?? 0) > 0
  const subjectLocked = hasResults || (assessment?.paper_questions_count ?? 0) > 0

  useEffect(() => {
    if (open) form.reset(assessment ? editDefaults(assessment) : createDefaults())
  }, [open, assessment, form])

  // Only the chosen class; a student ticked before the class changed isn't sent.
  const eligible = classValue ? students.filter((s) => s.classId === Number(classValue)) : students
  const studentIds = [...selected].filter((id) => eligible.some((s) => s.id === id))

  const submit = async (v: CreateValues) => {
    setError(null)
    if (!assessment && studentIds.length > 0 && !v.scheduled_date) {
      form.setError('scheduled_date', { message: 'Pick the test date to assign students.' })
      return
    }
    const failed = assessment ? 'Failed to save changes' : 'Failed to create assessment'
    try {
      const saved = assessment ? await updateAssessment(assessment.id, toCreatePayload(v)) : await createAssessment(toCreatePayload(v, studentIds))
      if (!saved) {
        setError(failed)
        return
      }
      if (assessment) onUpdated?.(saved)
      else onCreated(saved)
      setSelected(new Set())
      onClose()
    } catch (err) {
      console.error('Error saving assessment:', err)
      setError(applyServerErrors(err, form.setError, ['title', 'subject_id', 'class_id', 'total_marks', 'scheduled_date', 'description'], { fallback: failed }))
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={() => {
        setError(null)
        setSelected(new Set())
        onClose()
      }}
      title={assessment ? 'Edit Assessment' : 'Create Assessment'}
      description={assessment ? assessment.title : 'Add the test details and its students. You can add more students later.'}
      form={form}
      onSubmit={submit}
      submitLabel={assessment ? 'Save changes' : 'Create'}
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
                <NativeSelect {...field} disabled={loading || subjectLocked}>
                  <option value="">{loading ? 'Loading…' : 'Select subject'}</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.subject}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              {subjectLocked && <FormDescription>Locked: this test has results or a question paper.</FormDescription>}
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
                <Input type="number" inputMode="numeric" min={1} max={1000} step={1} placeholder="e.g. 50" disabled={hasResults} {...field} />
              </FormControl>
              {hasResults && <FormDescription>Locked: results are already saved.</FormDescription>}
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common totals" hidden={hasResults}>
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
              <FormLabel>Test date</FormLabel>
              <FormControl>
                <Input type="date" disabled={hasStudents} {...field} />
              </FormControl>
              <FormDescription>{hasStudents ? 'Students are assigned. Change their date from Results → Reschedule.' : 'Needed when you pick students now.'}</FormDescription>
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
      {!assessment && <StudentPicker students={eligible} selected={selected} onChange={setSelected} loading={!studentsLoaded} emptyText="No students available for this class yet." />}
    </FormDialog>
  )
}
