import { useState } from 'react'
import { BookOpen, ClipboardList, NotebookPen, PencilLine } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import { TEXT_MAX } from '../schemas/activityForm'
import { fetchHistory, isSentBack, saveRemarks, updateHomeworkStatus, type ActivityAttachment, type ActivityRecord, type HomeworkStatus } from '../services/dailyActivitiesService'
import { AttachmentChips } from './Attachments'
import { AdminFeedback, ReviewBadge } from './ReviewStatus'

const STATUS_OPTIONS: { value: HomeworkStatus; label: string }[] = [
  { value: 'not_done', label: 'Not done' },
  { value: 'partial', label: 'Partial' },
  { value: 'done', label: 'Done' },
]

function HistoryItem({ act, onPreview, onEdit, onStatus }: { act: ActivityRecord; onPreview: (a: ActivityAttachment) => void; onEdit: () => void; onStatus: (s: HomeworkStatus) => void }) {
  const [remarks, setRemarks] = useState(act.remarks ?? '')
  const [savedRemarks, setSavedRemarks] = useState(act.remarks ?? '')
  const [saving, setSaving] = useState(false)
  const changed = remarks !== savedRemarks
  const tooLong = remarks.length > TEXT_MAX
  const lesson = [act.chapter_model?.name ?? (act.chapter_number ? `Chapter ${act.chapter_number}` : act.chapter), act.topic_model?.name ?? act.topic].filter(Boolean).join(' › ')

  const save = async () => {
    setSaving(true)
    try {
      await saveRemarks(act.id, remarks)
      setSavedRemarks(remarks)
      toast.success('Remarks saved.')
    } catch (err) {
      console.error('Error saving remarks:', err)
      toast.error('Failed to save remarks.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li>
      <Card className={cn('tw:gap-3 tw:py-4', isSentBack(act) && 'tw:border-destructive/40')}>
        <CardContent className="tw:flex tw:flex-col tw:gap-3 tw:px-4">
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-3 tw:gap-y-1.5">
            <span className="tw:text-sm tw:font-semibold tw:text-foreground">{act.student?.name ?? '-'}</span>
            <Badge variant="soft">{act.subject?.subject ?? '-'}</Badge>
            <span className="tw:text-xs tw:text-muted-foreground">{formatDate(act.activity_date)}</span>
            <span className="tw:ml-auto">
              <ReviewBadge review={act} />
            </span>
          </div>
          <AdminFeedback review={act} />
          {isSentBack(act) && (
            <div>
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                <PencilLine aria-hidden="true" /> Fix this entry
              </Button>
            </div>
          )}
          <dl className="tw:m-0 tw:grid tw:gap-2 tw:text-sm tw:sm:grid-cols-[8rem_1fr]">
            <dt className="tw:flex tw:items-center tw:gap-1.5 tw:font-normal! tw:text-muted-foreground">
              <BookOpen className="tw:size-3.5" aria-hidden="true" /> Lesson
            </dt>
            <dd className="tw:m-0">{lesson || <span className="tw:text-muted-foreground">-</span>}</dd>
            <dt className="tw:flex tw:items-center tw:gap-1.5 tw:font-normal! tw:text-muted-foreground">
              <NotebookPen className="tw:size-3.5" aria-hidden="true" /> Class notes
            </dt>
            <dd className="tw:m-0 tw:whitespace-pre-wrap">{act.notes || <span className="tw:text-muted-foreground">-</span>}</dd>
            <dt className="tw:flex tw:items-center tw:gap-1.5 tw:font-normal! tw:text-muted-foreground">
              <ClipboardList className="tw:size-3.5" aria-hidden="true" /> Homework
            </dt>
            <dd className="tw:m-0 tw:whitespace-pre-wrap">{act.homework || <span className="tw:text-muted-foreground">-</span>}</dd>
          </dl>
          <AttachmentChips attachments={act.attachments ?? []} onPreview={onPreview} />
          <div className="tw:grid tw:gap-3 tw:border-t tw:border-solid tw:border-border tw:pt-3 tw:sm:grid-cols-[10rem_1fr]">
            <div className="tw:flex tw:flex-col tw:gap-1.5">
              <label htmlFor={`hw-status-${act.id}`} className="tw:m-0 tw:text-xs tw:font-medium tw:text-muted-foreground">
                Homework status
              </label>
              <NativeSelect id={`hw-status-${act.id}`} size="sm" className="tw:font-normal" value={act.homework_status ?? 'not_done'} onChange={(e) => onStatus(e.target.value as HomeworkStatus)}>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="tw:flex tw:flex-col tw:gap-1.5">
              <label htmlFor={`remarks-${act.id}`} className="tw:m-0 tw:text-xs tw:font-medium tw:text-muted-foreground">
                Your remarks (to student)
              </label>
              <div className="tw:flex tw:flex-col tw:gap-2 tw:sm:flex-row tw:sm:items-start">
                <Textarea
                  id={`remarks-${act.id}`}
                  rows={1}
                  className="tw:min-h-9 tw:flex-1"
                  placeholder="e.g. Good work! / Improve your writing."
                  value={remarks}
                  aria-invalid={tooLong || undefined}
                  onChange={(e) => setRemarks(e.target.value)}
                />
                <Button type="button" size="sm" variant={changed ? 'default' : 'outline'} loading={saving} disabled={!changed || saving || tooLong} onClick={save}>
                  {saving ? 'Saving…' : 'Save remarks'}
                </Button>
              </div>
              {tooLong && <p className="tw:m-0 tw:text-xs tw:text-destructive">Remarks must be {TEXT_MAX} characters or fewer.</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  )
}

/** Past entries: homework status, remarks to the student, and anything the admin sent back. */
export default function HistoryTab({ active, initialDate, onPreview, onEdit }: { active: boolean; initialDate: string; onPreview: (a: ActivityAttachment) => void; onEdit: (date: string) => void }) {
  const [date, setDate] = useState(initialDate)
  const [needsChangesOnly, setNeedsChangesOnly] = useState(false)
  const history = useAsync(() => fetchHistory(date || undefined), [date, active], { enabled: active })
  const [statusOverrides, setStatusOverrides] = useState<Record<number, HomeworkStatus>>({})

  const rows = (history.data ?? []).map((a) => (statusOverrides[a.id] ? { ...a, homework_status: statusOverrides[a.id] } : a))
  const sentBackCount = rows.filter(isSentBack).length
  const shown = needsChangesOnly ? rows.filter(isSentBack) : rows

  const changeStatus = async (act: ActivityRecord, next: HomeworkStatus) => {
    const before = act.homework_status ?? 'not_done'
    setStatusOverrides((s) => ({ ...s, [act.id]: next }))
    try {
      await updateHomeworkStatus(act.id, next)
    } catch (err) {
      console.error('Error updating homework status:', err)
      setStatusOverrides((s) => ({ ...s, [act.id]: before }))
      toast.error('Failed to update homework status.')
    }
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-4">
        <label className="tw:m-0 tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-medium">
          Date
          <Input type="date" className="tw:h-9 tw:w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {date ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setDate('')}>
            Show all dates
          </Button>
        ) : (
          <span className="tw:pb-2 tw:text-xs tw:text-muted-foreground">Showing all dates (latest 200).</span>
        )}
        <label className="tw:m-0 tw:ml-auto tw:flex tw:items-center tw:gap-2 tw:pb-1.5 tw:text-sm tw:font-medium">
          <Switch checked={needsChangesOnly} onCheckedChange={setNeedsChangesOnly} />
          Needs changes only
          {sentBackCount > 0 && <Badge variant="destructive">{sentBackCount}</Badge>}
        </label>
      </div>

      {history.loading && !history.data ? (
        <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading history">
          <Skeleton className="tw:h-44 tw:rounded-xl" />
          <Skeleton className="tw:h-44 tw:rounded-xl" />
        </div>
      ) : history.error ? (
        <ErrorState title="Couldn't load your activities." onRetry={history.reload} />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title={needsChangesOnly ? 'Nothing sent back — all good.' : 'No activities found.'} />
        </Card>
      ) : (
        <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-3 tw:p-0">
          {shown.map((act) => (
            <HistoryItem key={act.id} act={act} onPreview={onPreview} onEdit={() => onEdit(act.activity_date.slice(0, 10))} onStatus={(s) => void changeStatus(act, s)} />
          ))}
        </ul>
      )}
    </div>
  )
}
