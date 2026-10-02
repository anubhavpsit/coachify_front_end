import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageUp, X } from 'lucide-react'
import { toast } from 'sonner'
import FormDialog from '@/components/common/FormDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/apiClient'
import { applyServerErrors } from '@/lib/forms'
import { CONTENT_TYPES, factDefaults, factSchema, IMAGE_ACCEPT, imageProblem, toFactPayload, type FactValues } from '../schemas/factForm'
import { absoluteUrl, createFact, updateFact, uploadFactImage, type Fact } from '../services/factsService'

interface Props {
  open: boolean
  onClose: () => void
  fact: Fact | null
  classes: { id: number; name: string }[]
  onSaved: () => void
}

export default function FactFormDialog({ open, onClose, fact, classes, onSaved }: Props) {
  const form = useForm<FactValues>({ resolver: zodResolver(factSchema), defaultValues: factDefaults(), mode: 'onTouched' })
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [classesTouched, setClassesTouched] = useState(false)
  const [roles, imageUrl, content, published] = useWatch({ control: form.control, name: ['target_roles', 'image_url', 'content', 'is_published'] })

  useEffect(() => {
    if (open) form.reset(factDefaults(fact))
  }, [open, fact, form])

  const close = () => {
    setError(null)
    setClassesTouched(false)
    onClose()
  }

  const submit = async (v: FactValues) => {
    setError(null)
    try {
      const payload = toFactPayload(v, { editing: !!fact, classesTouched })
      if (fact) await updateFact(fact.id, payload)
      else await createFact(payload)
      toast.success(fact ? 'Fact updated.' : 'Fact created.')
      onSaved()
      close()
    } catch (err) {
      console.error('Error saving fact:', err)
      setError(applyServerErrors(err, form.setError, ['title', 'content', 'content_type', 'image_url', 'source_url', 'tags', 'target_roles', 'publish_at'], { fallback: fact ? 'Failed to update fact' : 'Failed to create fact' }))
    }
  }

  const upload = async (file: File) => {
    const problem = imageProblem(file)
    if (problem) return toast.error(problem)
    setUploading(true)
    try {
      form.setValue('image_url', await uploadFactImage(file), { shouldDirty: true, shouldValidate: true })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload image.'))
    } finally {
      setUploading(false)
    }
  }

  const toggleRole = (role: 'student' | 'teacher', on: boolean) => {
    const next = on ? [...roles, role] : roles.filter((r) => r !== role)
    form.setValue('target_roles', next, { shouldDirty: true })
    // Unticking Student clears the class selection (legacy).
    if (role === 'student' && !on) {
      form.setValue('class_ids', [])
      setClassesTouched(true)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={close}
      title={fact ? 'Edit Fact' : 'Create Fact'}
      form={form}
      onSubmit={submit}
      submitLabel={fact ? 'Update Fact' : 'Create Fact'}
      submittingLabel="Saving..."
      error={error}
      className="tw:sm:max-w-2xl"
    >
      <div className="tw:grid tw:gap-4 tw:sm:grid-cols-[1fr_12rem]">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Title</FormLabel>
              <FormControl>
                <Input maxLength={255} placeholder="e.g. The Taj Mahal changes colour through the day" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content type</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="content"
        render={({ field }) => (
          <FormItem>
            <div className="tw:flex tw:items-baseline tw:justify-between">
              <FormLabel>Content</FormLabel>
              <span className="tw:text-xs tw:text-muted-foreground">{content.length}/5000</span>
            </div>
            <FormControl>
              <Textarea rows={4} maxLength={5000} placeholder="The fact itself — keep it short and surprising." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
        <FormField
          control={form.control}
          name="image_url"
          render={() => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              {imageUrl ? (
                <div className="tw:relative tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-border">
                  <img src={absoluteUrl(imageUrl)} alt="Fact image preview" className="tw:block tw:max-h-40 tw:w-full tw:object-cover" />
                  <Button type="button" size="icon-sm" variant="secondary" className="tw:absolute tw:top-2 tw:right-2" aria-label="Remove image" onClick={() => form.setValue('image_url', '', { shouldDirty: true })}>
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <label className="tw:m-0 tw:flex tw:h-24 tw:cursor-pointer tw:flex-col tw:items-center tw:justify-center tw:gap-1 tw:px-3 tw:text-center tw:rounded-lg tw:border tw:border-dashed tw:border-input tw:text-sm tw:text-muted-foreground tw:hover:border-primary/60">
                  <ImageUp className="tw:size-5" aria-hidden="true" />
                  {uploading ? 'Uploading…' : 'Upload — JPG, PNG, WebP or GIF, up to 4 MB'}
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="tw:sr-only"
                    aria-label="Upload image"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void upload(f)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="tw:flex tw:flex-col tw:gap-4">
          <FormField
            control={form.control}
            name="source_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input type="url" inputMode="url" placeholder="https://…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="famous_places, capitals" {...field} />
                </FormControl>
                <FormDescription>Separate with commas.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <fieldset className="tw:m-0 tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-3">
        <legend className="tw:float-none tw:m-0 tw:w-auto tw:px-1 tw:text-sm tw:font-medium">Who sees it</legend>
        <div className="tw:flex tw:flex-wrap tw:gap-4">
          {(['student', 'teacher'] as const).map((r) => (
            <label key={r} className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:text-sm tw:capitalize">
              <Checkbox checked={roles.includes(r)} onCheckedChange={(v) => toggleRole(r, v === true)} />
              {r}s
            </label>
          ))}
        </div>
        {roles.includes('student') && (
          <FormField
            control={form.control}
            name="class_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target classes</FormLabel>
                {classes.length === 0 ? (
                  <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No classes found for your institute.</p>
                ) : (
                  <div className="tw:flex tw:flex-wrap tw:gap-2">
                    {classes.map((c) => {
                      const on = field.value.includes(c.id)
                      return (
                        <label key={c.id} className="tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-solid tw:border-input tw:px-3 tw:py-1 tw:text-sm tw:has-[[data-state=checked]]:border-primary tw:has-[[data-state=checked]]:bg-primary-soft">
                          <Checkbox
                            checked={on}
                            onCheckedChange={() => {
                              setClassesTouched(true)
                              field.onChange(on ? field.value.filter((x) => x !== c.id) : [...field.value, c.id])
                            }}
                          />
                          {c.name}
                        </label>
                      )
                    })}
                  </div>
                )}
                <FormDescription>
                  {fact && !classesTouched ? 'Leave as is to keep the classes already chosen for this fact.' : 'None selected = every class.'} Only applies to students.
                </FormDescription>
              </FormItem>
            )}
          />
        )}
      </fieldset>

      <div className="tw:grid tw:items-start tw:gap-4 tw:sm:grid-cols-2">
        <FormField
          control={form.control}
          name="is_published"
          render={({ field }) => (
            <FormItem className="tw:flex tw:items-center tw:gap-3 tw:pt-6">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="tw:m-0">{published ? 'Published' : 'Draft'}</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="publish_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Publish date / time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormDescription>Visible only after this time when published.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormDialog>
  )
}
