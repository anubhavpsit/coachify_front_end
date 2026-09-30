import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import WidgetCard from '@/components/common/WidgetCard'
import { Badge } from '@/components/ui/badge'

type Props = {
  title: string
  count?: number
  countTone?: 'danger' | 'primary'
  viewAllTo?: string
  empty: string
  isEmpty: boolean
  children: ReactNode
}

/** Smart-dashboard widget shell (same props as the legacy OverviewCard). */
export default function OverviewCard({ title, count, countTone = 'primary', viewAllTo, empty, isEmpty, children }: Props) {
  return (
    <WidgetCard
      title={
        <span className="tw:flex tw:items-center tw:gap-2">
          {title}
          {count !== undefined && count > 0 && <Badge variant={countTone === 'danger' ? 'destructive' : 'default'}>{count}</Badge>}
        </span>
      }
      action={
        viewAllTo ? (
          <Link to={viewAllTo} className="tw:inline-flex tw:items-center tw:gap-1 tw:text-sm tw:font-medium tw:text-primary tw:no-underline tw:hover:underline">
            View all <ArrowRight className="tw:size-3.5" aria-hidden="true" />
          </Link>
        ) : undefined
      }
      empty={isEmpty}
      emptyTitle={empty}
    >
      {children}
    </WidgetCard>
  )
}
