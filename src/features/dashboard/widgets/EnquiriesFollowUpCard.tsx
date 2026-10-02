import { PhoneCall } from 'lucide-react'
import { m } from 'motion/react'
import { slideUp, stagger } from '@/animations'
import WidgetCard from '@/components/common/WidgetCard'
import { Badge } from '@/components/ui/badge'
import { useAsync } from '@/hooks/useAsync'
import { formatDate } from '@/utils/date'
import { fetchFollowUpEnquiries } from '../services/widgetsService'

/** Gate: `enquiries.view` (in DashboardPage). */
export default function EnquiriesFollowUpCard() {
  const { data, loading, error, reload } = useAsync(fetchFollowUpEnquiries, [])
  const enquiries = data?.enquiries ?? []
  const message = error instanceof Error && error.message === 'You are not authenticated.' ? error.message : 'Unable to load enquiries.'

  return (
    <WidgetCard
      title="Enquiries to Communicate Today"
      icon={PhoneCall}
      action={data?.frequencyDays ? <Badge variant="secondary">Every {data.frequencyDays} days</Badge> : undefined}
      loading={loading}
      error={error ? message : undefined}
      onRetry={reload}
      empty={enquiries.length === 0}
      emptyTitle="No enquiries require communication today."
      emptyIcon={PhoneCall}
    >
      <m.ul className="m-0 list-none divide-y divide-border p-0" variants={stagger(0.04)} initial="hidden" animate="visible">
        {enquiries.map((enquiry) => (
          <m.li key={enquiry.id} variants={slideUp} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{enquiry.name}</span>
              <span className="text-xs text-muted-foreground">
                {enquiry.enquiry_type === 'teacher' ? 'Teacher Enquiry' : 'Student Enquiry'}
              </span>
              <a href={`tel:${enquiry.contact_number}`} className="text-xs text-primary no-underline hover:underline">
                {enquiry.contact_number}
              </a>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-xs text-muted-foreground">Last communication</span>
              <span className="text-sm font-semibold text-foreground">{formatDate(enquiry.last_communication_at)}</span>
            </div>
          </m.li>
        ))}
      </m.ul>
    </WidgetCard>
  )
}
