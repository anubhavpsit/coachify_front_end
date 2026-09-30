import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, m } from 'motion/react'
import { CircleAlert, ExternalLink, X } from 'lucide-react'
import { toast } from 'sonner'
import { shake } from '@/animations'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import FileDropzone from '@/components/common/FileDropzone'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors } from '@/lib/forms'
import { saveNotice } from '../services/noticesService'
import {
  ATTACHMENT_ACCEPT,
  AUDIENCE_OPTIONS,
  BODY_MAX,
  NOTICE_FIELDS,
  NOTICE_FIELD_MAP,
  TITLE_MAX,
  noticeFormDefaults,
  noticeFormSchema,
  toNoticeFormData,
  type NoticeFormContext,
  type NoticeFormValues,
} from '../schemas/noticeForm'
import { AUDIENCE_LABELS, toLocalInputValue, type Notice, type NoticeAudience } from '../types'

function SwitchField({
  control,
  name,
  id,
  label,
}: {
  control: Control<NoticeFormValues>
  name: 'isPinned' | 'isImportant' | 'sendPush' | 'resendPush'
  id: string
  label: string
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <div className="tw:flex tw:items-center tw:gap-2">
          <Switch id={id} checked={field.value} onCheckedChange={field.onChange} />
          <Label htmlFor={id} className="tw:font-normal">
            {label}
          </Label>
        </div>
      )}
    />
  )
}

type Props = {
  show: boolean
  notice: Notice | null // null = create
  onHide: () => void
  onSaved: (notice: Notice) => void
}

