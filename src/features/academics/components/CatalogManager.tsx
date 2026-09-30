import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import FormDialog from '@/components/common/FormDialog'
import PageHeader from '@/components/common/PageHeader'
import RowActions from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { requiredText } from '@/lib/validation'

type Update<T> = (prev: T[]) => T[]

/** How a catalog talks to its API. Mutations return a local list update, or 'reload' to refetch. */
export interface CatalogAdapter<T> {
  load: () => Promise<T[]>
  create: (name: string) => Promise<Update<T> | 'reload' | null>
  update: (item: T, name: string) => Promise<Update<T> | 'reload' | null>
  remove: (item: T) => Promise<Update<T> | 'reload'>
  idOf: (item: T) => number
  nameOf: (item: T) => string
  /** Global rows (tenant_id 0) are read-only for tenants — unchanged rule. */
  isGlobal: (item: T) => boolean
  /** API field name for 422 mapping (e.g. 'subject', 'name'). */
  apiField: string
}

interface Props<T> {
  adapter: CatalogAdapter<T>
  title: string
  description: string
  /** Singular noun: "subject", "class". */
  noun: string
  fieldLabel: string
  placeholder: string
  icon: LucideIcon
}

const nameSchema = (label: string) => z.object({ name: requiredText(label, 255) })

export default function CatalogManager<T>({ adapter, title, description, noun, fieldLabel, placeholder, icon }: Props<T>) {
  const [nonce, setNonce] = useState(0)
  const loaded = useAsync(adapter.load, [nonce])
  const [items, setItems] = useState<T[]>([])
  const [editing, setEditing] = useState<T | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  const schema = useMemo(() => nameSchema(fieldLabel), [fieldLabel])
  const form = useForm<{ name: string }>({ resolver: zodResolver(schema), defaultValues: { name: '' }, mode: 'onTouched' })
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1)

  // Mirror the fetched list locally so create/update/delete can patch it in place.
  const [synced, setSynced] = useState<T[] | undefined>(undefined)
  if (loaded.data !== synced) {
    setSynced(loaded.data)
    if (loaded.data) setItems(loaded.data)
  }
  useEffect(() => {
    if (loaded.error) console.error(`Error fetching ${noun} list:`, loaded.error)
  }, [loaded.error, noun])

  const apply = (result: Update<T> | 'reload' | null) => {
    if (result === 'reload') setNonce((n) => n + 1)
    else if (result) setItems(result)
  }

  const openForm = (item: T | null) => {
    setEditing(item)
    setFormError(null)
    form.reset({ name: item ? adapter.nameOf(item) : '' })
    setFormOpen(true)
  }

  const submit = async ({ name }: { name: string }) => {
    setFormError(null)
    try {
      const result = editing ? await adapter.update(editing, name) : await adapter.create(name)
      if (result === null) return // API reported failure without an error (legacy: stay open)
      apply(result)
      toast.success(editing ? `${Noun} updated.` : `${Noun} added.`)
      setFormOpen(false)
    } catch (err) {
      console.error(`Error saving ${noun}:`, err)
      setFormError(applyServerErrors(err, form.setError, ['name'], { fieldMap: { [adapter.apiField]: 'name' }, fallback: `Failed to save ${noun}.` }))
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      apply(await adapter.remove(deleting))
      toast.success(`${Noun} deleted.`)
    } catch (err) {
      console.error(`Error deleting ${noun}:`, err)
      toast.error(`Failed to delete ${noun}.`)
      throw err
    }
  }

  const columns: ColumnDef<T, unknown>[] = [
    {
      id: 'name',
      header: Noun,
      accessorFn: (row) => adapter.nameOf(row),
      cell: ({ row }) => <span className="tw:font-medium tw:text-foreground">{adapter.nameOf(row.original)}</span>,
    },
    {
      id: 'scope',
      header: 'Type',
      accessorFn: (row) => (adapter.isGlobal(row) ? 'Default' : 'Custom'),
      cell: ({ row }) =>
        adapter.isGlobal(row.original) ? (
          <Badge variant="success" title="Provided for every coaching; read-only">
            Default
          </Badge>
        ) : (
          <Badge variant="warning" title="Added by your coaching">
            Custom
          </Badge>
        ),
    },
    {
      id: 'actions',
      header: () => <span className="tw:sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) =>
        adapter.isGlobal(row.original) ? null : (
          <RowActions name={adapter.nameOf(row.original)} onEdit={() => openForm(row.original)} onDelete={() => setDeleting(row.original)} />
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" />
            Add New {Noun}
          </Button>
        }
      />
      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
        <DataTable
          columns={columns}
          data={items}
          loading={loaded.loading && items.length === 0}
          getRowId={(row) => String(adapter.idOf(row))}
          searchPlaceholder={`Search ${noun === 'class' ? 'classes' : `${noun}s`}`}
          emptyIcon={icon}
          emptyTitle={`No ${noun === 'class' ? 'classes' : `${noun}s`} found.`}
          emptyAction={
            <Button size="sm" variant="soft" onClick={() => openForm(null)}>
              <Plus aria-hidden="true" />
              Add the first one
            </Button>
          }
          pageSize={25}
        />
      </Card>

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${Noun}` : `Add New ${Noun}`}
        form={form}
        onSubmit={submit}
        submitLabel={editing ? 'Update' : 'Save'}
        submittingLabel={editing ? 'Updating...' : 'Saving...'}
        error={formError}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{fieldLabel}</FormLabel>
              <FormControl>
                <Input placeholder={placeholder} autoComplete="off" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${noun}?`}
        description={deleting ? `Are you sure you want to delete the ${noun}: “${adapter.nameOf(deleting)}”?` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  )
}
