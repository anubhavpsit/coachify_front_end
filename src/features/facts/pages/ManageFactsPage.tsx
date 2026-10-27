import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ImageIcon, Lightbulb, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime } from '@/utils/date'
import FactFormDialog from '../components/FactFormDialog'
import {
  absoluteUrl,
  deleteFact,
  fetchAiFactsSetting,
  fetchClassOptions,
  fetchManagedFacts,
  updateAiFactsSetting,
  updateFact,
  type AiFactsSetting,
  type Fact,
} from '../services/factsService'

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
  // AI facts switch: null = not changed on this page yet (show what the API said)
  const aiSetting = useAsync(() => fetchAiFactsSetting(), [])
  const [aiOverride, setAiOverride] = useState<AiFactsSetting | null>(null)
  const [aiSaving, setAiSaving] = useState(false)
  const ai = aiOverride ?? aiSetting.data ?? { students: false, teachers: false }

  const setAi = async (key: keyof AiFactsSetting, value: boolean) => {
    setAiSaving(true)
    try {
      const r = await updateAiFactsSetting({ ...ai, [key]: value })
      setAiOverride(r.setting)
      toast.success(r.message)
      list.reload()
    } catch (err) {
      console.error('Error updating AI facts setting:', err)
      toast.error('Could not change the AI facts setting.')
    } finally {
      setAiSaving(false)
    }
  }

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
          <div className="flex max-w-md items-center gap-3">
            {f.image_url ? (
              <img src={absoluteUrl(f.image_url)} alt="" className="size-10 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                {f.content_type === 'image' ? <ImageIcon className="size-4" aria-hidden="true" /> : <Lightbulb className="size-4" aria-hidden="true" />}
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{f.title}</span>
              {(f.tags ?? []).length > 0 && <span className="truncate text-xs text-muted-foreground">{(f.tags ?? []).map((t) => `#${t}`).join(' ')}</span>}
            </div>
          </div>
        )
      },
    },
    { id: 'type', header: 'Type', accessorFn: (f) => f.content_type, cell: ({ row }) => <span className="capitalize">{row.original.content_type}</span> },
    {
      id: 'audience',
      header: 'Audience',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original.target_roles ?? []
        return r.length ? <span className="text-sm capitalize">{r.join(', ')}</span> : <span className="text-muted-foreground">Everyone</span>
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (f) => (f.is_published ? 'Published' : 'Draft'),
      cell: ({ row }) => {
        const f = row.original
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant={f.is_published ? 'success' : 'secondary'}>{f.is_published ? 'Published' : 'Draft'}</Badge>
            {f.publish_at && <span className="text-xs text-muted-foreground">{formatDateTime(f.publish_at)}</span>}
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
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const f = row.original
        if (!own(f)) return <Badge variant="soft">{f.origin === 'ai_activity' ? 'AI fact' : 'Featured'}</Badge>
        return (
          <div className="flex items-center justify-end gap-0.5">
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manage Facts"
        description="Short facts that appear in your students' and teachers' Facts feed."
        className="mb-0"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/facts">View feed</Link>
            </Button>
            <Button onClick={() => openForm(null)}>
              <Plus aria-hidden="true" /> Create Fact
            </Button>
          </div>
        }
      />

      <Card className="py-4">
        <CardContent className="flex flex-wrap items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold">AI facts from what you teach</span>
            <span className="text-xs text-muted-foreground">
              Short &ldquo;Did you know?&rdquo; facts and step-by-step solved questions on the topics your teachers log in daily activity. Every fact is reviewed
              before it appears, and each student only sees facts for their own class.
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            {(['students', 'teachers'] as const).map((k) => (
              <label key={k} className="m-0 flex items-center gap-2 text-sm font-medium capitalize">
                <Switch aria-label={`AI facts for ${k}`} checked={ai[k]} disabled={aiSetting.loading || aiSaving} onCheckedChange={(v) => setAi(k, v)} />
                {k}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {list.error ? (
        <ErrorState title="Unable to load facts" onRetry={list.reload} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
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
            toolbar={<Input type="search" aria-label="Search facts" placeholder="Search facts (server)" className="w-full sm:w-64" value={search} onChange={(e) => setSearch(e.target.value)} />}
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