/** Rendered only when the server says the user can manage notices (meta.can_manage). */
export default function NoticeFormDialog({ show, notice, onHide, onSaved }: Props) {
  const ctx: NoticeFormContext = useMemo(
    () => ({
      isEdit: notice !== null,
      isScheduled: notice === null || notice.status === 'scheduled',
      publishedAt: notice?.published_at ?? null,
      pushAlreadySent: !!notice?.push_dispatched_at,
    }),
    [notice],
  )
  const schema = useMemo(() => noticeFormSchema(ctx), [ctx])
  const form = useForm<NoticeFormValues>({ resolver: zodResolver(schema), defaultValues: noticeFormDefaults(notice), mode: 'onTouched' })
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // Fresh values every time the dialog opens (legacy reset on show/notice change).
  useEffect(() => {
    if (show) form.reset(noticeFormDefaults(notice))
  }, [show, notice, form])
  const [wasShown, setWasShown] = useState(show)
  if (show !== wasShown) {
    setWasShown(show)
    if (show) setFormError(null)
  }

  // Read during render so react-hook-form subscribes to these flags.
  const { isDirty, isSubmitting: submitting } = form.formState

  const requestClose = () => {
    if (submitting) return
    if (isDirty) setConfirmDiscard(true)
    else onHide()
  }

  const submit = async (values: NoticeFormValues) => {
    setFormError(null)
    try {
      const res = await saveNotice(toNoticeFormData(values, ctx), notice?.id)
      if (res?.success) {
        toast.success(ctx.isEdit ? 'Notice updated.' : values.publishAt && ctx.isScheduled ? 'Notice scheduled.' : 'Notice published.')
        onSaved(res.data as Notice)
      } else {
        setFormError(res?.message || 'Unable to save notice.')
      }
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, NOTICE_FIELDS, { fieldMap: NOTICE_FIELD_MAP, fallback: 'Unable to save notice.' }))
    }
  }

  const [title, body, publishAt, removeAttachment, file] = useWatch({
    control: form.control,
    name: ['title', 'body', 'publishAt', 'removeAttachment', 'file'],
  })

  return (
    <>
      <Dialog open={show} onOpenChange={(open) => !open && requestClose()}>
        <DialogContent className="tw:sm:max-w-2xl" onInteractOutside={(e) => isDirty && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{ctx.isEdit ? 'Edit Notice' : 'Add Notice'}</DialogTitle>
            <DialogDescription>Notices appear on the Notice Board for the audience you choose.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} noValidate className="tw:flex tw:flex-col tw:gap-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Holiday on Monday" maxLength={TITLE_MAX} autoComplete="off" {...field} />
                    </FormControl>
                    <div className="tw:flex tw:justify-between tw:gap-2">
                      <FormMessage />
                      <span className="tw:ml-auto tw:text-xs tw:tabular-nums tw:text-muted-foreground">
                        {title.length}/{TITLE_MAX}
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={6} placeholder="Write the full notice. Line breaks are kept." className="tw:max-h-72" {...field} />
                    </FormControl>
                    <div className="tw:flex tw:justify-between tw:gap-2">
                      <FormMessage />
                      {body.length > BODY_MAX * 0.8 && (
                        <span className="tw:ml-auto tw:text-xs tw:tabular-nums tw:text-muted-foreground">
                          {body.length.toLocaleString()}/{BODY_MAX.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targets"
                render={({ field }) => {
                  const allSelected = field.value.includes('all')
                  const toggle = (t: NoticeAudience) => {
                    if (t === 'all') field.onChange(allSelected ? [] : ['all'])
                    else field.onChange(field.value.includes(t) ? field.value.filter((x) => x !== t) : [...field.value, t])
                    field.onBlur()
                  }
                  return (
                    <FormItem>
                      <FormLabel required>Target audience</FormLabel>
                      <FormControl>
                        <div role="group" aria-label="Target audience" className="tw:flex tw:flex-wrap tw:gap-2">
                          {AUDIENCE_OPTIONS.map((t) => {
                            const id = `notice-target-${t}`
                            const disabled = t !== 'all' && allSelected
                            return (
                              <label
                                key={t}
                                htmlFor={id}
                                className="tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-full tw:border tw:border-solid tw:border-input tw:px-3 tw:py-1.5 tw:text-sm tw:transition-colors tw:has-[[data-state=checked]]:border-primary tw:has-[[data-state=checked]]:bg-primary-soft tw:has-[:disabled]:cursor-not-allowed tw:has-[:disabled]:opacity-50"
                              >
                                <Checkbox id={id} checked={field.value.includes(t)} disabled={disabled} onCheckedChange={() => toggle(t)} />
                                {AUDIENCE_LABELS[t]}
                              </label>
                            )
                          })}
                        </div>
                      </FormControl>
                      <FormDescription>"Admins" includes coaching admins and staff.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />

              <div className="tw:grid tw:gap-5 tw:md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="publishAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publish at</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" disabled={!ctx.isScheduled} {...field} />
                      </FormControl>
                      <FormDescription>{ctx.isScheduled ? 'Leave empty to publish now.' : 'Already published — cannot be rescheduled.'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Expires at</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" min={publishAt || toLocalInputValue(new Date().toISOString())} {...field} />
                      </FormControl>
                      <FormDescription>Required. Moves to the Expired tab after this time.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="file"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Attachment</FormLabel>
                    {ctx.isEdit && notice?.attachment && !removeAttachment && !file && (
                      <div className="tw:flex tw:items-center tw:gap-2 tw:text-sm">
                        <a href={notice.attachment.url} target="_blank" rel="noreferrer" className="tw:inline-flex tw:items-center tw:gap-1 tw:text-primary">
                          {notice.attachment.name}
                          <ExternalLink className="tw:size-3.5" aria-hidden="true" />
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="tw:text-destructive"
                          onClick={() => form.setValue('removeAttachment', true, { shouldDirty: true })}
                        >
                          <X aria-hidden="true" />
                          Remove
                        </Button>
                      </div>
                    )}
                    <FileDropzone
                      value={field.value}
                      onChange={(f) => {
                        field.onChange(f)
                        void form.trigger('file')
                      }}
                      accept={ATTACHMENT_ACCEPT}
                      hint="PDF or image, up to 5 MB."
                      invalid={!!fieldState.error}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="tw:flex tw:flex-wrap tw:gap-x-6 tw:gap-y-3">
                <SwitchField control={form.control} name="isPinned" id="notice-pin" label="Pin to top" />
                <SwitchField control={form.control} name="isImportant" id="notice-important" label="Mark as important" />
                {ctx.pushAlreadySent ? (
                  <SwitchField control={form.control} name="resendPush" id="notice-resend" label="Send push notification again" />
                ) : (
                  <SwitchField control={form.control} name="sendPush" id="notice-push" label="Send push notification" />
                )}
              </div>

              <AnimatePresence initial={false}>
                {formError && (
                  <m.div key={formError} variants={shake} initial="idle" animate="shake">
                    <Alert variant="destructive">
                      <CircleAlert aria-hidden="true" />
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  </m.div>
                )}
              </AnimatePresence>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={requestClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  {submitting ? 'Saving...' : ctx.isEdit ? 'Update' : publishAt && ctx.isScheduled ? 'Schedule' : 'Publish'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard your changes?"
        description="You have unsaved changes to this notice."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={onHide}
      />
    </>
  )
}
