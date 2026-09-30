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
      <m.ul className="tw:m-0 tw:list-none tw:divide-y tw:divide-border tw:p-0" variants={stagger(0.04)} initial="hidden" animate="visible">
        {enquiries.map((enquiry) => (
          <m.li key={enquiry.id} variants={slideUp} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:py-2.5">
            <div className="tw:flex tw:min-w-0 tw:flex-col">
              <span className="tw:truncate tw:text-sm tw:font-medium tw:text-foreground">{enquiry.name}</span>
              <span className="tw:text-xs tw:text-muted-foreground">
                {enquiry.enquiry_type === 'teacher' ? 'Teacher Enquiry' : 'Student Enquiry'}
              </span>
              <a href={`tel:${enquiry.contact_number}`} className="tw:text-xs tw:text-primary tw:no-underline tw:hover:underline">
                {enquiry.contact_number}
              </a>
            </div>
            <div className="tw:shrink-0 tw:text-right">
              <span className="tw:block tw:text-xs tw:text-muted-foreground">Last communication</span>
              <span className="tw:text-sm tw:font-semibold tw:text-foreground">{formatDate(enquiry.last_communication_at)}</span>
            </div>
          </m.li>
        ))}
      </m.ul>
    </WidgetCard>
  )
}
