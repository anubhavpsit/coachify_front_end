import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, BookMarked, Info, ListChecks, MessageCircleQuestion, Pencil, Plus, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import { IconAction } from '@/components/common/RowActions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import AddTopicsPanel from '../components/AddTopicsPanel'
import ChapterFormDialog from '../components/ChapterFormDialog'
import { ScopeBadge } from '../components/ScopeBadge'
import TopicFormDialog from '../components/TopicFormDialog'
import { attachTopics, detachTopic, fetchChapter, fetchSubjects, fetchTopics, ownTenantId, type Topic } from '../services/contentLibraryService'

const questionsRoute = (id: number) => `/topics/${id}/questions`

/**
 * Route gate: content_library.manage | role teacher (unchanged).
 * Edit / add / remove only when the chapter belongs to this coaching (unchanged).
 */
export default function ChapterDetailPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const tenantId = ownTenantId()
  const subjects = useAsync(() => fetchSubjects().catch((e) => (console.error('Error fetching subjects:', e), [])), [])
  const detail = useAsync(
    () =>
      fetchChapter(chapterId!).catch((e) => {
        console.error('Error fetching chapter:', e)
        throw e
      }),
    [chapterId],
  )
  const chapter = detail.data
  const canManage = chapter?.tenant_id === tenantId
  const available = useAsync(
    () =>
      fetchTopics({ subject_id: String(chapter!.subject_id) })
        // Only this coaching's own topics can be attached (base topics can't move into a custom chapter) — legacy rule.
        .then((all) => all.filter((t) => t.tenant_id === chapter!.tenant_id && t.chapter_id !== chapter!.id))
        .catch((e) => (console.error('Error fetching available topics:', e), [] as Topic[])),
    [chapter?.id, chapter?.subject_id, chapter?.topics],
    { enabled: !!chapter && canManage },
  )

  const [editOpen, setEditOpen] = useState(false)
  const [topicOpen, setTopicOpen] = useState(false)
  const [editTopic, setEditTopic] = useState<Topic | null>(null)
  const [removing, setRemoving] = useState<Topic | null>(null)
  const [adding, setAdding] = useState(false)

  if (detail.error) {
    const notFound = axios.isAxiosError(detail.error) && detail.error.response?.status === 404
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        {notFound ? (
          <Card>
            <EmptyState icon={BookMarked} title="Chapter not found." description="It may have been deleted." />
          </Card>
        ) : (
          <ErrorState title="Couldn't load this chapter." onRetry={detail.reload} />
        )}
      </div>
    )
  }
  if (!chapter)
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Loading chapter">
        <BackLink />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )

  // Only shared topics and this coaching's own (the API currently returns every tenant's).
  const topics = (chapter.topics ?? []).filter((t) => t.tenant_id === 0 || t.tenant_id === tenantId)
  const subjectName = chapter.subject?.subject ?? subjects.data?.find((s) => s.id === chapter.subject_id)?.subject ?? '-'

  const add = async (ids: number[], moving: number) => {
    setAdding(true)
    try {
      await attachTopics(chapter.id, ids)
      toast.success(`${ids.length} ${ids.length === 1 ? 'topic' : 'topics'} added${moving ? ` (${moving} moved from another chapter)` : ''}.`)
      detail.reload()
      return true
    } catch (err) {
      console.error('Error adding topics to chapter:', err)
      toast.error('Failed to add topics to chapter.')
      return false
    } finally {
      setAdding(false)
    }
  }

  const remove = async () => {
    try {
      await detachTopic(chapter.id, removing!.id)
      toast.success(`${removing!.name} removed from the chapter.`)
      detail.reload()
    } catch (err) {
      console.error('Error removing topic from chapter:', err)
      toast.error('Failed to remove topic from chapter.')
      throw err
    }
  }

  const openNewTopic = () => {
    setEditTopic(null)
    setTopicOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink />

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <BookMarked className="size-6" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h1 className="m-0 text-xl! font-bold text-foreground">{chapter.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="soft">{subjectName}</Badge>
              <ScopeBadge base={chapter.tenant_id === 0} />
              <span>
                {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
              </span>
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden="true" /> Edit chapter
              </Button>
              <Button onClick={openNewTopic}>
                <Plus aria-hidden="true" /> New topic
              </Button>
            </div>
          )}
        </div>
        {!canManage && (
          <Alert className="rounded-t-none border-x-0 border-b-0">
            <Info aria-hidden="true" />
            <AlertDescription>This is a base chapter — shared and read-only. To group your own topics, create a chapter of your own.</AlertDescription>
          </Alert>
        )}
      </Card>

      <div className={canManage ? 'grid items-start gap-5 lg:grid-cols-2 *:min-w-0' : ''}>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="size-4 text-primary" aria-hidden="true" /> Topics in this chapter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topics.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No topics yet."
                description={canManage ? 'Add existing topics from the panel, or create a new one.' : undefined}
                action={
                  canManage ? (
                    <Button size="sm" variant="soft" onClick={openNewTopic}>
                      <Plus aria-hidden="true" /> New topic
                    </Button>
                  ) : undefined
                }
                className="py-6"
              />
            ) : (
              <ol className="m-0 flex list-none flex-col divide-y divide-border p-0">
                {topics.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.grade ? `Grade ${t.grade}` : 'All grades'}</span>
                    </div>
                    {t.tenant_id === 0 && <ScopeBadge base />}
                    <Link to={questionsRoute(t.id)} className="inline-flex items-center gap-1 text-sm font-medium text-primary no-underline hover:underline">
                      <MessageCircleQuestion className="size-3.5" aria-hidden="true" /> Questions
                    </Link>
                    {canManage && (
                      <>
                        {t.tenant_id === tenantId && (
                          <IconAction
                            label={`Edit ${t.name}`}
                            onClick={() => {
                              setEditTopic(t)
                              setTopicOpen(true)
                            }}
                          >
                            <Pencil aria-hidden="true" />
                          </IconAction>
                        )}
                        <IconAction label={`Remove ${t.name} from this chapter`} onClick={() => setRemoving(t)} destructive>
                          <Unlink aria-hidden="true" />
                        </IconAction>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {canManage && <AddTopicsPanel topics={available.data ?? []} loading={available.loading && !available.data} adding={adding} onAdd={add} onCreate={openNewTopic} />}
      </div>

      <ChapterFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        chapter={chapter}
        subjects={subjects.data ?? []}
        subjectsLoading={subjects.loading}
        onSaved={() => {
          toast.success('Chapter updated.')
          detail.reload()
        }}
      />

      <TopicFormDialog
        open={topicOpen}
        onClose={() => setTopicOpen(false)}
        topic={editTopic}
        subjects={subjects.data ?? []}
        subjectsLoading={subjects.loading}
        preset={{ subject_id: String(chapter.subject_id), chapter_id: String(chapter.id) }}
        lockSubjectAndChapter={!editTopic}
        onSaved={(v) => {
          toast.success(editTopic ? 'Topic updated.' : `Topic “${v.name.trim()}” added to ${chapter.name}.`)
          detail.reload()
        }}
      />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove topic from chapter?"
        description={
          <>
            <strong>{removing?.name}</strong> will be removed from this chapter. The topic itself will not be deleted.
          </>
        }
        confirmLabel="Remove"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/chapters" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" /> Back to Chapters
    </Link>
  )
}
