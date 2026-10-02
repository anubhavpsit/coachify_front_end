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
    <Link to="/library/chapters" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" /> Back to Chapters
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
      <div className="flex flex-col gap-4" role="status" aria-label="Loading chapter">
        <Back />
        <Skeleton className="h-16 w-1/2" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  if (detail.error || !c)
    return (
      <div className="flex flex-col gap-4">
        <Back />
        <ErrorState title="You do not have access to this chapter, or it does not exist." />
      </div>
    )

  return (
    <div className="flex flex-col gap-5">
      <Back />
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <BookMarked className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl! font-bold text-foreground">{c.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {c.topics.map((t, i) => (
            <li key={t.id}>
              <Link
                to={`/library/topics/${t.id}`}
                className="group flex items-center gap-3 rounded-xl border border-solid border-border bg-card px-4 py-3 text-foreground no-underline transition-colors hover:border-primary/40 hover:bg-primary-soft/30"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 font-medium">{t.name}</span>
                <Badge variant="secondary">{t.grade ? `Grade ${t.grade}` : 'All grades'}</Badge>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
