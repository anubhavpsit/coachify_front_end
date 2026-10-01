import { memo } from 'react'
import { BookOpen, Check, ClipboardList, FileText, ImageIcon, NotebookPen, Send, Undo2, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/utils/date'
import { ReviewBadge, AdminFeedback } from '@/features/daily-activities/components/ReviewStatus'
import { lessonLabel } from '../lib/review'
import { isPendingReview, type ActivityNotification, type ReviewActivity, type ReviewAttachment } from '../services/activityApprovalsService'

interface Props {
  activity: ReviewActivity
  /** coaching_admin, or staff with daily_activities.approve. */
  isApprover: boolean
  /** notifications.manage (backend gate for "Send now"). */
  canSendNotifications: boolean
  selected: boolean
  busy: boolean
  busyAttachmentId: number | null
  sendingNotificationId: number | null
  onToggleSelect: (id: number) => void
  onApprove: (a: ReviewActivity) => void
  onSendBack: (a: ReviewActivity) => void
  onAttachment: (a: ReviewActivity, file: ReviewAttachment, approved: boolean) => void
  onApproveAllFiles: (a: ReviewActivity) => void
  onPreview: (file: ReviewAttachment) => void
  onSendNotification: (n: ActivityNotification) => void
}

function NotificationLine({ label, n, canSend, sending, onSend }: { label: string; n?: ActivityNotification | null; canSend: boolean; sending: boolean; onSend: () => void }) {
  if (!n) return null
  const status = n.status.toLowerCase()
  const sent = status === 'sent'
  const variant = sent ? 'success' : status === 'failed' ? 'destructive' : status === 'retrying' || status === 'processing' ? 'info' : 'warning'
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-xs tw:text-muted-foreground">
      <span>{label}</span>
      <Badge variant={variant} className="tw:capitalize">
        {n.status.replace('_', ' ')}
      </Badge>
      <span title={`Created ${formatDateTime(n.created_at)}`}>{sent && n.sent_at ? `sent ${formatDateTime(n.sent_at)}` : n.scheduled_for ? `scheduled ${formatDateTime(n.scheduled_for)}` : ''}</span>
      {n.last_error && <span className="tw:text-destructive">· {n.last_error}</span>}
      {canSend && !sent && (
        <Button type="button" size="xs" variant="outline" loading={sending} disabled={sending} onClick={onSend}>
          <Send aria-hidden="true" /> {sending ? 'Sending…' : 'Send now'}
        </Button>
      )}
    </div>
  )
}

