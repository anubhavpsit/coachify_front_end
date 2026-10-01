import { CircleCheck, Clock, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { isSentBack, type ActivityRecord } from '../services/dailyActivitiesService'

type Review = Pick<ActivityRecord, 'is_admin_approved' | 'admin_feedback'>

export function ReviewBadge({ review }: { review: Review }) {
  if (review.is_admin_approved)
    return (
      <Badge variant="success">
        <CircleCheck aria-hidden="true" /> Approved
      </Badge>
    )
  if (isSentBack(review))
    return (
      <Badge variant="destructive">
        <Undo2 aria-hidden="true" /> Sent back
      </Badge>
    )
  return (
    <Badge variant="warning">
      <Clock aria-hidden="true" /> Awaiting review
    </Badge>
  )
}

/** The admin's remark on a sent-back activity. */
export function AdminFeedback({ review }: { review: Review }) {
  if (!isSentBack(review)) return null
  return (
    <div role="note" className="tw:rounded-md tw:border-l-4 tw:border-solid tw:border-y-0 tw:border-r-0 tw:border-destructive tw:bg-destructive-soft tw:px-3 tw:py-2 tw:text-sm">
      <div className="tw:font-semibold tw:text-destructive">Admin asked for changes</div>
      <p className="tw:m-0 tw:whitespace-pre-wrap tw:text-foreground">{review.admin_feedback}</p>
    </div>
  )
}
