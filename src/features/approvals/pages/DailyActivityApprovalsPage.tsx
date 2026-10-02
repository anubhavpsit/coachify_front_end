import { useCallback, useMemo, useState } from 'react'
import { CheckCheck, ClipboardCheck, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import AttachmentPreviewModal from '@/components/common/AttachmentPreviewModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import SegmentedControl from '@/components/common/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { getErrorMessage } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { PERMISSIONS as P, usePermission } from '@/permissions'
import { formatDate } from '@/utils/date'
import ApprovalCard from '../components/ApprovalCard'
import SendBackDialog from '../components/SendBackDialog'
import { bulkMessage, groupByDate, matchesSearch, QUICK_FILTERS, quickFilterDates, type QuickFilter } from '../lib/review'
import {
  approveBulk,
  fetchReviewActivities,
  fetchStudentOptions,
  isPendingReview,
  reviewAttachmentUrl,
  sendNotificationNow,
  setActivityApproval,
  setAttachmentApproval,
  type ActivityNotification,
  type ApprovalFilter,
  type ReviewActivity,
  type ReviewAttachment,
} from '../services/activityApprovalsService'

const STATUS_OPTIONS: { value: ApprovalFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
]

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const today = new Date()
  const y = new Date()
  y.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  return same(d, today) ? 'Today' : same(d, y) ? 'Yesterday' : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Route gate (unchanged): daily_activities.approve | role teacher.
 * In-page gates kept exactly:
 *  - approver = coaching_admin, or staff with daily_activities.approve → admin list + actions;
 *  - teacher → read-only list of their own activities;
 *  - anyone else → "not authorized".
 * Buttons the backend would refuse are not shown: attachment approve/revoke
 * (approver only) and "Send now" (notifications.manage).
 */
export default function DailyActivityApprovalsPage() {
  const { hasRole, can } = usePermission()
  const isApprover = hasRole(ROLES.COACHING_ADMIN) || (hasRole(ROLES.STAFF) && can(P.DAILY_ACTIVITIES_APPROVE))
  const isTeacher = hasRole(ROLES.TEACHER)
  const canAccess = isApprover || isTeacher
  const canSendNotifications = can(P.NOTIFICATIONS_MANAGE)

  const [status, setStatus] = useState<ApprovalFilter>('pending')
  const [quick, setQuick] = useState<QuickFilter>('today')
  const [customDate, setCustomDate] = useState('')
  const [studentId, setStudentId] = useState('')
  const [search, setSearch] = useState('')

  const students = useAsync(() => fetchStudentOptions(isApprover).catch(() => []), [isApprover], { enabled: canAccess })
  const dates = quickFilterDates(quick, customDate)
  const list = useAsync(
    () =>
      fetchReviewActivities(isApprover, status, dates, studentId || undefined).catch((e) => {
        console.error('Failed to load activities', e)
        throw e
      }),
    [isApprover, status, quick, customDate, studentId],
    { enabled: canAccess },
  )

  const reload = list.reload
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [includeFiles, setIncludeFiles] = useState(true)
  const [bulkIds, setBulkIds] = useState<number[] | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [busyFileId, setBusyFileId] = useState<number | null>(null)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [sendBack, setSendBack] = useState<ReviewActivity | null>(null)
  const [preview, setPreview] = useState<ReviewAttachment | null>(null)

  const activities = useMemo(() => list.data ?? [], [list.data])
  const shown = useMemo(() => activities.filter((a) => matchesSearch(a, search)), [activities, search])
  const groups = useMemo(() => groupByDate(shown), [shown])
  // Selection only ever holds pending activities that are on screen (legacy rule).
  const pendingIds = useMemo(() => (isApprover ? shown.filter(isPendingReview).map((a) => a.id) : []), [shown, isApprover])
  const selectedIds = pendingIds.filter((id) => selected.has(id))
  const allSelected = pendingIds.length > 0 && selectedIds.length === pendingIds.length
  const awaitingTeacher = shown.filter((a) => !a.is_admin_approved && a.admin_feedback).length

  const toggle = useCallback(
    (id: number) =>
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    [],
  )

  const approveOne = useCallback(
    async (a: ReviewActivity) => {
      setBusyId(a.id)
      try {
        const message = await setActivityApproval(a.id, true)
        toast.success(message || 'Activity approved.')
        reload()
      } catch (err) {
        console.error('Failed to update approval', err)
        toast.error(getErrorMessage(err, 'Unable to update approval. Please try again.'))
      } finally {
        setBusyId(null)
      }
    },
    [reload],
  )

  const submitSendBack = async (a: ReviewActivity, remarks: string) => {
    const message = await setActivityApproval(a.id, false, remarks)
    toast.success(message || 'Sent back to the teacher.')
    reload()
  }

  const fileApproval = useCallback(
    async (a: ReviewActivity, f: ReviewAttachment, approved: boolean) => {
      setBusyFileId(f.id)
      try {
        await setAttachmentApproval(a.id, f.id, approved)
        toast.success(approved ? `${f.original_name} approved.` : `${f.original_name} marked as pending.`)
        reload()
      } catch (err) {
        console.error('Failed to update attachment approval', err)
        toast.error('Unable to update attachment approval. Please try again.')
      } finally {
        setBusyFileId(null)
      }
    },
    [reload],
  )

  const approveAllFiles = useCallback(
    async (a: ReviewActivity) => {
      setBusyId(a.id)
      const pending = (a.attachments ?? []).filter((f) => !f.is_admin_approved)
      let failed = 0
      for (const f of pending) {
        try {
          await setAttachmentApproval(a.id, f.id, true)
        } catch (err) {
          console.error('Failed to update attachment approval', err)
          failed++
        }
      }
      if (failed) toast.error(`${failed} of ${pending.length} files could not be approved.`)
      else toast.success(`${pending.length} files approved.`)
      setBusyId(null)
      reload()
    },
    [reload],
  )

  const sendNow = useCallback(
    async (n: ActivityNotification) => {
      setSendingId(n.id)
      try {
        await sendNotificationNow(n.id)
        toast.success('Notification sent.')
        reload()
      } catch (err) {
        console.error('Failed to send notification', err)
        toast.error('Unable to send notification. Please review it in the Notifications tab.')
      } finally {
        setSendingId(null)
      }
    },
    [reload],
  )

  const runBulk = async () => {
    const ids = bulkIds!
    try {
      const d = await approveBulk(ids, includeFiles)
      toast.success(bulkMessage(d, includeFiles))
      setSelected(new Set())
      reload()
    } catch (err) {
      console.error('Bulk approval failed', err)
      toast.error('Unable to approve the selected activities. Please try again.')
      throw err
    }
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Activity Approvals" className="mb-0" />
        <Card>
          <EmptyState icon={ShieldAlert} title="You are not authorized to view this page." />
        </Card>
      </div>
    )
  }

  const pendingFilesInBulk = bulkIds ? activities.filter((a) => bulkIds.includes(a.id)).reduce((n, a) => n + (a.attachments ?? []).filter((f) => !f.is_admin_approved).length, 0) : 0

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Activity Approvals"
        description={isApprover ? 'Review what teachers logged. Approved activities become visible to students.' : 'The review status of activities you logged.'}
        className="mb-0"
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-solid border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          <div role="group" aria-label="Date range" className="flex flex-wrap items-center gap-1">
            {QUICK_FILTERS.map((f) => (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={quick === f.value ? 'soft' : 'ghost'}
                aria-pressed={quick === f.value}
                onClick={() => {
                  setQuick(f.value)
                  setCustomDate('')
                }}
              >
                {f.label}
              </Button>
            ))}
            <Input
              type="date"
              aria-label="Pick a date"
              className={cn('h-8 w-40', quick === 'custom' && 'border-primary')}
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value)
                setQuick(e.target.value ? 'custom' : 'all')
              }}
            />
          </div>
          <Button type="button" size="icon-sm" variant="outline" className="ml-auto" onClick={reload} disabled={list.loading} aria-label="Refresh">
            <RefreshCw className={cn(list.loading && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              className="pl-9"
              placeholder={isApprover ? 'Search student, teacher, subject or topic' : 'Search student, subject or topic'}
              aria-label="Search activities"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <NativeSelect aria-label="Student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">All students</option>
            {(students.data ?? []).map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Bulk bar (approvers) */}
      {isApprover && pendingIds.length > 0 && (
        <div className="z-10 flex flex-wrap sm:sticky sm:top-16 items-center gap-3 rounded-xl border border-solid border-primary/30 bg-primary-soft/95 px-4 py-3 shadow-sm backdrop-blur">
          <label className="m-0 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Checkbox checked={allSelected ? true : selectedIds.length ? 'indeterminate' : false} onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(pendingIds))} aria-label="Select all pending activities" />
            {selectedIds.length ? `${selectedIds.length} of ${pendingIds.length} selected` : `${pendingIds.length} awaiting review`}
          </label>
          <label className="m-0 flex items-center gap-2 text-sm">
            <Checkbox checked={includeFiles} onCheckedChange={(v) => setIncludeFiles(v === true)} />
            Also approve their attachments
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={!selectedIds.length} onClick={() => setBulkIds(selectedIds)}>
              Approve selected ({selectedIds.length})
            </Button>
            <Button type="button" size="sm" variant="success" onClick={() => setBulkIds(pendingIds)}>
              <CheckCheck aria-hidden="true" /> Approve all shown ({pendingIds.length})
            </Button>
          </div>
        </div>
      )}
      {isApprover && awaitingTeacher > 0 && status !== 'approved' && (
        <p className="-mt-2 m-0 text-xs text-muted-foreground">
          {awaitingTeacher} sent back {awaitingTeacher === 1 ? 'is' : 'are'} waiting on the teacher and can&apos;t be bulk-approved until they fix {awaitingTeacher === 1 ? 'it' : 'them'}.
        </p>
      )}

      {/* List */}
      {list.loading && !list.data ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading activities">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : list.error ? (
        <ErrorState title="Unable to load activities. Please try again later." onRetry={reload} />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title={search ? 'No activities match your search.' : status === 'pending' ? 'Nothing waiting for review.' : 'No activities found for the selected filters.'}
            description={status === 'pending' && !search ? 'Try a wider date range, or check the Approved tab.' : undefined}
          />
        </Card>
      ) : (
        <div className={cn('flex flex-col gap-6 transition-opacity', list.loading && 'opacity-70')}>
          {groups.map((g) => (
            <section key={g.date} aria-label={dayLabel(g.date)} className="flex flex-col gap-3">
              <h2 className="m-0 flex items-baseline gap-2 text-sm! font-semibold text-muted-foreground">
                {dayLabel(g.date)}
                <span className="text-xs font-normal">
                  {formatDate(g.date)} · {g.items.length} {g.items.length === 1 ? 'activity' : 'activities'}
                </span>
              </h2>
              {g.items.map((a) => (
                <ApprovalCard
                  key={a.id}
                  activity={a}
                  isApprover={isApprover}
                  canSendNotifications={canSendNotifications}
                  selected={selected.has(a.id)}
                  busy={busyId === a.id}
                  busyAttachmentId={busyFileId}
                  sendingNotificationId={sendingId}
                  onToggleSelect={toggle}
                  onApprove={approveOne}
                  onSendBack={setSendBack}
                  onAttachment={fileApproval}
                  onApproveAllFiles={approveAllFiles}
                  onPreview={setPreview}
                  onSendNotification={sendNow}
                />
              ))}
            </section>
          ))}
          {activities.length >= 200 && <p className="m-0 text-center text-xs text-muted-foreground">Showing the latest 200. Narrow the dates to see older ones.</p>}
        </div>
      )}

      <SendBackDialog activity={sendBack} onClose={() => setSendBack(null)} onSubmit={submitSendBack} />

      <ConfirmDialog
        open={bulkIds !== null}
        onOpenChange={(o) => !o && setBulkIds(null)}
        title={`Approve ${bulkIds?.length ?? 0} ${bulkIds?.length === 1 ? 'activity' : 'activities'}?`}
        description={
          <>
            Students will be notified (one notification each).
            {includeFiles ? ` ${pendingFilesInBulk} pending ${pendingFilesInBulk === 1 ? 'attachment' : 'attachments'} will be approved too.` : ' Their attachments stay pending.'}
          </>
        }
        confirmLabel="Approve"
        onConfirm={runBulk}
      />

      <AttachmentPreviewModal attachment={preview} url={preview ? reviewAttachmentUrl(preview) : null} onHide={() => setPreview(null)} />
    </div>
  )
}
