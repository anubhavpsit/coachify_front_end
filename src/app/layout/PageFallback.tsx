import { Skeleton } from '@/components/ui/skeleton'

/** Shown while a lazily-loaded page chunk downloads. */
export default function PageFallback() {
  return (
    <div className="tw:flex tw:flex-col tw:gap-4" role="status" aria-label="Loading page">
      <Skeleton className="tw:h-7 tw:w-48" />
      <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="tw:h-24 tw:rounded-xl" />
        ))}
      </div>
      <Skeleton className="tw:h-64 tw:rounded-xl" />
    </div>
  )
}
