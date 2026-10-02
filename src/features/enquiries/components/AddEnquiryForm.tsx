import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import SegmentedControl from '@/components/common/SegmentedControl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors } from '@/lib/forms'
import { ENQUIRY_FIELDS, enquiryDefaults, enquirySchema, toEnquiryPayload, type EnquiryValues } from '../schemas/enquiry'
import { createEnquiry, type Enquiry, type EnquiryType } from '../services/enquiriesService'

type TextName = Exclude<keyof EnquiryValues, 'enquiry_type' | 'description'>
const TEXT_FIELDS: Array<{ name: TextName; label: string; required?: boolean; type?: string; placeholder?: string; max: number }> = [
  { name: 'name', label: 'Name', required: true, max: 255 },
  { name: 'contact_number', label: 'Contact Number', required: true, type: 'tel', max: 50 },
  { name: 'email', label: 'Email', type: 'email', max: 255 },
  { name: 'school_name', label: 'School Name', max: 255 },
  { name: 'class_grade', label: 'Class / Grade', max: 100 },
  { name: 'subjects_interested', label: 'Subjects Interested', placeholder: 'e.g. Math, Science', max: 500 },
]

export default function AddEnquiryForm({ onCreated }: { onCreated: (e: Enquiry) => void }) {
  const form = useForm<EnquiryValues>({ resolver: zodResolver(enquirySchema), defaultValues: enquiryDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)
  const submitting = form.formState.isSubmitting

  const submit = async (values: EnquiryValues) => {
    setError(null)
    try {
      const created = await createEnquiry(toEnquiryPayload(values))
      if (!created) {
        setError('Failed to save enquiry.')
        return
      }
      onCreated(created)
      form.reset(enquiryDefaults())
      toast.success(`Enquiry from ${created.name} saved.`)
    } catch (err) {
      console.error('Error saving enquiry:', err)
      setError(
        err instanceof Error && err.message === 'You are not authenticated.'
          ? err.message
          : applyServerErrors(err, form.setError, ENQUIRY_FIELDS, { fallback: 'Failed to save enquiry.' }),
      )
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FormField
          control={form.control}
          name="enquiry_type"
          render={({ field }) => (
            <FormItem className="sm:col-span-2 lg:col-span-3">
              <FormLabel>Enquiry Type</FormLabel>
              <SegmentedControl<EnquiryType>
                label="Enquiry type"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'student', label: 'Student' },
                  { value: 'teacher', label: 'Teacher' },
                ]}
                className="justify-self-start"
              />
            </FormItem>
          )}
        />
        {TEXT_FIELDS.map((f) => (
          <FormField
            key={f.name}
            control={form.control}
            name={f.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel required={f.required}>{f.label}</FormLabel>
                <FormControl>
                  <Input type={f.type ?? 'text'} maxLength={f.max} placeholder={f.placeholder} disabled={submitting} autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="sm:col-span-2 lg:col-span-3">
              <FormLabel>Description / Remarks</FormLabel>
              <FormControl>
                <Textarea rows={2} disabled={submitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <Alert variant="destructive" className="sm:col-span-2 lg:col-span-3">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="sm:col-span-2 lg:col-span-3">
          <Button type="submit" loading={submitting}>
            {submitting ? 'Saving...' : 'Save Enquiry'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
