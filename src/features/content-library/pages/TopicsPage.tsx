import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, MessageCircleQuestion, Plus } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import PageHeader from '@/components/common/PageHeader'
import RowActions from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { useAsync } from '@/hooks/useAsync'
import { ReadOnlyMark, ScopeBadge } from '../components/ScopeBadge'
import TopicFormDialog from '../components/TopicFormDialog'
import { GRADES } from '../schemas/contentForms'
import { deleteTopic, fetchChapters, fetchSubjects, fetchTopics, ownTenantId, type Topic } from '../services/contentLibraryService'

const questionsRoute = (id: number) => `/topics/${id}/questions`
const plainText = (html: string | null) =>
  html
    ? html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''

/** Route gate: content_library.manage | role teacher (unchanged). Only this coaching's own topics are editable (unchanged). */
export default function TopicsPage() {
  const tenantId = ownTenantId()
  const subjects = useAsync(() => fetchSubjects().catch((e) => (console.error('Error fetching subjects:', e), [])), [])
  const [subjectFilter, setSubjectFilter] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  // Chapters for the list filter follow the subject filter (legacy).
  const filterChapters = useAsync(() => fetchChapters(subjectFilter || undefined).catch((e) => (console.error('Error fetching chapters:', e), [])), [subjectFilter])
  const list = useAsync(
    () => fetchTopics({ subject_id: subjectFilter, chapter_id: chapterFilter, grade: gradeFilter }).catch((e) => (console.error('Error fetching topics:', e), [])),
    [subjectFilter, chapterFilter, gradeFilter],
  )
  const topics = list.data ?? []
  const subjectName = (t: Topic) => t.subject?.subject ?? subjects.data?.find((s) => s.id === t.subject_id)?.subject ?? '-'
  const canManage = (t: Topic) => t.tenant_id === tenantId

  const [editing, setEditing] = useState<Topic | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Topic | null>(null)

  const openForm = (t: Topic | null) => {
    setEditing(t)
    setFormOpen(true)
  }
  // A new topic starts from the current filters, so adding several to one chapter is quick.
  const preset = {
    subject_id: subjectFilter,
    chapter_id: chapterFilter && chapterFilter !== 'none' ? chapterFilter : '',
    grade: gradeFilter && gradeFilter !== 'none' ? gradeFilter : '',
  }

  const remove = async () => {
    try {
      await deleteTopic(deleting!.id)
      toast.success('Topic deleted.')
      list.reload()
    } catch (err) {
      console.error('Error deleting topic:', err)
      toast.error('Failed to delete topic.')
      throw err
    }
  }

  const columns: ColumnDef<Topic, unknown>[] = [
    {
      id: 'name',
      header: 'Topic',
      accessorFn: (t) => t.name,
      cell: ({ row }) => {
        const preview = plainText(row.original.explanation_html)
        return (
          <div className="flex max-w-md flex-col">
            <span className="font-medium text-foreground">{row.original.name}</span>
            {preview && <span className="truncate text-xs text-muted-foreground">{preview}</span>}
          </div>
        )
      },
    },
    { id: 'chapter', header: 'Chapter', accessorFn: (t) => t.chapter?.name ?? '', cell: ({ row }) => row.original.chapter?.name ?? <span className="text-muted-foreground">-</span> },
    {
      id: 'grade',
      header: 'Grade',
      accessorFn: (t) => t.grade ?? 0,
      cell: ({ row }) => (row.original.grade ? `Grade ${row.original.grade}` : <span className="text-muted-foreground">All</span>),
    },
    { id: 'subject', header: 'Subject', accessorFn: (t) => subjectName(t), cell: ({ row }) => <Badge variant="soft">{subjectName(row.original)}</Badge> },
    { id: 'type', header: 'Type', accessorFn: (t) => (t.tenant_id === 0 ? 'Base' : 'Custom'), cell: ({ row }) => <ScopeBadge base={row.original.tenant_id === 0} /> },
    {
      id: 'questions',
      header: 'Questions',
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={questionsRoute(row.original.id)} className="inline-flex items-center gap-1 text-sm font-medium text-primary no-underline hover:underline">
          <MessageCircleQuestion className="size-3.5" aria-hidden="true" /> Manage
        </Link>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) =>
        canManage(row.original) ? (
          <RowActions name={row.original.name} onEdit={() => openForm(row.original)} onDelete={() => setDeleting(row.original)} />
        ) : (
          <div className="flex justify-end">
            <ReadOnlyMark what="topic" />
          </div>
        ),
    },
  ]

  const filtersActive = !!(subjectFilter || chapterFilter || gradeFilter)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Topics"
        description="Topics are what teachers pick when they log a lesson. Base topics are shared; you can add your own."
        className="mb-0"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" /> Add Topic
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <DataTable
          columns={columns}
          data={topics}
          loading={list.loading && topics.length === 0}
          getRowId={(t) => String(t.id)}
          searchPlaceholder="Search topics"
          emptyIcon={ListChecks}
          emptyTitle="No topics found."
          emptyDescription={filtersActive ? 'Try clearing the filters, or add one.' : undefined}
          emptyAction={
            <Button size="sm" variant="soft" onClick={() => openForm(null)}>
              <Plus aria-hidden="true" /> Add a topic
            </Button>
          }
          pageSize={25}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect
                aria-label="Subject"
                className="w-full sm:w-40"
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value)
                  setChapterFilter('')
                }}
              >
                <option value="">All subjects</option>
                {(subjects.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect aria-label="Chapter" className="w-full sm:w-44" value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)}>
                <option value="">All chapters</option>
                <option value="none">No chapter</option>
                {(filterChapters.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect aria-label="Grade" className="w-full sm:w-40" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                <option value="">All grades</option>
                <option value="none">All grades (shared)</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </NativeSelect>
              {filtersActive && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSubjectFilter('')
                    setChapterFilter('')
                    setGradeFilter('')
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          }
        />
      </Card>

      <TopicFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        topic={editing}
        subjects={subjects.data ?? []}
        subjectsLoading={subjects.loading}
        preset={preset}
        onSaved={(v) => {
          toast.success(editing ? 'Topic updated.' : `Topic “${v.name.trim()}” added.`)
          list.reload()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete topic?"
        description={
          <>
            <strong>{deleting?.name}</strong> will be deleted. Its questions will also be removed.
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}
