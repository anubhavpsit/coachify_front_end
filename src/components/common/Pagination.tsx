import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  page: number
  lastPage: number
  total?: number
  itemLabel?: string
  disabled?: boolean
  onPageChange: (page: number) => void
}

export default function Pagination({ page, lastPage, total, itemLabel = 'items', disabled, onPageChange }: Props) {
  return (
    <nav aria-label="Pagination" className="tw:flex tw:items-center tw:justify-between tw:gap-3">
      <Button variant="outline" size="sm" disabled={page <= 1 || disabled} onClick={() => onPageChange(Math.max(1, page - 1))}>
        <ChevronLeft aria-hidden="true" />
        Previous
      </Button>
      <p className="tw:m-0 tw:text-center tw:text-sm tw:text-muted-foreground" aria-live="polite">
        Page {page} of {lastPage}
        {total !== undefined && ` · ${total} ${itemLabel}`}
      </p>
      <Button variant="outline" size="sm" disabled={page >= lastPage || disabled} onClick={() => onPageChange(page + 1)}>
        Next
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
