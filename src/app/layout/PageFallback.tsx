import { Skeleton } from '@/components/ui/skeleton'

/** Shown while a lazily-loaded page chunk downloads. */
export default function PageFallback() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading page">
      <Skeleton className="h-7 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
