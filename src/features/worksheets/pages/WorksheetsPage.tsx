import { useMemo, useState } from 'react'
import { FileStack, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { ROLES } from '@/constants/roles'
import { fetchSubjectsAndClasses } from '@/features/assessments/services/assessmentsService'
import { useAsync } from '@/hooks/useAsync'
import { usePermission } from '@/permissions'
import { formatDate } from '@/utils/date'
import PrintWorksheetDialog from '../components/PrintWorksheetDialog'
import WorksheetEditorDialog from '../components/WorksheetEditorDialog'
import WorksheetFormDialog from '../components/WorksheetFormDialog'
import { deleteWorksheet, fetchWorksheets, type Worksheet, type WorksheetSummary } from '../services/worksheetsService'

/**
 * Printable practice worksheets. Route gate: worksheets.manage | teacher.
 * Teachers see their own; coaching admins / staff the whole institute's.
 */
export default function WorksheetsPage() {
  const { hasRole } = usePermission()
  const isTeacher = hasRole(ROLES.TEACHER)

  const list = useAsync(() => fetchWorksheets(), [])
  const catalog = useAsync(() => fetchSubjectsAndClasses().catch(() => ({ subjects: [], classes: [] })), [])
  const [local, setLocal] = useState<Record<number, WorksheetSummary | null>>({})
  const [syncedFor, setSyncedFor] = useState<unknown>(null)
  if (list.data !== syncedFor) {
    setSyncedFor(list.data)
    setLocal({})
  }
  const worksheets = useMemo(() => {
    const fromServer = (list.data ?? []).map((w) => (w.id in local ? local[w.id] : w)).filter((w): w is WorksheetSummary => !!w)
    const created = Object.values(local).filter((w): w is WorksheetSummary => !!w && !(list.data ?? []).some((x) => x.id === w.id))
    return [...created.sort((a, b) => b.id - a.id), ...fromServer]
  }, [list.data, local])

  const [subjectFilter, setSubjectFilter] = useState('')
  const shown = worksheets.filter((w) => !subjectFilter || String(w.subject?.id) === subjectFilter)

  const [formFor, setFormFor] = useState<Worksheet | 'new' | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [printFor, setPrintFor] = useState<WorksheetSummary | null>(null)
  const [deleteFor, setDeleteFor] = useState<WorksheetSummary | null>(null)
  const remember = (w: WorksheetSummary) => setLocal((m) => ({ ...m, [w.id]: w }))

  const columns: ColumnDef<WorksheetSummary, unknown>[] = [
    {
      id: 'title',
      header: 'Worksheet',
      accessorFn: (w) => w.title,
      cell: ({ row }) => {
        const w = row.original
        return (
          <div className="flex max-w-sm flex-col gap-0.5">
            <span className="font-medium text-foreground">{w.title}</span>
            <span className="truncate text-xs text-muted-foreground">{w.topics.map((t) => t.name).join(', ')}</span>
          </div>
        )
      },
    },
    { id: 'subject', header: 'Subject', accessorFn: (w) => w.subject?.subject ?? '', cell: ({ row }) => (row.original.subject ? <Badge variant="soft">{row.original.subject.subject}</Badge> : '-') },
    { id: 'class', header: 'Class', accessorFn: (w) => w.class?.name ?? '', cell: ({ row }) => row.original.class?.name ?? <span className="text-muted-foreground">Any</span> },
    {
      id: 'questions',
      header: 'Questions',
      accessorFn: (w) => w.questions_count,
      cell: ({ row }) => <span className={row.original.questions_count ? 'tabular-nums' : 'text-warning'}>{row.original.questions_count}</span>,
    },
    ...(!isTeacher ? [{ id: 'by', header: 'Created by', accessorFn: (w: WorksheetSummary) => w.created_by?.name ?? '' } as ColumnDef<WorksheetSummary, unknown>] : []),
    { id: 'updated', header: 'Updated', accessorFn: (w) => w.updated_at, cell: ({ row }) => formatDate(row.original.updated_at) },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const w = row.original
        return (
          <div className="flex items-center justify-end gap-0.5">
            <IconAction label={`Edit questions of ${w.title}`} onClick={() => setEditId(w.id)}>
              <Pencil aria-hidden="true" />
            </IconAction>
            <IconAction label={`Print ${w.title}`} onClick={() => (w.questions_count ? setPrintFor(w) : toast.error('Add at least one question before printing.'))}>
              <Printer aria-hidden="true" />
            </IconAction>
            <IconAction label={`Delete ${w.title}`} destructive onClick={() => setDeleteFor(w)}>
              <Trash2 aria-hidden="true" />
            </IconAction>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Worksheets"
        description="Build practice sheets from the question bank and print them for students — with an answer key and optional Set A / Set B."
        className="mb-0"
        actions={
          <Button onClick={() => setFormFor('new')}>
            <Plus aria-hidden="true" /> New worksheet
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <DataTable
          columns={columns}
          data={shown}
          loading={list.loading && worksheets.length === 0}
          getRowId={(w) => String(w.id)}
          searchPlaceholder="Search worksheets"
          emptyIcon={FileStack}
          emptyTitle={list.error ? 'Could not load worksheets.' : 'No worksheets yet.'}
          emptyAction={
            <Button size="sm" variant="soft" onClick={() => setFormFor('new')}>
              <Plus aria-hidden="true" /> Create the first one
            </Button>
          }
          pageSize={25}
          toolbar={
            <NativeSelect aria-label="Subject" className="w-full sm:w-44" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="">All subjects</option>
              {(catalog.data?.subjects ?? []).map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.subject}
                </option>
              ))}
            </NativeSelect>
          }
        />
      </Card>

      <WorksheetFormDialog
        open={formFor !== null}
        worksheet={formFor === 'new' ? null : formFor}
        subjects={catalog.data?.subjects ?? []}
        classes={catalog.data?.classes ?? []}
        loading={catalog.loading}
        onClose={() => setFormFor(null)}
        onSaved={({ data, note }, mode) => {
          remember(data)
          if (mode === 'create') {
            if (note) toast.warning(note)
            else toast.success(`“${data.title}” created with ${data.questions_count} ${data.questions_count === 1 ? 'question' : 'questions'}.`)
            setEditId(data.id)
          } else {
            toast.success('Details saved.')
          }
        }}
      />
      <WorksheetEditorDialog
        worksheetId={editId}
        onClose={() => setEditId(null)}
        onChanged={remember}
        onEditDetails={(w) => setFormFor(w)}
        onPrint={(w) => setPrintFor(w)}
      />
      <PrintWorksheetDialog worksheet={printFor} onClose={() => setPrintFor(null)} />

      <ConfirmDialog
        open={!!deleteFor}
        onOpenChange={(o) => !o && setDeleteFor(null)}
        title="Delete this worksheet?"
        description={
          <>
            <strong>{deleteFor?.title}</strong> will be removed. The questions stay in the question bank.
          </>
        }
        confirmLabel="Yes, delete"
        cancelLabel="No"
        destructive
        onConfirm={async () => {
          const w = deleteFor!
          try {
            await deleteWorksheet(w.id)
            setLocal((m) => ({ ...m, [w.id]: null }))
            toast.success(`“${w.title}” deleted.`)
          } catch (err) {
            toast.error('Failed to delete the worksheet.')
            throw err
          }
        }}
      />
    </div>
  )
}
