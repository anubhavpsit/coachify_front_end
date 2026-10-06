import { useEffect, useMemo, useState } from 'react'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import FormDialog from '@/components/common/FormDialog'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import PersonFields from '@/features/people/components/PersonFields'
import PhoneField from '@/features/people/components/PhoneField'
import { todayInputValue, type PersonBase } from '@/features/people/schemas/person'
import { applyServerErrors } from '@/lib/forms'
import { formatDate } from '@/utils/date'
import { enrichStudent } from '../lib/studentRows'
import { STUDENT_FIELDS, studentDefaults, studentSchema, toStudentPayload, type StudentValues } from '../schemas/studentForm'
import { createStudent, updateStudent, type ClassOption, type Student, type SubjectOption } from '../services/studentsService'

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

interface Props {
  open: boolean
  student: Student | null // null = create
  classes: ClassOption[]
  subjects: SubjectOption[]
  onClose: () => void
  /** Saved row (already enriched), for a local list update. */
  onSaved: (student: Student, mode: 'create' | 'edit') => void
}

export default function StudentFormDialog({ open, student, classes, subjects, onClose, onSaved }: Props) {
  const mode = student ? 'edit' : 'create'
  const schema = useMemo(() => studentSchema(mode), [mode])
  const form = useForm<StudentValues>({ resolver: zodResolver(schema), defaultValues: studentDefaults(student), mode: 'onTouched' })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) form.reset(studentDefaults(student))
  }, [open, student, form])
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setFormError(null)
  }

  const submit = async (values: StudentValues) => {
    setFormError(null)
    try {
      const payload = toStudentPayload(values)
      const saved = student ? await updateStudent(student.id, payload) : await createStudent(payload)
      if (!saved) return
      onSaved(
        enrichStudent(saved, {
          classId: values.class === '' ? null : Number(values.class),
          grade: values.grade === '' ? null : Number(values.grade),
          subjects: values.subjects,
          phone: values.phone,
          createdAt: student?.created_at ?? saved.created_at ?? new Date().toISOString(),
        }),
        mode,
      )
      toast.success(student ? `${values.name} updated.` : `${values.name} added.`)
      onClose()
    } catch (error) {
      console.error(student ? 'Error updating student:' : 'Error adding student:', error)
      setFormError(applyServerErrors(error, form.setError, STUDENT_FIELDS, { fallback: student ? 'Failed to update student.' : 'Failed to save student.' }))
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={student ? 'Edit Student' : 'Add New Student'}
      form={form}
      onSubmit={submit}
      submitLabel={student ? 'Update' : 'Save'}
      submittingLabel={student ? 'Updating...' : 'Saving...'}
      error={formError}
      className="sm:max-w-2xl"
    >
      <PersonFields control={form.control as unknown as Control<PersonBase>} mode={mode} afterEmail={<PhoneField control={form.control} name="phone" />} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="class"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class</FormLabel>
              <FormControl>
                <NativeSelect value={field.value} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} onBlur={field.onBlur} name={field.name}>
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
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
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade</FormLabel>
              <FormControl>
                <NativeSelect value={field.value} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} onBlur={field.onBlur} name={field.name}>
                  <option value="">Select Grade</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {student?.fees_recorded ? (
        // Locked: once a fee is recorded the paid periods decide the next due date.
        <div className="space-y-1">
          <p className="m-0 text-sm font-medium">Joining Date</p>
          <p className="m-0 text-sm">{formatDate(student.joined_date || student.created_at)}</p>
          <p className="m-0 text-xs text-muted-foreground">
            This can't be changed because fees have already been recorded for this student — the next due date now follows the paid fee periods.
          </p>
        </div>
      ) : (
        <FormField
          control={form.control}
          name="joining_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Joining Date</FormLabel>
              <FormControl>
                <Input type="date" max={todayInputValue()} {...field} />
              </FormControl>
              <p className="m-0 text-xs text-muted-foreground">
                The day the student actually started. Trial days and the first fee due date are counted from it.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="subjects"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Subjects</FormLabel>
            {subjects.length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">No subjects available.</p>
            ) : (
              <div role="group" aria-label="Subjects" className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const id = `student-subject-${s.id}`
                  const checked = field.value.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      htmlFor={id}
                      className="m-0 flex cursor-pointer items-center gap-2 rounded-full border border-solid border-input px-3 py-1.5 text-sm transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft"
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={() => field.onChange(checked ? field.value.filter((x) => x !== s.id) : [...field.value, s.id])}
                      />
                      {s.subject}
                    </label>
                  )
                })}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}
