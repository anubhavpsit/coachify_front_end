import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookMarked, ChevronRight, Plus } from 'lucide-react'
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
import ChapterFormDialog from '../components/ChapterFormDialog'
import { ReadOnlyMark, ScopeBadge } from '../components/ScopeBadge'
import type { ChapterValues } from '../schemas/contentForms'
import { deleteChapter, fetchChapters, fetchSubjects, ownTenantId, type Chapter } from '../services/contentLibraryService'

const chapterRoute = (id: number) => `/chapters/${id}`

/** Route gate: content_library.manage | role teacher (unchanged). Only this coaching's own chapters are editable (unchanged). */
export default function ChaptersPage() {
  const navigate = useNavigate()
  const tenantId = ownTenantId()
  const subjects = useAsync(() => fetchSubjects().catch((e) => (console.error('Error fetching subjects:', e), [])), [])
  const [subjectFilter, setSubjectFilter] = useState('')
  const list = useAsync(() => fetchChapters(subjectFilter || undefined).catch((e) => (console.error('Error fetching chapters:', e), [])), [subjectFilter])
  const chapters = list.data ?? []
  const subjectName = (c: Chapter) => c.subject?.subject ?? subjects.data?.find((s) => s.id === c.subject_id)?.subject ?? '-'
  const canManage = (c: Chapter) => c.tenant_id === tenantId

  const [editing, setEditing] = useState<Chapter | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Chapter | null>(null)

  const openForm = (c: Chapter | null) => {
    setEditing(c)
    setFormOpen(true)
  }

  const onSaved = ({ id, values }: { id?: number; values: ChapterValues }) => {
    if (editing) toast.success('Chapter updated.')
    else toast.success(`Chapter “${values.name.trim()}” added.`, id ? { action: { label: 'Add topics', onClick: () => navigate(chapterRoute(id)) } } : undefined)
    list.reload()
  }

  const remove = async () => {
    try {
      await deleteChapter(deleting!.id)
      toast.success('Chapter deleted.')
      list.reload()
    } catch (err) {
      console.error('Error deleting chapter:', err)
      toast.error('Failed to delete chapter.')
      throw err
    }
  }

  const columns: ColumnDef<Chapter, unknown>[] = [
    {
      id: 'name',
      header: 'Chapter',
      accessorFn: (c) => c.name,
      cell: ({ row }) => (
        <Link to={chapterRoute(row.original.id)} className="group inline-flex items-center gap-1 font-medium text-foreground no-underline hover:text-primary">
          {row.original.name}
          <ChevronRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </Link>
      ),
    },
    { id: 'subject', header: 'Subject', accessorFn: (c) => subjectName(c), cell: ({ row }) => <Badge variant="soft">{subjectName(row.original)}</Badge> },
    { id: 'type', header: 'Type', accessorFn: (c) => (c.tenant_id === 0 ? 'Base' : 'Custom'), cell: ({ row }) => <ScopeBadge base={row.original.tenant_id === 0} /> },
    {
      id: 'topics',
      header: 'Topics',
      accessorFn: (c) => c.topics_count ?? 0,
      cell: ({ row }) => {
        const n = row.original.topics_count ?? 0
        return (
          <Link to={chapterRoute(row.original.id)} className="text-sm font-medium text-primary no-underline hover:underline">
            {n} topic{n === 1 ? '' : 's'}
          </Link>
        )
      },
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
            <ReadOnlyMark what="chapter" />
          </div>
        ),
    },
  ]

  const custom = chapters.filter((c) => c.tenant_id !== 0).length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Chapters"
        description="Group topics into chapters for each subject. Base chapters are shared; you can add your own."
        className="mb-0"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" /> Add Chapter
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <DataTable
          columns={columns}
          data={chapters}
          loading={list.loading && chapters.length === 0}
          getRowId={(c) => String(c.id)}
          searchPlaceholder="Search chapters"
          emptyIcon={BookMarked}
          emptyTitle="No chapters found."
          emptyDescription={subjectFilter ? 'Try another subject, or add one.' : undefined}
          emptyAction={
            <Button size="sm" variant="soft" onClick={() => openForm(null)}>
              <Plus aria-hidden="true" /> Add a chapter
            </Button>
          }
          pageSize={25}
          toolbar={
            <div className="flex flex-wrap items-center gap-3">
              <NativeSelect aria-label="Subject" className="w-full sm:w-48" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="">All subjects</option>
                {(subjects.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject}
                  </option>
                ))}
              </NativeSelect>
              {!list.loading && (
                <span className="text-xs text-muted-foreground">
                  {chapters.length} chapters · {custom} custom
                </span>
              )}
            </div>
          }
        />
      </Card>

      <ChapterFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        chapter={editing}
        subjects={subjects.data ?? []}
        subjectsLoading={subjects.loading}
        presetSubjectId={subjectFilter}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete chapter?"
        description={
          <>
            <strong>{deleting?.name}</strong> will be deleted. Its topics will not be deleted — they&apos;ll just be unlinked from this chapter.
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}
