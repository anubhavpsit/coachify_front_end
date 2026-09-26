import { useEffect, useState } from 'react'
import axios from 'axios'
import { Modal, Button } from 'react-bootstrap'
import {
  API_BASE_URL,
  AUDIENCE_LABELS,
  ROLE_LABELS,
  authHeaders,
  formatNoticeDate,
  type Notice,
} from './types'
import NoticeBadges from './NoticeBadges'

type Props = {
  noticeId: number | null
  canManage: boolean
  onHide: () => void
  onOpened: (notice: Notice) => void // fetched (and marked read server-side)
  onEdit: (notice: Notice) => void
  onDeleted: (id: number) => void
}

export default function NoticeDetailModal({ noticeId, canManage, onHide, onOpened, onEdit, onDeleted }: Props) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (noticeId === null) return
    let cancelled = false
    setNotice(null)
    setError(null)
    setConfirmDelete(false)
    setLoading(true)
    axios
      .get<{ success: boolean; data: Notice }>(`${API_BASE_URL}/notices/${noticeId}`, { headers: authHeaders() })
      .then(res => {
        if (cancelled) return
        if (res.data.success) {
          setNotice(res.data.data)
          onOpened(res.data.data)
        } else {
          setError('Unable to load notice.')
        }
      })
      .catch(err => {
        if (cancelled) return
        setError(axios.isAxiosError(err) && err.response?.status === 404 ? 'This notice is no longer available.' : 'Unable to load notice.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // onOpened intentionally excluded: parent re-creates it every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticeId])

  const handleDelete = async () => {
    if (!notice) return
    setDeleting(true)
    try {
      await axios.delete(`${API_BASE_URL}/notices/${notice.id}`, { headers: authHeaders() })
      onDeleted(notice.id)
    } catch {
      setError('Unable to delete notice.')
    } finally {
      setDeleting(false)
    }
  }

  const isImage = notice?.attachment?.mime?.startsWith('image/')

  return (
    <Modal show={noticeId !== null} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="h6 mb-0">{notice?.title ?? 'Notice'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div className="text-center py-4">
            <span className="spinner-border spinner-border-sm" />
          </div>
        )}
        {error && <p className="text-danger-600 text-sm mb-0">{error}</p>}

        {notice && (
          <>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-12">
              <NoticeBadges notice={notice} />
              <span className="text-sm text-secondary-light">
                {formatNoticeDate(notice.published_at)}
                {notice.posted_by && (
                  <>
                    {' · '}
                    {notice.posted_by.name} ({ROLE_LABELS[notice.posted_by.role] ?? notice.posted_by.role})
                  </>
                )}
              </span>
            </div>

            <div className="mb-16" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {notice.body}
            </div>

            {notice.attachment && (
              <div className="mb-16">
                {isImage ? (
                  <a href={notice.attachment.url} target="_blank" rel="noreferrer">
                    <img src={notice.attachment.url} alt={notice.attachment.name} className="img-fluid radius-8" style={{ maxHeight: 320 }} />
                  </a>
                ) : (
                  <a href={notice.attachment.url} target="_blank" rel="noreferrer" className="d-inline-flex align-items-center gap-2">
                    <i className="ri-file-pdf-2-line text-xl" />
                    {notice.attachment.name}
                  </a>
                )}
              </div>
            )}

            {canManage && (
              <div className="border-top pt-12 text-sm text-secondary-light">
                <div>Audience: {notice.target_roles.map(t => AUDIENCE_LABELS[t] ?? t).join(', ')}</div>
                {notice.expires_at && <div>Expires: {formatNoticeDate(notice.expires_at)}</div>}
                <div>
                  Push:{' '}
                  {notice.push_dispatched_at
                    ? `sent ${formatNoticeDate(notice.push_dispatched_at)} to ${notice.push_recipients_count ?? 0} user(s)`
                    : notice.send_push
                      ? notice.status === 'scheduled' ? 'will be sent at publish time' : 'sending…'
                      : 'off'}
                </div>
              </div>
            )}
          </>
        )}
      </Modal.Body>
      {canManage && notice && (
        <Modal.Footer>
          {confirmDelete ? (
            <>
              <span className="text-sm me-auto">Delete this notice for everyone?</span>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline-danger" size="sm" className="me-auto" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Button variant="primary" size="sm" onClick={() => onEdit(notice)}>
                Edit
              </Button>
            </>
          )}
        </Modal.Footer>
      )}
    </Modal>
  )
}
