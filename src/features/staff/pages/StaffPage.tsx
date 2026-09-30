import { useMemo, useState } from 'react'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, Plus, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import UserProfileModal from '@/features/people/profile/UserProfileDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import FormDialog from '@/components/common/FormDialog'
import PageHeader from '@/components/common/PageHeader'
import RowActions, { IconAction } from '@/components/common/RowActions'
import UserAvatar from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import PersonFields from '@/features/people/components/PersonFields'
import { PERSON_FIELDS, type PersonBase } from '@/features/people/schemas/person'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { PERMISSIONS as P, usePermission } from '@/permissions'
import PermissionPicker from '../components/PermissionPicker'
import { staffDefaults, staffSchema, toStaffPayload, type StaffValues } from '../schemas/staffForm'
import {
  createStaff,
  deleteStaff,
  fetchPermissionCatalog,
  fetchStaff,
  fetchStaffPermissions,
  updateStaff,
  type Staff,
} from '../services/staffService'

const MAX_BADGES = 4

/** Route gate: staff.manage. Edit/Delete/avatar edit: can('staff.manage') — unchanged. */
export default function StaffPage() {
  const { can } = usePermission()
  const canManage = can(P.STAFF_MANAGE)
  const list = useAsync(fetchStaff, [])
  const catalog = useAsync(fetchPermissionCatalog, [])
  const groups = useMemo(() => catalog.data ?? [], [catalog.data])
  const [local, setLocal] = useState<Staff[] | null>(null)
  const staff = local ?? list.data ?? []

  const permissionLabels = useMemo(() => {
    const map: Record<string, string> = {}
    groups.forEach((g) => g.permissions.forEach((p) => (map[p.key] = p.label)))
    return map
  }, [groups])

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<Staff | null>(null)
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Staff | null>(null)
  const [viewUserId, setViewUserId] = useState<number | null>(null)
  const schema = useMemo(() => staffSchema(mode), [mode])
  const form = useForm<StaffValues>({ resolver: zodResolver(schema), defaultValues: staffDefaults(null), mode: 'onTouched' })

  const openForm = async (member: Staff | null) => {
    setMode(member ? 'edit' : 'create')
    setEditing(member)
    setFormError(null)
    form.reset(staffDefaults(member))
    setOpen(true)
    if (member) {
      // Pull the authoritative set in case the list row is stale (legacy behaviour).
      try {
        const perms = await fetchStaffPermissions(member.id)
        if (perms) form.setValue('permissions', perms)
      } catch (error) {
        console.error('Error fetching staff permissions:', error)
      }
    }
  }

  const submit = async (values: StaffValues) => {
    setFormError(null)
    try {
      const payload = toStaffPayload(values, mode)
      if (mode === 'create') {
        const created = await createStaff(payload)
        if (!created) return
        setLocal([...staff, created])
        toast.success(`${created.name} added.`)
      } else if (editing) {
        if (!(await updateStaff(editing.id, payload))) return
        setLocal(staff.map((s) => (s.id === editing.id ? { ...s, name: values.name, email: values.email, dob: values.dob, gender: values.gender, permissions: values.permissions } : s)))
        toast.success(`${values.name} updated.`)
      }
      setOpen(false)
    } catch (error) {
      console.error(mode === 'create' ? 'Error adding staff:' : 'Error updating staff:', error)
      setFormError(
        applyServerErrors(error, form.setError, [...PERSON_FIELDS, 'permissions'], {
          fallback: mode === 'create' ? 'Failed to save staff member.' : 'Failed to update staff member.',
        }),
      )
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await deleteStaff(deleting.id)
      setLocal(staff.filter((s) => s.id !== deleting.id))
      toast.success(`${deleting.name} deleted.`)
    } catch (error) {
      console.error('Error deleting staff:', error)
      toast.error('Failed to delete staff member.')
      throw error
    }
  }

  const columns: ColumnDef<Staff, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setViewUserId(row.original.id)}
          title="View profile"
          className="tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-3 tw:border-0 tw:bg-transparent tw:p-0 tw:text-left tw:outline-none tw:hover:underline tw:focus-visible:underline"
        >
          <UserAvatar name={row.original.name} className="tw:size-8" toneClassName="tw:bg-success-soft tw:text-success" />
          <span className="tw:font-medium tw:text-foreground">{row.original.name}</span>
        </button>
      ),
    },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => <span className="tw:text-muted-foreground">{row.original.email}</span> },
    {
      id: 'permissions',
      header: 'Permissions',
      enableSorting: false,
      accessorFn: (s) => (s.permissions ?? []).map((k) => permissionLabels[k] ?? k).join(' '),
      cell: ({ row }) => {
        const keys = row.original.permissions ?? []
        if (keys.length === 0) return <span className="tw:text-sm tw:text-muted-foreground">No permissions</span>
        return (
          <div className="tw:flex tw:max-w-md tw:flex-wrap tw:gap-1 tw:whitespace-normal">
            {keys.slice(0, MAX_BADGES).map((key) => (
              <Badge key={key} variant="soft" title={key}>
                {permissionLabels[key] ?? key}
              </Badge>
            ))}
            {keys.length > MAX_BADGES && (
              <Badge variant="outline" title={keys.slice(MAX_BADGES).map((k) => permissionLabels[k] ?? k).join(', ')}>
                +{keys.length - MAX_BADGES} more
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: () => <span className="tw:sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <div className="tw:flex tw:items-center tw:justify-end tw:gap-1">
          <IconAction label={`View ${row.original.name}`} onClick={() => setViewUserId(row.original.id)}>
            <Eye aria-hidden="true" />
          </IconAction>
          {canManage && <RowActions name={row.original.name} onEdit={() => void openForm(row.original)} onDelete={() => setDeleting(row.original)} />}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Office and support staff, and what each of them can access."
        actions={
          <Button onClick={() => void openForm(null)}>
            <Plus aria-hidden="true" />
            Add New Staff
          </Button>
        }
      />
      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
        <DataTable
          columns={columns}
          data={staff}
          loading={list.loading && staff.length === 0}
          getRowId={(s) => String(s.id)}
          searchPlaceholder="Search staff"
          emptyIcon={UserCog}
          emptyTitle="No staff members found."
          pageSize={25}
        />
      </Card>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'edit' ? 'Edit Staff' : 'Add New Staff'}
        form={form}
        onSubmit={submit}
        submitLabel={mode === 'edit' ? 'Update' : 'Save'}
        submittingLabel={mode === 'edit' ? 'Updating...' : 'Saving...'}
        error={formError}
        className="tw:sm:max-w-2xl"
      >
        <PersonFields control={form.control as unknown as Control<PersonBase>} mode={mode} />
        <FormField
          control={form.control}
          name="permissions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permissions</FormLabel>
              <PermissionPicker groups={groups} selected={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete staff member?"
        description={deleting ? `Are you sure you want to delete ${deleting.name}?` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />

      <UserProfileModal show={viewUserId !== null} onHide={() => setViewUserId(null)} userId={viewUserId} canEditImage={canManage} />
    </div>
  )
}
