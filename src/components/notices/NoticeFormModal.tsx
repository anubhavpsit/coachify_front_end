import { useEffect, useState } from 'react'
import axios from 'axios'
import { Modal, Button } from 'react-bootstrap'
import {
  API_BASE_URL,
  AUDIENCE_LABELS,
  authHeaders,
  toLocalInputValue,
  type Notice,
  type NoticeAudience,
} from './types'

const TITLE_MAX = 150
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
const AUDIENCE_OPTIONS: NoticeAudience[] = ['all', 'teacher', 'admin', 'student']

type Props = {
  show: boolean
  notice: Notice | null // null = create
  onHide: () => void
  onSaved: (notice: Notice) => void
}

export default function NoticeFormModal({ show, notice, onHide, onSaved }: Props) {
  const isEdit = notice !== null
  const pushAlreadySent = !!notice?.push_dispatched_at
  const isScheduled = !isEdit || notice?.status === 'scheduled'

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targets, setTargets] = useState<NoticeAudience[]>(['all'])
  const [isPinned, setIsPinned] = useState(false)
  const [isImportant, setIsImportant] = useState(false)
  const [publishAt, setPublishAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [sendPush, setSendPush] = useState(false)
  const [resendPush, setResendPush] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [removeAttachment, setRemoveAttachment] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!show) return
    setTitle(notice?.title ?? '')
    setBody(notice?.body ?? '')
    setTargets(notice?.target_roles?.length ? notice.target_roles : ['all'])
    setIsPinned(notice?.is_pinned ?? false)
    setIsImportant(notice?.is_important ?? false)
    setPublishAt(notice?.status === 'scheduled' ? toLocalInputValue(notice.published_at) : '')
    setExpiresAt(toLocalInputValue(notice?.expires_at))
    setSendPush(notice?.send_push ?? false)
    setResendPush(false)
    setFile(null)
    setRemoveAttachment(false)
    setError(null)
  }, [show, notice])

  const allSelected = targets.includes('all')

  const toggleTarget = (t: NoticeAudience) => {
    if (t === 'all') {
      setTargets(allSelected ? [] : ['all'])
      return
    }
    setTargets(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))
  }

  const handleFile = (f: File | null) => {
    setError(null)
    if (f && f.size > ATTACHMENT_MAX_BYTES) {
      setError('Attachment must be 5 MB or smaller.')
      setFile(null)
      return
    }
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !body.trim()) {
      setError('Title and description are required.')
      return
    }
    if (targets.length === 0) {
      setError('Choose at least one audience.')
      return
    }

    const form = new FormData()
    form.append('title', title.trim())
    form.append('body', body.trim())
    targets.forEach(t => form.append('target_roles[]', t))
    form.append('is_pinned', isPinned ? '1' : '0')
    form.append('is_important', isImportant ? '1' : '0')
    if (isScheduled && publishAt) form.append('published_at', new Date(publishAt).toISOString())
    if (expiresAt) form.append('expires_at', new Date(expiresAt).toISOString())
    if (pushAlreadySent) {
      if (resendPush) form.append('resend_push', '1')
    } else {
      form.append('send_push', sendPush ? '1' : '0')
    }
    if (file) form.append('attachment', file)
    if (isEdit && removeAttachment && !file) form.append('remove_attachment', '1')

    setSaving(true)
    try {
      let res
      if (isEdit) {
        // multipart PUT isn't parsed by PHP — spoof the method instead
        form.append('_method', 'PUT')
        res = await axios.post(`${API_BASE_URL}/notices/${notice!.id}`, form, { headers: authHeaders() })
      } else {
        res = await axios.post(`${API_BASE_URL}/notices`, form, { headers: authHeaders() })
      }
      if (res.data?.success) {
        onSaved(res.data.data as Notice)
      } else {
        setError(res.data?.message || 'Unable to save notice.')
      }
    } catch (err: unknown) {
      const data = axios.isAxiosError(err) ? err.response?.data : null
      const firstError = data?.errors ? (Object.values(data.errors)[0] as string[])[0] : null
      setError(firstError || data?.message || 'Unable to save notice.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{isEdit ? 'Edit Notice' : 'Add Notice'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold">
              Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Holiday on Monday"
              maxLength={TITLE_MAX}
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
            <div className="form-text text-end">
              {title.length}/{TITLE_MAX}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              className="form-control"
              rows={6}
              placeholder="Write the full notice. Line breaks are kept."
              value={body}
              onChange={e => setBody(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold d-block">
              Target audience <span className="text-danger">*</span>
            </label>
            <div className="d-flex flex-wrap gap-3">
              {AUDIENCE_OPTIONS.map(t => (
                <div className="form-check" key={t}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`notice-target-${t}`}
                    checked={targets.includes(t)}
                    disabled={t !== 'all' && allSelected}
                    onChange={() => toggleTarget(t)}
                  />
                  <label className="form-check-label" htmlFor={`notice-target-${t}`}>
                    {AUDIENCE_LABELS[t]}
                  </label>
                </div>
              ))}
            </div>
            <div className="form-text">"Admins" includes coaching admins and staff.</div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Publish at</label>
              <input
                type="datetime-local"
                className="form-control"
                value={publishAt}
                onChange={e => setPublishAt(e.target.value)}
                disabled={!isScheduled}
              />
              <div className="form-text">
                {isScheduled ? 'Leave empty to publish now.' : 'Already published — cannot be rescheduled.'}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Expires at</label>
              <input
                type="datetime-local"
                className="form-control"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
              <div className="form-text">Optional. Hidden from users after this time.</div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Attachment</label>
            {isEdit && notice?.attachment && !removeAttachment && !file && (
              <div className="d-flex align-items-center gap-2 mb-2 text-sm">
                <a href={notice.attachment.url} target="_blank" rel="noreferrer">
                  {notice.attachment.name}
                </a>
                <Button variant="link" size="sm" className="text-danger p-0" onClick={() => setRemoveAttachment(true)}>
                  Remove
                </Button>
              </div>
            )}
            <input
              type="file"
              className="form-control"
              accept={ATTACHMENT_ACCEPT}
              onChange={e => handleFile(e.target.files?.[0] ?? null)}
            />
            <div className="form-text">PDF or image, up to 5 MB.</div>
          </div>

          <div className="d-flex flex-wrap gap-4 mb-3">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="notice-pin"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="notice-pin">Pin to top</label>
            </div>
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="notice-important"
                checked={isImportant}
                onChange={e => setIsImportant(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="notice-important">Mark as important</label>
            </div>
            {pushAlreadySent ? (
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notice-resend"
                  checked={resendPush}
                  onChange={e => setResendPush(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="notice-resend">
                  Send push notification again
                </label>
              </div>
            ) : (
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="notice-push"
                  checked={sendPush}
                  onChange={e => setSendPush(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="notice-push">
                  Send push notification
                </label>
              </div>
            )}
          </div>

          {error && <p className="text-danger-600 text-sm mb-2">{error}</p>}

          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="secondary" onClick={onHide} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : publishAt && isScheduled ? 'Schedule' : 'Publish'}
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  )
}
