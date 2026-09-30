import { useState } from 'react'
import { ArrowUpCircle, Eye, GraduationCap, MoreVertical, Pencil, Plus, RotateCcw, Search, Trash2, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import UserProfileModal from '@/components/UserProfileModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import UserAvatar from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { ROLES } from '@/constants/roles'
import { formatDate } from '@/utils/date'
import AssignTeachersModal from '../components/AssignTeachersModal'
import { BulkPromoteDialog, PromoteDialog, ReactivateDialog } from '../components/StudentActionDialogs'
import StudentFormDialog from '../components/StudentFormDialog'
import { useStudentsData, type StatusFilter } from '../hooks/useStudentsData'
import { classLabelFor, filterStudents, subjectNamesFor } from '../lib/studentRows'
import { deleteStudent, type Student } from '../services/studentsService'

const FIELD = 'tw:m-0 tw:flex tw:flex-col tw:gap-1.5 tw:text-sm tw:font-medium tw:text-foreground'

/**
 * Route gate: students.view | students.manage | role teacher.
 * In-page (unchanged, Q4): Add, Bulk Promote, Status filter, Phone/Status
 * columns and the row menu are for role coaching_admin only; the row menu
 * also requires tenant_id !== 0. Everyone else gets "View".
 */
export default function StudentsPage() {
  const data = useStudentsData()
  const isAdmin = data.role === ROLES.COACHING_ADMIN
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState<number | ''>('')

  const [formFor, setFormFor] = useState<Student | null | undefined>(undefined) // undefined = closed, null = create
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [assignId, setAssignId] = useState<number | null>(null)
  const [promoting, setPromoting] = useState<Student | null>(null)
  const [reactivating, setReactivating] = useState<Student | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [viewUserId, setViewUserId] = useState<number | null>(null)

  const filtered = filterStudents(data.rows, search, classFilter)

  const remove = async () => {
    if (!deleting) return
    try {
      await deleteStudent(deleting.id)
      data.setRows((prev) => prev.filter((s) => s.id !== deleting.id))
      toast.success(`${deleting.name} deleted.`)
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student.')
      throw error
    }
  }

  const columns: ColumnDef<Student, unknown>[] = [
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
          <UserAvatar name={row.original.name} className="tw:size-8" toneClassName="tw:bg-info-soft tw:text-info" />
          <span className="tw:font-medium tw:text-foreground">{row.original.name}</span>
        </button>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="tw:inline-block tw:max-w-40 tw:truncate tw:align-middle tw:text-muted-foreground" title={row.original.email}>
          {row.original.email}
        </span>
      ),
    },
    { id: 'class', header: 'Class', accessorFn: (s) => classLabelFor(s, data.classes) },
    {
      id: 'subjects',
      header: 'Subjects',
      enableSorting: false,
      accessorFn: (s) => subjectNamesFor(s, data.subjects).join(', '),
      cell: ({ row }) => {
        const names = subjectNamesFor(row.original, data.subjects)
        if (names.length === 0) return <span className="tw:text-muted-foreground">-</span>
        return (
          <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-1" title={names.join(', ')}>
            {names.slice(0, 2).map((n) => (
              <Badge key={n} variant="secondary">
                {n}
              </Badge>
            ))}
            {names.length > 2 && <Badge variant="outline">+{names.length - 2}</Badge>}
          </span>
        )
      },
    },
    { id: 'added', header: 'Added On', accessorFn: (s) => s.created_at ?? '', cell: ({ row }) => formatDate(row.original.created_at) },
    ...(isAdmin
      ? ([
          {
            id: 'phone',
            header: 'Phone',
            accessorFn: (s) => s.student_profile?.phone || '',
            cell: ({ row }) => row.original.student_profile?.phone || <span className="tw:text-muted-foreground">-</span>,
          },
          {
            id: 'status',
            header: 'Status',
            accessorFn: (s) => (s.status === 'inactive' ? 'Inactive' : 'Active'),
            cell: ({ row }) =>
              row.original.status === 'inactive' ? <Badge variant="destructive">Inactive</Badge> : <Badge variant="success">Active</Badge>,
          },
        ] as ColumnDef<Student, unknown>[])
      : []),
    {
      id: 'actions',
      header: () => <span className="tw:sr-only">{isAdmin ? 'Actions' : 'Profile'}</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const s = row.original
        if (!isAdmin) {
          return (
            <IconAction label={`View ${s.name}`} onClick={() => setViewUserId(s.id)}>
              <Eye aria-hidden="true" />
            </IconAction>
          )
        }
        if (s.tenant_id === 0) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}>
                <MoreVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="tw:w-48">
              <DropdownMenuItem onSelect={() => setViewUserId(s.id)}>
                <Eye aria-hidden="true" /> View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFormFor(s)}>
                <Pencil aria-hidden="true" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAssignId(s.id)}>
                <UserPlus aria-hidden="true" /> Assign Teachers
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPromoting(s)}>
                <ArrowUpCircle aria-hidden="true" /> Promote
              </DropdownMenuItem>
              {s.status === 'inactive' && (
                <DropdownMenuItem onSelect={() => setReactivating(s)}>
                  <RotateCcw aria-hidden="true" /> Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(s)}>
                <Trash2 aria-hidden="true" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const hasLocalFilter = !!search || classFilter !== ''

  return (
    <div>
      <PageHeader
        title="Students"
        description="Showing students enrolled in the selected year."
        actions={
          isAdmin && (
            <>
              <Button variant="outline" onClick={() => setBulkOpen(true)}>
                <ArrowUpCircle aria-hidden="true" />
                Bulk Promote
              </Button>
              <Button onClick={() => setFormFor(null)}>
                <Plus aria-hidden="true" />
                Add New Student
              </Button>
            </>
          )
        }
      />

      <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
        <DataTable
          columns={columns}
          data={filtered}
          loading={data.loading && data.rows.length === 0}
          getRowId={(s) => String(s.id)}
          emptyIcon={GraduationCap}
          emptyTitle="No students found."
          pageSize={25}
          toolbar={
            <div className="tw:grid tw:w-full tw:grid-cols-1 tw:items-end tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
              <label className={FIELD}>
                Search by Name
                <span className="tw:relative">
                  <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
                  <Input type="search" placeholder="Student name..." value={search} onChange={(e) => setSearch(e.target.value)} className="tw:pl-9" />
                </span>
              </label>
              <label className={FIELD}>
                Class
                <NativeSelect value={classFilter} onChange={(e) => setClassFilter(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">All Classes</option>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className={FIELD}>
                Academic Year
                <NativeSelect value={data.yearId} onChange={(e) => data.setYearId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">All Years</option>
                  {data.years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                      {y.is_current ? ' (current)' : ''}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              {isAdmin ? (
                <label className={FIELD}>
                  Status
                  <NativeSelect value={data.status} onChange={(e) => data.setStatus(e.target.value as StatusFilter)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="all">All</option>
                  </NativeSelect>
                </label>
              ) : (
                <span className="tw:hidden tw:lg:block" />
              )}
              <div className="tw:flex tw:items-center tw:gap-2 tw:pb-2 tw:text-sm tw:text-muted-foreground">
                {hasLocalFilter && (
                  <>
                    <span className="tw:whitespace-nowrap">
                      {filtered.length} of {data.rows.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch('')
                        setClassFilter('')
                      }}
                    >
                      <X aria-hidden="true" />
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
        />
      </Card>

      {formFor !== undefined && (
        <StudentFormDialog
          open
          student={formFor}
          classes={data.classes}
          subjects={data.subjects}
          onClose={() => setFormFor(undefined)}
          onSaved={(saved, mode) => data.setRows((prev) => (mode === 'create' ? [saved, ...prev] : prev.map((s) => (s.id === saved.id ? saved : s))))}
        />
      )}

      {assignId !== null && <AssignTeachersModal show studentId={assignId} onHide={() => setAssignId(null)} onAssigned={() => undefined} />}

      {promoting && <PromoteDialog student={promoting} years={data.years} classes={data.classes} onClose={() => setPromoting(null)} onDone={data.reload} />}

      {reactivating && (
        <ReactivateDialog
          student={reactivating}
          years={data.years}
          classes={data.classes}
          onClose={() => setReactivating(null)}
          onDone={(status) =>
            data.setRows((prev) =>
              data.status === 'inactive' ? prev.filter((s) => s.id !== reactivating.id) : prev.map((s) => (s.id === reactivating.id ? { ...s, status } : s)),
            )
          }
        />
      )}

      {bulkOpen && <BulkPromoteDialog years={data.years} classes={data.classes} initialFromYear={data.yearId} onClose={() => setBulkOpen(false)} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete student?"
        description={deleting ? `Are you sure you want to delete ${deleting.name}? This can't be undone.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />

      <UserProfileModal show={viewUserId !== null} onHide={() => setViewUserId(null)} userId={viewUserId} canEditImage={isAdmin} />
    </div>
  )
}
