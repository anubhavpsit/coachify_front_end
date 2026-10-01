import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ListChecks, MessageCircleQuestion, Plus } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import FormDialog from '@/components/common/FormDialog'
import PageHeader from '@/components/common/PageHeader'
import RichTextEditor from '@/components/common/RichTextEditor'
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
import { friendlyDuplicate, GRADES, toTopicPayload, topicDefaults, topicSchema, type TopicValues } from '../schemas/contentForms'
import { createTopic, deleteTopic, fetchChapters, fetchSubjects, fetchTopics, ownTenantId, updateTopic, type Topic } from '../services/contentLibraryService'

const questionsRoute = (id: number) => `/topics/${id}/questions`
const plainText = (html: string | null) => (html ? html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '')

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

  const form = useForm<TopicValues>({ resolver: zodResolver(topicSchema), defaultValues: topicDefaults(), mode: 'onTouched' })
  const formSubject = useWatch({ control: form.control, name: 'subject_id' })
  const formChapters = useAsync(() => fetchChapters(formSubject).catch((e) => (console.error('Error fetching chapters:', e), [])), [formSubject], { enabled: !!formSubject })
  const [editing, setEditing] = useState<Topic | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Topic | null>(null)

  const openForm = (t: Topic | null) => {
    setEditing(t)
    setFormError(null)
    // A new topic starts from the current filters, so adding several to one chapter is quick.
    form.reset(
      topicDefaults(t, {
        subject_id: subjectFilter,
        chapter_id: chapterFilter && chapterFilter !== 'none' ? chapterFilter : '',
        grade: gradeFilter && gradeFilter !== 'none' ? gradeFilter : '',
      }),
    )
    setFormOpen(true)
  }

  const submit = async (v: TopicValues) => {
    setFormError(null)
    try {
      if (editing) await updateTopic(editing.id, toTopicPayload(v))
      else await createTopic(toTopicPayload(v))
      toast.success(editing ? 'Topic updated.' : `Topic “${v.name.trim()}” added.`)
      setFormOpen(false)
      list.reload()
    } catch (err) {
      console.error(editing ? 'Error updating topic:' : 'Error creating topic:', err)
      setFormError(
        applyServerErrors(err, form.setError, ['subject_id', 'chapter_id', 'grade', 'name', 'explanation_html'], { fallback: editing ? 'Failed to update topic.' : 'Failed to create topic.' }),
      )
      const nameErr = form.getFieldState('name').error?.message
      if (nameErr) form.setError('name', { type: 'server', message: friendlyDuplicate(nameErr, 'topic') })
    }
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
          <div className="tw:flex tw:max-w-md tw:flex-col">
            <span className="tw:font-medium tw:text-foreground">{row.original.name}</span>
            {preview && <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{preview}</span>}
          </div>
        )
      },
    },
    { id: 'chapter', header: 'Chapter', accessorFn: (t) => t.chapter?.name ?? '', cell: ({ row }) => row.original.chapter?.name ?? <span className="tw:text-muted-foreground">-</span> },
    {
      id: 'grade',
      header: 'Grade',
      accessorFn: (t) => t.grade ?? 0,
      cell: ({ row }) => (row.original.grade ? `Grade ${row.original.grade}` : <span className="tw:text-muted-foreground">All</span>),
    },
    { id: 'subject', header: 'Subject', accessorFn: (t) => subjectName(t), cell: ({ row }) => <Badge variant="soft">{subjectName(row.original)}</Badge> },
    { id: 'type', header: 'Type', accessorFn: (t) => (t.tenant_id === 0 ? 'Base' : 'Custom'), cell: ({ row }) => <ScopeBadge base={row.original.tenant_id === 0} /> },
    {
      id: 'questions',
      header: 'Questions',
      enableSorting: false,
      cell: ({ row }) => (
        <Link to={questionsRoute(row.original.id)} className="tw:inline-flex tw:items-center tw:gap-1 tw:text-sm tw:font-medium tw:text-primary tw:no-underline tw:hover:underline">
          <MessageCircleQuestion className="tw:size-3.5" aria-hidden="true" /> Manage
        </Link>
      ),
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
            <ReadOnlyMark what="topic" />
          </div>
        ),
    },
  ]

  const filtersActive = !!(subjectFilter || chapterFilter || gradeFilter)

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader
        title="Topics"
        description="Topics are what teachers pick when they log a lesson. Base topics are shared; you can add your own."
        className="tw:mb-0"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" /> Add Topic
          </Button>
        }
      />

      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
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
            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
              <NativeSelect
                aria-label="Subject"
                className="tw:w-full tw:sm:w-40"
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
              <NativeSelect aria-label="Chapter" className="tw:w-full tw:sm:w-44" value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)}>
                <option value="">All chapters</option>
                <option value="none">No chapter</option>
                {(filterChapters.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect aria-label="Grade" className="tw:w-full tw:sm:w-40" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
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

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Topic' : 'Add Topic'}
        description={editing ? undefined : 'Teachers will be able to pick this topic when they log a lesson.'}
        form={form}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Save'}
        submittingLabel={editing ? 'Updating...' : 'Saving...'}
        error={formError}
        className="tw:sm:max-w-2xl"
      >
        <FormField
          control={form.control}
          name="subject_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Subject</FormLabel>
              <FormControl>
                <NativeSelect
                  {...field}
                  disabled={subjects.loading}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                    form.setValue('chapter_id', '') // chapters belong to a subject (legacy reset)
                  }}
                >
                  <option value="">{subjects.loading ? 'Loading…' : 'Select subject'}</option>
                  {(subjects.data ?? []).map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.subject}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
          <FormField
            control={form.control}
            name="chapter_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chapter</FormLabel>
                <FormControl>
                  <NativeSelect {...field} disabled={!formSubject || formChapters.loading}>
                    <option value="">{!formSubject ? 'Select a subject first' : formChapters.loading ? 'Loading…' : 'No chapter'}</option>
                    {formSubject &&
                      (formChapters.data ?? []).map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.name}
                        </option>
                      ))}
                  </NativeSelect>
                </FormControl>
                <FormDescription>Optional.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grade</FormLabel>
                <FormControl>
                  <NativeSelect {...field}>
                    <option value="">All grades (shared)</option>
                    {GRADES.map((g) => (
                      <option key={g} value={String(g)}>
                        Grade {g}
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <FormDescription>Leave as “All grades” unless it is grade-specific.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Topic name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Profit and Loss" autoComplete="off" maxLength={255} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="explanation_html"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Explanation</FormLabel>
              <FormControl>
                <RichTextEditor value={field.value} onChange={field.onChange} aria-invalid={!!fieldState.error} placeholder="Explain the topic for students (optional)." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>

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
