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
    <div role="note" className="rounded-md border-l-4 border-solid border-y-0 border-r-0 border-destructive bg-destructive-soft px-3 py-2 text-sm">
      <div className="font-semibold text-destructive">Admin asked for changes</div>
      <p className="m-0 whitespace-pre-wrap text-foreground">{review.admin_feedback}</p>
    </div>
  )
}