/** One activity to review. Memoised: the list can hold up to 200. */
function ApprovalCard(p: Props) {
  const a = p.activity
  const files = a.attachments ?? []
  const pendingFiles = files.filter((f) => !f.is_admin_approved)
  const selectable = p.isApprover && isPendingReview(a)
  const lesson = lessonLabel(a)

  return (
    <article
      aria-label={`${a.student?.name ?? 'Student'} · ${a.subject?.subject ?? ''}`}
      className={cn(
        'tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:bg-card tw:p-4 tw:transition-colors',
        p.selected ? 'tw:border-primary tw:ring-2 tw:ring-primary/15' : 'tw:border-border',
        p.busy && 'tw:opacity-60',
      )}
    >
      <header className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-2">
        {selectable && <Checkbox checked={p.selected} onCheckedChange={() => p.onToggleSelect(a.id)} aria-label={`Select activity for ${a.student?.name ?? 'student'}`} />}
        <span className="tw:text-sm tw:font-semibold tw:text-foreground">{a.student?.name ?? '-'}</span>
        <Badge variant="soft">{a.subject?.subject ?? '-'}</Badge>
        {a.teacher?.name && (
          <span className="tw:inline-flex tw:items-center tw:gap-1 tw:text-xs tw:text-muted-foreground">
            <UserRound className="tw:size-3.5" aria-hidden="true" /> {a.teacher.name}
          </span>
        )}
        <span className="tw:ml-auto">
          <ReviewBadge review={a} />
        </span>
      </header>

      {a.admin_feedback && !a.is_admin_approved ? (
        <AdminFeedback review={a} />
      ) : a.admin_feedback ? (
        <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">Your remark: {a.admin_feedback}</p>
      ) : null}

      <dl className="tw:m-0 tw:grid tw:gap-x-4 tw:gap-y-1.5 tw:text-sm tw:sm:grid-cols-[7.5rem_1fr]">
        <dt className="tw:flex tw:items-center tw:gap-1.5 tw:font-normal! tw:text-muted-foreground">
          <BookOpen className="tw:size-3.5" aria-hidden="true" /> Lesson
        </dt>
        <dd className="tw:m-0">{lesson || <span className="tw:text-muted-foreground">Not specified</span>}</dd>
        <dt className="tw:flex tw:items-center tw:gap-1.5 tw:font-normal! tw:text-muted-foreground">
          <NotebookPen className="tw:size-3.5" aria-hidden="true" /> Class notes
        </dt>
        <dd className="tw:m-0 tw:whitespace-pre-wrap">{a.notes || <span className="tw:text-muted-foreground">-</span>}</dd>
        <dt className="tw:flex tw:items-center tw:gap-1.5 tw:font-normal! tw:text-muted-foreground">
          <ClipboardList className="tw:size-3.5" aria-hidden="true" /> Homework
        </dt>
        <dd className="tw:m-0 tw:whitespace-pre-wrap">{a.homework || <span className="tw:text-muted-foreground">-</span>}</dd>
      </dl>

      {files.length > 0 && (
        <div className="tw:flex tw:flex-col tw:gap-2">
          <ul className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:gap-2 tw:p-0">
            {files.map((f) => {
              const pdf = f.file_type === 'pdf' || f.original_name.toLowerCase().endsWith('.pdf')
              return (
                <li key={f.id} className="tw:flex tw:items-center tw:gap-1.5 tw:rounded-lg tw:border tw:border-solid tw:border-border tw:py-1 tw:pr-1 tw:pl-2.5 tw:text-xs">
                  {pdf ? <FileText className="tw:size-3.5 tw:text-destructive" aria-hidden="true" /> : <ImageIcon className="tw:size-3.5 tw:text-info" aria-hidden="true" />}
                  <button
                    type="button"
                    onClick={() => p.onPreview(f)}
                    className="tw:m-0 tw:max-w-44 tw:cursor-pointer tw:truncate tw:border-0 tw:bg-transparent tw:p-0 tw:text-xs tw:text-foreground tw:underline-offset-2 tw:hover:underline"
                  >
                    {f.original_name}
                  </button>
                  <Badge variant={f.is_admin_approved ? 'success' : 'warning'}>{f.is_admin_approved ? 'Approved' : 'Pending'}</Badge>
                  {p.isApprover &&
                    (f.is_admin_approved ? (
                      <Button type="button" size="xs" variant="ghost" disabled={p.busyAttachmentId === f.id} onClick={() => p.onAttachment(a, f, false)} aria-label={`Revoke ${f.original_name}`}>
                        Revoke
                      </Button>
                    ) : (
                      <Button type="button" size="xs" variant="ghost" className="tw:text-success" disabled={p.busyAttachmentId === f.id} onClick={() => p.onAttachment(a, f, true)} aria-label={`Approve ${f.original_name}`}>
                        <Check aria-hidden="true" /> Approve
                      </Button>
                    ))}
                </li>
              )
            })}
          </ul>
          {p.isApprover && pendingFiles.length > 1 && (
            <div>
              <Button type="button" size="xs" variant="outline" disabled={p.busy} onClick={() => p.onApproveAllFiles(a)}>
                <Check aria-hidden="true" /> Approve all {pendingFiles.length} files
              </Button>
            </div>
          )}
        </div>
      )}

      {(a.student_notification || a.teacher_notification) && (
        <div className="tw:flex tw:flex-col tw:gap-1 tw:border-t tw:border-solid tw:border-border tw:pt-2">
          <NotificationLine
            label="Student notification"
            n={a.student_notification}
            canSend={p.canSendNotifications}
            sending={p.sendingNotificationId === a.student_notification?.id}
            onSend={() => p.onSendNotification(a.student_notification!)}
          />
          <NotificationLine
            label="Teacher notification"
            n={a.teacher_notification}
            canSend={p.canSendNotifications}
            sending={p.sendingNotificationId === a.teacher_notification?.id}
            onSend={() => p.onSendNotification(a.teacher_notification!)}
          />
        </div>
      )}

      {p.isApprover && (
        <footer className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-2 tw:border-t tw:border-solid tw:border-border tw:pt-3">
          {a.is_admin_approved ? (
            <Button type="button" size="sm" variant="outline" disabled={p.busy} onClick={() => p.onSendBack(a)}>
              <Undo2 aria-hidden="true" /> Mark pending
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" className="tw:text-destructive" disabled={p.busy} onClick={() => p.onSendBack(a)} title="Send back to the teacher with remarks — the student is not notified">
                <Undo2 aria-hidden="true" /> {a.admin_feedback ? 'Send back again' : 'Send back'}
              </Button>
              <Button type="button" size="sm" variant="success" loading={p.busy} disabled={p.busy} onClick={() => p.onApprove(a)}>
                <Check aria-hidden="true" /> {p.busy ? 'Approving…' : 'Approve'}
              </Button>
            </>
          )}
        </footer>
      )}
    </article>
  )
}

export default memo(ApprovalCard)
