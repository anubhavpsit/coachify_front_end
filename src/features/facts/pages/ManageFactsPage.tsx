import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ImageIcon, Lightbulb, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime } from '@/utils/date'
import FactFormDialog from '../components/FactFormDialog'
import { absoluteUrl, deleteFact, fetchClassOptions, fetchManagedFacts, updateFact, type Fact } from '../services/factsService'

/**
 * Route gate: facts.manage (unchanged). The list API also requires role
 * coaching_admin. Edit / delete / (de)activate only on this coaching's own
 * facts — shared (Featured) facts can't be changed here (the API 404s).
 */
export default function ManageFactsPage() {
  const tenantId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('authUser') || '{}')
      return Number(u?.tenant_id ?? u?.tenantId ?? localStorage.getItem('tenant_id') ?? 0)
    } catch {
      return 0
    }
  })()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 300)
    return () => window.clearTimeout(t)
  }, [search])
  const list = useAsync(() => fetchManagedFacts(debounced), [debounced])
  const classes = useAsync(() => fetchClassOptions().catch(() => []), [])
  const [editing, setEditing] = useState<Fact | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'toggle'; fact: Fact } | null>(null)

  const own = (f: Fact) => f.tenant_id === undefined || f.tenant_id === tenantId
  const openForm = (f: Fact | null) => {
    setEditing(f)
    setFormOpen(true)
  }

  const runConfirm = async () => {
    const { kind, fact } = confirm!
    try {
      if (kind === 'delete') {
        await deleteFact(fact.id)
        toast.success('Fact deleted.')
      } else {
        await updateFact(fact.id, { is_active: !(fact.is_active ?? true) })
        toast.success(fact.is_active ? 'Fact deactivated.' : 'Fact activated.')
      }
      list.reload()
    } catch (err) {
      console.error('Error updating fact:', err)
      toast.error(kind === 'delete' ? 'Failed to delete fact.' : 'Failed to update fact.')
      throw err
    }
  }

  const columns: ColumnDef<Fact, unknown>[] = [
    {
      id: 'title',
      header: 'Fact',
      accessorFn: (f) => f.title,
      cell: ({ row }) => {
        const f = row.original
        return (
          <div className="tw:flex tw:max-w-md tw:items-center tw:gap-3">
            {f.image_url ? (
              <img src={absoluteUrl(f.image_url)} alt="" className="tw:size-10 tw:shrink-0 tw:rounded-md tw:object-cover" />
            ) : (
              <span className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-md tw:bg-primary-soft tw:text-primary">
                {f.content_type === 'image' ? <ImageIcon className="tw:size-4" aria-hidden="true" /> : <Lightbulb className="tw:size-4" aria-hidden="true" />}
              </span>
            )}
            <div className="tw:flex tw:min-w-0 tw:flex-col">
              <span className="tw:truncate tw:font-medium tw:text-foreground">{f.title}</span>
              {(f.tags ?? []).length > 0 && <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{(f.tags ?? []).map((t) => `#${t}`).join(' ')}</span>}
            </div>
          </div>
        )
      },
    },
    { id: 'type', header: 'Type', accessorFn: (f) => f.content_type, cell: ({ row }) => <span className="tw:capitalize">{row.original.content_type}</span> },
    {
      id: 'audience',
      header: 'Audience',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original.target_roles ?? []
        return r.length ? <span className="tw:text-sm tw:capitalize">{r.join(', ')}</span> : <span className="tw:text-muted-foreground">Everyone</span>
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (f) => (f.is_published ? 'Published' : 'Draft'),
      cell: ({ row }) => {
        const f = row.original
        return (
          <div className="tw:flex tw:flex-col tw:items-start tw:gap-0.5">
            <Badge variant={f.is_published ? 'success' : 'secondary'}>{f.is_published ? 'Published' : 'Draft'}</Badge>
            {f.publish_at && <span className="tw:text-xs tw:text-muted-foreground">{formatDateTime(f.publish_at)}</span>}
          </div>
        )
      },
    },
    {
      id: 'active',
      header: 'Active',
      accessorFn: (f) => (f.is_active ? 1 : 0),
      cell: ({ row }) => <Badge variant={row.original.is_active ? 'success' : 'warning'}>{row.original.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      id: 'actions',
      header: () => <span className="tw:sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const f = row.original
        if (!own(f)) return <Badge variant="soft">Featured</Badge>
        return (
          <div className="tw:flex tw:items-center tw:justify-end tw:gap-0.5">
            <IconAction label={`Edit ${f.title}`} onClick={() => openForm(f)}>
              <Pencil aria-hidden="true" />
            </IconAction>
            <IconAction label={`${f.is_active ? 'Deactivate' : 'Activate'} ${f.title}`} onClick={() => setConfirm({ kind: 'toggle', fact: f })}>
              {f.is_active ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </IconAction>
            <IconAction label={`Delete ${f.title}`} onClick={() => setConfirm({ kind: 'delete', fact: f })} destructive>
              <Trash2 aria-hidden="true" />
            </IconAction>
          </div>
        )
      },
    },
  ]

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader
        title="Manage Facts"
        description="Short facts that appear in your students' and teachers' Facts feed."
        className="tw:mb-0"
        actions={
          <div className="tw:flex tw:gap-2">
            <Button variant="outline" asChild>
              <Link to="/facts">View feed</Link>
            </Button>
            <Button onClick={() => openForm(null)}>
              <Plus aria-hidden="true" /> Create Fact
            </Button>
          </div>
        }
      />

      {list.error ? (
        <ErrorState title="Unable to load facts" onRetry={list.reload} />
      ) : (
        <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
          <DataTable
            columns={columns}
            data={list.data ?? []}
            loading={list.loading && !list.data}
            getRowId={(f) => String(f.id)}
            emptyIcon={Lightbulb}
            emptyTitle={debounced ? 'No facts match your search.' : 'No facts yet.'}
            emptyAction={
              <Button size="sm" variant="soft" onClick={() => openForm(null)}>
                <Plus aria-hidden="true" /> Create the first fact
              </Button>
            }
            pageSize={25}
            toolbar={<Input type="search" aria-label="Search facts" placeholder="Search facts (server)" className="tw:w-full tw:sm:w-64" value={search} onChange={(e) => setSearch(e.target.value)} />}
          />
        </Card>
      )}

      <FactFormDialog open={formOpen} onClose={() => setFormOpen(false)} fact={editing} classes={classes.data ?? []} onSaved={list.reload} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'delete' ? 'Delete this fact?' : confirm?.fact.is_active ? 'Deactivate this fact?' : 'Activate this fact?'}
        description={
          confirm?.kind === 'delete' ? (
            <>
              <strong>{confirm.fact.title}</strong> will be deleted. Likes and saves on it are lost.
            </>
          ) : confirm?.fact.is_active ? (
            <>
              <strong>{confirm.fact.title}</strong> will be hidden from the feed until you activate it again.
            </>
          ) : (
            <>
              <strong>{confirm?.fact.title}</strong> will show in the feed again (if it is published).
            </>
          )
        }
        confirmLabel={confirm?.kind === 'delete' ? 'Yes, delete' : 'Yes'}
        cancelLabel="No"
        destructive={confirm?.kind === 'delete' || !!confirm?.fact.is_active}
        onConfirm={runConfirm}
      />
    </div>
  )
}
