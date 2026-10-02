import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookMarked, ChevronRight, ListChecks } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { fetchLibraryChapter } from '../services/libraryService'

function Back() {
  return (
    <Link to="/library/chapters" className="tw:inline-flex tw:w-fit tw:items-center tw:gap-1.5 tw:text-sm tw:text-muted-foreground tw:no-underline tw:hover:text-foreground">
      <ArrowLeft className="tw:size-4" aria-hidden="true" /> Back to Chapters
    </Link>
  )
}

/** Teacher library: topics in one chapter (read-only). */
export default function LibraryChapterDetailPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const detail = useAsync(
    () =>
      fetchLibraryChapter(chapterId!).catch((e) => {
        console.error('Error fetching chapter:', e)
        throw e
      }),
    [chapterId],
  )
  const c = detail.data

  if (detail.loading && !c)
    return (
      <div className="tw:flex tw:flex-col tw:gap-4" role="status" aria-label="Loading chapter">
        <Back />
        <Skeleton className="tw:h-16 tw:w-1/2" />
        <Skeleton className="tw:h-48 tw:rounded-xl" />
      </div>
    )
  if (detail.error || !c)
    return (
      <div className="tw:flex tw:flex-col tw:gap-4">
        <Back />
        <ErrorState title="You do not have access to this chapter, or it does not exist." />
      </div>
    )

  return (
    <div className="tw:flex tw:flex-col tw:gap-5">
      <Back />
      <div className="tw:flex tw:items-start tw:gap-3">
        <span className="tw:flex tw:size-12 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl tw:bg-primary-soft tw:text-primary">
          <BookMarked className="tw:size-6" aria-hidden="true" />
        </span>
        <div className="tw:flex tw:flex-col tw:gap-1">
          <h1 className="tw:m-0 tw:text-2xl! tw:font-bold tw:text-foreground">{c.name}</h1>
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
            {c.subject?.subject && <Badge variant="soft">{c.subject.subject}</Badge>}
            {c.topics.length} {c.topics.length === 1 ? 'topic' : 'topics'}
          </div>
        </div>
      </div>

      {c.topics.length === 0 ? (
        <Card>
          <EmptyState icon={ListChecks} title="No topics have been added to this chapter yet." />
        </Card>
      ) : (
        <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-2 tw:p-0">
          {c.topics.map((t, i) => (
            <li key={t.id}>
              <Link
                to={`/library/topics/${t.id}`}
                className="tw:group tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:px-4 tw:py-3 tw:text-foreground tw:no-underline tw:transition-colors tw:hover:border-primary/40 tw:hover:bg-primary-soft/30"
              >
                <span className="tw:flex tw:size-7 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:bg-muted tw:text-xs tw:font-semibold tw:text-muted-foreground">{i + 1}</span>
                <span className="tw:min-w-0 tw:flex-1 tw:font-medium">{t.name}</span>
                <Badge variant="secondary">{t.grade ? `Grade ${t.grade}` : 'All grades'}</Badge>
                <ChevronRight className="tw:size-4 tw:shrink-0 tw:text-muted-foreground tw:transition-transform tw:group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
