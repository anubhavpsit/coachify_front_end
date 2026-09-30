import { useMemo, useState } from 'react'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, Plus, Presentation } from 'lucide-react'
import { toast } from 'sonner'
import UserProfileModal from '@/features/people/profile/UserProfileDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import FormDialog from '@/components/common/FormDialog'
import PageHeader from '@/components/common/PageHeader'
import RowActions, { IconAction } from '@/components/common/RowActions'
import UserAvatar from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ROLES } from '@/constants/roles'
import PersonFields from '@/features/people/components/PersonFields'
import PhoneField from '@/features/people/components/PhoneField'
import { PERSON_FIELDS, type PersonBase } from '@/features/people/schemas/person'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { usePermission } from '@/permissions'
import { teacherDefaults, teacherSchema, toTeacherPayload, type TeacherValues } from '../schemas/teacherForm'
import { createTeacher, deleteTeacher, fetchTeachersFor, updateTeacher, type Teacher } from '../services/teachersService'

/**
 * Route gate: teachers.view | teachers.manage | role student.
 * In-page (unchanged): row actions only for tenant_id !== 0; Edit/Delete and
 * avatar editing only for role coaching_admin (Q5). "Add New Teacher" is not
 * gated in-page, as before (Q12 in PERMISSIONS_MAP).
 */
export default function TeachersPage() {
  const { role, hasRole } = usePermission()
  const isAdmin = hasRole(ROLES.COACHING_ADMIN)
  const list = useAsync(() => fetchTeachersFor(role), [role], { enabled: !!role })
  const [local, setLocal] = useState<Teacher[] | null>(null)
  const teachers = local ?? list.data ?? []

  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Teacher | null>(null)
  const [viewUserId, setViewUserId] = useState<number | null>(null)
  const schema = useMemo(() => teacherSchema(mode), [mode])
  const form = useForm<TeacherValues>({ resolver: zodResolver(schema), defaultValues: teacherDefaults(null), mode: 'onTouched' })

  const openForm = (t: Teacher | null) => {
    setMode(t ? 'edit' : 'create')
    setEditing(t)
    setFormError(null)
    form.reset(teacherDefaults(t))
    setOpen(true)
  }

  const submit = async (values: TeacherValues) => {
    setFormError(null)
    try {
      const payload = toTeacherPayload(values, mode)
      if (mode === 'create') {
        const created = await createTeacher(payload)
        if (!created) return
        setLocal([...teachers, created])
        toast.success(`${created.name} added.`)
      } else if (editing) {
        if (!(await updateTeacher(editing.id, payload))) return
        setLocal(teachers.map((t) => (t.id === editing.id ? { ...t, name: values.name, email: values.email, phone: payload.phone } : t)))
        toast.success(`${values.name} updated.`)
      }
      setOpen(false)
    } catch (error) {
      console.error(mode === 'create' ? 'Error adding teacher:' : 'Error updating teacher:', error)
      setFormError(
        applyServerErrors(error, form.setError, [...PERSON_FIELDS, 'phone'], { fallback: mode === 'create' ? 'Failed to save teacher.' : 'Failed to update teacher.' }),
      )
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await deleteTeacher(deleting.id)
      setLocal(teachers.filter((t) => t.id !== deleting.id))
      toast.success(`${deleting.name} deleted.`)
    } catch (error) {
      console.error('Error deleting teacher:', error)
      toast.error('Failed to delete teacher.')
      throw error
    }
  }

  const columns: ColumnDef<Teacher, unknown>[] = [
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
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) =>
        row.original.phone ? (
          <a href={`tel:${row.original.phone}`} className="tw:text-foreground tw:no-underline tw:hover:underline">
            {row.original.phone}
          </a>
        ) : (
          <span className="tw:text-muted-foreground">—</span>
        ),
    },
    {
      id: 'actions',
      header: () => <span className="tw:sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) =>
        row.original.tenant_id !== 0 && (
          <div className="tw:flex tw:items-center tw:justify-end tw:gap-1">
            <IconAction label={`View ${row.original.name}`} onClick={() => setViewUserId(row.original.id)}>
              <Eye aria-hidden="true" />
            </IconAction>
            {isAdmin && <RowActions name={row.original.name} onEdit={() => openForm(row.original)} onDelete={() => setDeleting(row.original)} />}
          </div>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Teachers"
        description={role === ROLES.STUDENT ? 'Teachers assigned to you.' : 'Everyone teaching at your coaching.'}
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" />
            Add New Teacher
          </Button>
        }
      />
      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
        <DataTable
          columns={columns}
          data={teachers}
          loading={(list.loading || !role) && teachers.length === 0}
          getRowId={(t) => String(t.id)}
          searchPlaceholder="Search teachers"
          emptyIcon={Presentation}
          emptyTitle="No teachers found."
          pageSize={25}
        />
      </Card>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'edit' ? 'Edit Teacher' : 'Add New Teacher'}
        form={form}
        onSubmit={submit}
        submitLabel={mode === 'edit' ? 'Update' : 'Save'}
        submittingLabel={mode === 'edit' ? 'Updating...' : 'Saving...'}
        error={formError}
        className="tw:sm:max-w-2xl"
      >
        <PersonFields control={form.control as unknown as Control<PersonBase>} mode={mode} afterEmail={<PhoneField control={form.control} name="phone" />} />
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete teacher?"
        description={deleting ? `Are you sure you want to delete ${deleting.name}?` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />

      <UserProfileModal show={viewUserId !== null} onHide={() => setViewUserId(null)} userId={viewUserId} canEditImage={isAdmin} />
    </div>
  )
}
