import { describe, expect, it } from 'vitest'
import { noticeFormDefaults, noticeFormSchema, toNoticeFormData, type NoticeFormContext } from './noticeForm'

const createCtx: NoticeFormContext = { isEdit: false, isScheduled: true, pushAlreadySent: false }
const now = () => new Date('2026-09-30T10:00:00')
const valid = { ...noticeFormDefaults(null), title: ' Holiday ', body: ' Monday off ', expiresAt: '2026-10-05T10:00' }

const entries = (f: FormData) => Array.from(f.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : (v as File).name])

describe('notice form schema', () => {
  it('accepts a valid notice', () => {
    expect(noticeFormSchema(createCtx, now).safeParse(valid).success).toBe(true)
  })
  it('keeps the legacy rules', () => {
    const r = noticeFormSchema(createCtx, now).safeParse({ ...valid, title: '  ', targets: [], expiresAt: '' })
    const msgs = r.error!.issues.map((i) => i.message)
    expect(msgs).toContain('Title is required.')
    expect(msgs).toContain('Choose at least one audience.')
    expect(msgs).toContain('Please set an expiry date — every notice must expire.')
  })
  it('expiry must be after publish (scheduled publish time wins)', () => {
    const s = noticeFormSchema(createCtx, now)
    expect(s.safeParse({ ...valid, expiresAt: '2026-09-30T09:00' }).error?.issues[0].message).toBe('Expiry must be after the publish time.')
    expect(s.safeParse({ ...valid, publishAt: '2026-10-06T10:00' }).error?.issues[0].message).toBe('Expiry must be after the publish time.')
  })
  it('edit of a published notice compares against its published_at', () => {
    const ctx = { isEdit: true, isScheduled: false, publishedAt: '2026-10-10T00:00:00Z', pushAlreadySent: false }
    expect(noticeFormSchema(ctx, now).safeParse(valid).success).toBe(false)
  })
  it('adds the backend-only rules (body length, attachment type, 5 MB)', () => {
    const s = noticeFormSchema(createCtx, now)
    expect(s.safeParse({ ...valid, body: 'x'.repeat(10001) }).success).toBe(false)
    expect(s.safeParse({ ...valid, file: new File(['x'], 'a.docx') }).success).toBe(false)
    expect(s.safeParse({ ...valid, file: new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.pdf') }).success).toBe(false)
    expect(s.safeParse({ ...valid, file: new File(['x'], 'scan.JPG') }).success).toBe(true)
  })
})

describe('toNoticeFormData (legacy multipart body)', () => {
  it('create', () => {
    const f = toNoticeFormData({ ...valid, targets: ['teacher', 'student'], isPinned: true, sendPush: true, file: new File(['x'], 'a.pdf') }, createCtx)
    expect(entries(f)).toEqual([
      ['title', 'Holiday'],
      ['body', 'Monday off'],
      ['target_roles[]', 'teacher'],
      ['target_roles[]', 'student'],
      ['is_pinned', '1'],
      ['is_important', '0'],
      ['expires_at', new Date('2026-10-05T10:00').toISOString()],
      ['send_push', '1'],
      ['attachment', 'a.pdf'],
    ])
  })
  it('edit after push sent, removing the attachment', () => {
    const ctx = { isEdit: true, isScheduled: false, publishedAt: '2026-09-01T00:00:00Z', pushAlreadySent: true }
    const f = toNoticeFormData({ ...valid, publishAt: '2026-09-01T00:00', resendPush: true, removeAttachment: true }, ctx)
    expect(entries(f)).toEqual([
      ['title', 'Holiday'],
      ['body', 'Monday off'],
      ['target_roles[]', 'all'],
      ['is_pinned', '0'],
      ['is_important', '0'],
      ['expires_at', new Date('2026-10-05T10:00').toISOString()],
      ['resend_push', '1'],
      ['remove_attachment', '1'],
      ['_method', 'PUT'],
    ])
  })
})
