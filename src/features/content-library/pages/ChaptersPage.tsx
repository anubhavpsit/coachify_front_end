import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BookMarked, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import FormDialog from '@/components/common/FormDialog'
import PageHeader from '@/components/common/PageHeader'
import RowActions from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { ReadOnlyMark, ScopeBadge } from '../components/ScopeBadge'
import { chapterDefaults, chapterSchema, friendlyDuplicate, toChapterPayload, type ChapterValues } from '../schemas/contentForms'
import { createChapter, deleteChapter, fetchChapters, fetchSubjects, ownTenantId, updateChapter, type Chapter } from '../services/contentLibraryService'

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

  const form = useForm<ChapterValues>({ resolver: zodResolver(chapterSchema), defaultValues: chapterDefaults(), mode: 'onTouched' })
  const [editing, setEditing] = useState<Chapter | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Chapter | null>(null)

  const openForm = (c: Chapter | null) => {
    setEditing(c)
    setFormError(null)
    form.reset(chapterDefaults(c, subjectFilter))
    setFormOpen(true)
  }

  const submit = async (v: ChapterValues) => {
    setFormError(null)
    try {
      if (editing) {
        await updateChapter(editing.id, toChapterPayload(v))
        toast.success('Chapter updated.')
      } else {
        const res = await createChapter(toChapterPayload(v))
        const id: number | undefined = res.data?.data?.id
        toast.success(`Chapter “${v.name.trim()}” added.`, id ? { action: { label: 'Add topics', onClick: () => navigate(chapterRoute(id)) } } : undefined)
      }
      setFormOpen(false)
      list.reload()
    } catch (err) {
      console.error(editing ? 'Error updating chapter:' : 'Error creating chapter:', err)
      setFormError(applyServerErrors(err, form.setError, ['subject_id', 'name'], { fallback: editing ? 'Failed to update chapter.' : 'Failed to create chapter.' }))
      const nameErr = form.getFieldState('name').error?.message
      if (nameErr) form.setError('name', { type: 'server', message: friendlyDuplicate(nameErr, 'chapter') })
    }
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
        <Link to={chapterRoute(row.original.id)} className="tw:group tw:inline-flex tw:items-center tw:gap-1 tw:font-medium tw:text-foreground tw:no-underline tw:hover:text-primary">
          {row.original.name}
          <ChevronRight className="tw:size-3.5 tw:opacity-0 tw:transition-opacity tw:group-hover:opacity-100" aria-hidden="true" />
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
          <Link to={chapterRoute(row.original.id)} className="tw:text-sm tw:font-medium tw:text-primary tw:no-underline tw:hover:underline">
            {n} topic{n === 1 ? '' : 's'}
          </Link>
        )
      },
    },
    {
      id: 'actions',
      header: () => <span className="tw:sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) =>
        canManage(row.original) ? (
          <RowActions name={row.original.name} onEdit={() => openForm(row.original)} onDelete={() => setDeleting(row.original)} />
        ) : (
          <div className="tw:flex tw:justify-end">
            <ReadOnlyMark what="chapter" />
          </div>
        ),
    },
  ]

  const custom = chapters.filter((c) => c.tenant_id !== 0).length

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader
        title="Chapters"
        description="Group topics into chapters for each subject. Base chapters are shared; you can add your own."
        className="tw:mb-0"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" /> Add Chapter
          </Button>
        }
      />

      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
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
            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
              <NativeSelect aria-label="Subject" className="tw:w-full tw:sm:w-48" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="">All subjects</option>
                {(subjects.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject}
                  </option>
                ))}
              </NativeSelect>
              {!list.loading && (
                <span className="tw:text-xs tw:text-muted-foreground">
                  {chapters.length} chapters · {custom} custom
                </span>
              )}
            </div>
          }
        />
      </Card>

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Chapter' : 'Add Chapter'}
        description={editing ? undefined : 'Chapters belong to one subject. Add topics to it afterwards.'}
        form={form}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Save'}
        submittingLabel={editing ? 'Updating...' : 'Saving...'}
        error={formError}
      >
        <FormField
          control={form.control}
          name="subject_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Subject</FormLabel>
              <FormControl>
                <NativeSelect {...field} disabled={subjects.loading}>
                  <option value="">{subjects.loading ? 'Loading…' : 'Select subject'}</option>
                  {(subjects.data ?? []).map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.subject}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              {editing && <FormDescription>Changing the subject only affects the chapter itself — topics already added stay assigned.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Chapter name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Rational And Irrational Numbers" autoComplete="off" maxLength={255} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>

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
