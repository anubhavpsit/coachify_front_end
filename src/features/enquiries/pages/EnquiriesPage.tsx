import { useState } from 'react'
import { Eye, MessageCircleQuestion, Power, PowerOff, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import EmptyState from '@/components/common/EmptyState'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { usePermission } from '@/permissions'
import { formatDateTime } from '@/utils/date'
import AddEnquiryForm from '../components/AddEnquiryForm'
import EnquiryDetailDialog from '../components/EnquiryDetailDialog'
import { fetchEnquiries, fetchEnquiry, setEnquiryStatus, type Enquiry, type EnquiryDetail } from '../services/enquiriesService'

type StatusFilter = 'all' | 'active' | 'inactive'

/**
 * Route gate: enquiries.view | enquiries.manage. In-page gate kept exactly
 * (PERMISSIONS_MAP Q1): only role coaching_admin sees the page / triggers the
 * fetch; everyone else gets the "not authorized" message.
 */
export default function EnquiriesPage() {
  const { role, hasRole } = usePermission()
  const isAdmin = hasRole(ROLES.COACHING_ADMIN)
  const [status, setStatus] = useState<StatusFilter>('all')
  const list = useAsync(() => fetchEnquiries(status), [status], { enabled: isAdmin })
  const [local, setLocal] = useState<{ key: StatusFilter; rows: Enquiry[] } | null>(null)
  const rows = local && local.key === status ? local.rows : list.data ?? []
  const setRows = (update: (prev: Enquiry[]) => Enquiry[]) => setLocal({ key: status, rows: update(rows) })
  const [detail, setDetail] = useState<EnquiryDetail | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  if (role && !isAdmin) {
    return (
      <div>
        <PageHeader title="Enquiries" />
        <EmptyState icon={ShieldAlert} title="You are not authorized to view this page." description="Enquiries are managed by coaching admins." />
      </div>
    )
  }

  const listError = list.error ? (list.error instanceof Error && list.error.message === 'You are not authenticated.' ? list.error.message : 'Unable to load enquiries.') : null

  const openDetail = async (id: number) => {
    try {
      const d = await fetchEnquiry(id)
      if (d) setDetail(d)
    } catch (err) {
      console.error('Error loading enquiry details:', err)
      toast.error('Failed to load enquiry details.')
    }
  }

  const toggle = async (e: Enquiry) => {
    const next = e.status === 'active' ? 'inactive' : 'active'
    setBusyId(e.id)
    try {
      const updated = await setEnquiryStatus(e.id, next)
      if (updated) {
        setRows((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
        toast.success(`${e.name} marked ${next}.`)
      }
    } catch (err) {
      console.error('Error updating enquiry status:', err)
      toast.error('Failed to update status.')
    } finally {
      setBusyId(null)
    }
  }

  const columns: ColumnDef<Enquiry, unknown>[] = [
    {
      accessorKey: 'enquiry_type',
      header: 'Type',
      cell: ({ row }) => <Badge variant={row.original.enquiry_type === 'teacher' ? 'info' : 'soft'} className="capitalize">{row.original.enquiry_type}</Badge>,
    },
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      accessorKey: 'contact_number',
      header: 'Contact',
      cell: ({ row }) => (
        <a href={`tel:${row.original.contact_number}`} className="text-foreground no-underline hover:underline">
          {row.original.contact_number}
        </a>
      ),
    },
    { id: 'email', header: 'Email', accessorFn: (e) => e.email ?? '', cell: ({ row }) => row.original.email || <span className="text-muted-foreground">-</span> },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'} className="capitalize">{row.original.status}</Badge>,
    },
    {
      id: 'last',
      header: 'Last Communication',
      accessorFn: (e) => e.last_communication_at ?? '',
      cell: ({ row }) =>
        row.original.last_communication_at ? (
          formatDateTime(row.original.last_communication_at)
        ) : (
          <span className="text-muted-foreground" title="No communications logged yet">
            —
          </span>
        ),
    },
    { accessorKey: 'created_at', header: 'Created At', cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.created_at)}</span> },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => {
        const e = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <IconAction label={`View ${e.name}`} onClick={() => void openDetail(e.id)}>
              <Eye aria-hidden="true" />
            </IconAction>
            <IconAction label={e.status === 'active' ? `Mark ${e.name} inactive` : `Mark ${e.name} active`} onClick={() => busyId !== e.id && void toggle(e)} destructive={e.status === 'active'}>
              {e.status === 'active' ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
            </IconAction>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Enquiries" description="Track admission and hiring enquiries and follow-ups." className="mb-0" />

      <Card>
        <CardHeader>
          <CardTitle>Add Enquiry</CardTitle>
          <CardDescription>Name and contact number are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddEnquiryForm onCreated={(created) => setRows((prev) => [created, ...prev])} />
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b border-solid border-border py-4">
          <CardTitle>Enquiries</CardTitle>
        </CardHeader>
        {listError && (
          <p className="m-0 px-5 pt-4 text-sm text-destructive" role="alert">
            {listError}
          </p>
        )}
        <DataTable
          columns={columns}
          data={rows}
          loading={(list.loading || !role) && rows.length === 0}
          getRowId={(e) => String(e.id)}
          searchPlaceholder="Search enquiries"
          emptyIcon={MessageCircleQuestion}
          emptyTitle="No enquiries found."
          pageSize={25}
          toolbar={
            <label className="m-0 flex items-center gap-2 text-sm font-medium">
              Status
              <NativeSelect className="w-36" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </NativeSelect>
            </label>
          }
        />
      </Card>

      <EnquiryDetailDialog
        enquiry={detail}
        onClose={() => setDetail(null)}
        onUpdated={(d) => {
          setDetail(d)
          // Reflect the last communication in the list as well (legacy).
          setRows((prev) => prev.map((x) => (x.id === d.id ? { ...x, last_communication_at: d.last_communication_at ?? x.last_communication_at } : x)))
        }}
      />
    </div>
  )
}
