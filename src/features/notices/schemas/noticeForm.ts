import { z } from 'zod'
import { toLocalInputValue, type Notice, type NoticeAudience } from '../types'

export const TITLE_MAX = 150
export const BODY_MAX = 10000 // backend: body max:10000 (legacy UI didn't enforce it)
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
const ATTACHMENT_EXT = /\.(pdf|jpe?g|png|webp)$/i // backend: mimes:pdf,jpg,jpeg,png,webp
export const AUDIENCE_OPTIONS: NoticeAudience[] = ['all', 'teacher', 'admin', 'student']

export type NoticeFormContext = {
  isEdit: boolean
  /** Create, or editing a still-scheduled notice: publish time can be (re)set. */
  isScheduled: boolean
  /** Existing notice's published_at (edit) — the publish moment when not rescheduling. */
  publishedAt?: string | null
  pushAlreadySent: boolean
}

export function noticeFormSchema(ctx: NoticeFormContext, now: () => Date = () => new Date()) {
  return z
    .object({
      title: z.string().trim().min(1, 'Title is required.').max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters.`),
      body: z.string().trim().min(1, 'Description is required.').max(BODY_MAX, `Description must be at most ${BODY_MAX.toLocaleString()} characters.`),
      targets: z.array(z.enum(['all', 'admin', 'teacher', 'student'])).min(1, 'Choose at least one audience.'),
      isPinned: z.boolean(),
      isImportant: z.boolean(),
      publishAt: z.string(),
      expiresAt: z.string().min(1, 'Please set an expiry date — every notice must expire.'),
      sendPush: z.boolean(),
      resendPush: z.boolean(),
      file: z
        .instanceof(File)
        .nullable()
        .refine((f) => !f || f.size <= ATTACHMENT_MAX_BYTES, 'Attachment must be 5 MB or smaller.')
        .refine((f) => !f || ATTACHMENT_EXT.test(f.name), 'Attachment must be a PDF or an image (JPG, PNG, WEBP).'),
      removeAttachment: z.boolean(),
    })
    .superRefine((v, issue) => {
      if (!v.expiresAt) return
      // Every notice must expire, after it's published (API enforces the same).
      const publishMoment =
        v.publishAt && ctx.isScheduled ? new Date(v.publishAt) : ctx.isEdit && ctx.publishedAt ? new Date(ctx.publishedAt) : now()
      if (new Date(v.expiresAt) <= publishMoment) {
        issue.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry must be after the publish time.' })
      }
    })
}

export type NoticeFormValues = z.infer<ReturnType<typeof noticeFormSchema>>

export function noticeFormDefaults(notice: Notice | null): NoticeFormValues {
  return {
    title: notice?.title ?? '',
    body: notice?.body ?? '',
    targets: notice?.target_roles?.length ? notice.target_roles : ['all'],
    isPinned: notice?.is_pinned ?? false,
    isImportant: notice?.is_important ?? false,
    publishAt: notice?.status === 'scheduled' ? toLocalInputValue(notice.published_at) : '',
    expiresAt: toLocalInputValue(notice?.expires_at),
    sendPush: notice?.send_push ?? false,
    resendPush: false,
    file: null,
    removeAttachment: false,
  }
}

/** Exactly the multipart body the legacy NoticeFormModal sent (same keys, same order). */
export function toNoticeFormData(v: NoticeFormValues, ctx: NoticeFormContext): FormData {
  const form = new FormData()
  form.append('title', v.title.trim())
  form.append('body', v.body.trim())
  v.targets.forEach((t) => form.append('target_roles[]', t))
  form.append('is_pinned', v.isPinned ? '1' : '0')
  form.append('is_important', v.isImportant ? '1' : '0')
  if (ctx.isScheduled && v.publishAt) form.append('published_at', new Date(v.publishAt).toISOString())
  if (v.expiresAt) form.append('expires_at', new Date(v.expiresAt).toISOString())
  if (ctx.pushAlreadySent) {
    if (v.resendPush) form.append('resend_push', '1')
  } else {
    form.append('send_push', v.sendPush ? '1' : '0')
  }
  if (v.file) form.append('attachment', v.file)
  if (ctx.isEdit && v.removeAttachment && !v.file) form.append('remove_attachment', '1')
  // multipart PUT isn't parsed by PHP — spoof the method instead
  if (ctx.isEdit) form.append('_method', 'PUT')
  return form
}

/** API field → form field, for mapping Laravel 422 errors. */
export const NOTICE_FIELD_MAP: Record<string, string> = {
  title: 'title',
  body: 'body',
  target_roles: 'targets',
  'target_roles.0': 'targets',
  published_at: 'publishAt',
  expires_at: 'expiresAt',
  attachment: 'file',
}
export const NOTICE_FIELDS = ['title', 'body', 'targets', 'publishAt', 'expiresAt', 'file'] as const
