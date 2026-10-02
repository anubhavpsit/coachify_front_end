import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Download, FileText, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteNotice, getNotice } from '../services/noticesService'
import { AUDIENCE_LABELS, ROLE_LABELS, formatNoticeDate, type Notice } from '../types'
import NoticeBadges from './NoticeBadges'

type Props = {
  noticeId: number | null
  /** Server flag meta.can_manage — gates Edit/Delete and the admin details. */
  canManage: boolean
  onHide: () => void
  onOpened: (notice: Notice) => void // fetched (and marked read server-side)
  onEdit: (notice: Notice) => void
  onDeleted: (id: number) => void
}

export default function NoticeDetailDialog({ noticeId, canManage, onHide, onOpened, onEdit, onDeleted }: Props) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const onOpenedRef = useRef(onOpened)
  useEffect(() => {
    onOpenedRef.current = onOpened
  })

  useEffect(() => {
    if (noticeId === null) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setNotice(null)
      setError(null)
      setConfirmDelete(false)
      setLoading(true)
      getNotice(noticeId)
        .then((body) => {
          if (cancelled) return
          if (body.success) {
            setNotice(body.data)
            onOpenedRef.current(body.data)
          } else {
            setError('Unable to load notice.')
          }
        })
        .catch((err) => {
          if (cancelled) return
          setError(axios.isAxiosError(err) && err.response?.status === 404 ? 'This notice is no longer available.' : 'Unable to load notice.')
        })
        .finally(() => !cancelled && setLoading(false))
    })
    return () => {
      cancelled = true
    }
  }, [noticeId])

  const handleDelete = async () => {
    if (!notice) return
    try {
      await deleteNotice(notice.id)
      toast.success('Notice deleted.')
      onDeleted(notice.id)
    } catch (err) {
      toast.error('Unable to delete notice.')
      throw err // keep the confirm dialog open
    }
  }

  const isImage = notice?.attachment?.mime?.startsWith('image/')

  return (
    <>
      <Dialog open={noticeId !== null} onOpenChange={(open) => !open && onHide()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{notice?.title ?? (loading ? 'Loading…' : 'Notice')}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2">
                {notice && <NoticeBadges notice={notice} />}
                {notice && (
                  <span>
                    {formatNoticeDate(notice.published_at)}
                    {notice.posted_by && ` · ${notice.posted_by.name} (${ROLE_LABELS[notice.posted_by.role] ?? notice.posted_by.role})`}
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col gap-2" role="status" aria-label="Loading notice">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}
          {error && (
            <p className="m-0 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {notice && (
            <div className="flex flex-col gap-4">
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">{notice.body}</div>

              {notice.attachment &&
                (isImage ? (
                  <a href={notice.attachment.url} target="_blank" rel="noreferrer" className="block w-fit">
                    <img src={notice.attachment.url} alt={notice.attachment.name} className="max-h-80 max-w-full rounded-lg border border-solid border-border" />
                  </a>
                ) : (
                  <a
                    href={notice.attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-fit items-center gap-3 rounded-lg border border-solid border-border px-3 py-2 text-sm text-foreground no-underline transition-colors hover:bg-accent"
                  >
                    <FileText className="size-5 text-destructive" aria-hidden="true" />
                    {notice.attachment.name}
                    <Download className="size-4 text-muted-foreground" aria-hidden="true" />
                  </a>
                ))}

              {canManage && (
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-muted/60 p-3 text-sm">
                  <dt className="text-muted-foreground">Audience</dt>
                  <dd className="m-0 text-foreground">{notice.target_roles.map((t) => AUDIENCE_LABELS[t] ?? t).join(', ')}</dd>
                  {notice.expires_at && (
                    <>
                      <dt className="text-muted-foreground">Expires</dt>
                      <dd className="m-0 text-foreground">{formatNoticeDate(notice.expires_at)}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">Push</dt>
                  <dd className="m-0 text-foreground">
                    {notice.push_dispatched_at
                      ? `sent ${formatNoticeDate(notice.push_dispatched_at)} to ${notice.push_recipients_count ?? 0} user(s)`
                      : notice.send_push
                        ? notice.status === 'scheduled'
                          ? 'will be sent at publish time'
                          : 'sending…'
                        : 'off'}
                  </dd>
                </dl>
              )}
            </div>
          )}

          {canManage && notice && (
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
              <Button onClick={() => onEdit(notice)}>
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this notice?"
        description="It will be removed for everyone. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
