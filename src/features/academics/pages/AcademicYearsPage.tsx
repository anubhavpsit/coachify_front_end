import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarRange, Pencil, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/components/common/DataTable'
import FormDialog from '@/components/common/FormDialog'
import PageHeader from '@/components/common/PageHeader'
import { IconAction } from '@/components/common/RowActions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { formatDate } from '@/utils/date'
import {
  academicYearDefaults,
  academicYearSchema,
  suggestYearName,
  toAcademicYearPayload,
  type AcademicYearValues,
} from '../schemas/academics'
import {
  createAcademicYear,
  fetchAcademicYears,
  setCurrentAcademicYear,
  updateAcademicYear,
  type AcademicYear,
} from '../services/academicsService'

const FIELDS = ['name', 'starts_on', 'ends_on', 'is_current'] as const

/** Route gate: academic_years.manage (unchanged). */
export default function AcademicYearsPage() {
  const [nonce, setNonce] = useState(0)
  const { data: years = [], loading } = useAsync(fetchAcademicYears, [nonce])
  const reload = () => setNonce((n) => n + 1)
  const [editing, setEditing] = useState<AcademicYear | null>(null)
  const [open, setOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [makeCurrent, setMakeCurrent] = useState<AcademicYear | null>(null)
  const form = useForm<AcademicYearValues>({ resolver: zodResolver(academicYearSchema), defaultValues: academicYearDefaults(), mode: 'onTouched' })
  const [startsOn] = useWatch({ control: form.control, name: ['starts_on'] })

  const openForm = (y: AcademicYear | null) => {
    setEditing(y)
    setFormError(null)
    form.reset(academicYearDefaults(y))
    setOpen(true)
  }

  const submit = async (values: AcademicYearValues) => {
    setFormError(null)
    try {
      const payload = toAcademicYearPayload(values)
      if (editing) await updateAcademicYear(editing.id, payload)
      else await createAcademicYear(payload)
      toast.success(editing ? 'Academic year updated.' : 'Academic year created.')
      setOpen(false)
      reload()
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, FIELDS, { fallback: editing ? 'Failed to update year' : 'Failed to create year' }))
    }
  }

  const confirmCurrent = async () => {
    if (!makeCurrent) return
    try {
      await setCurrentAcademicYear(makeCurrent.id)
      toast.success(`${makeCurrent.name} is now the current year.`)
      reload()
    } catch (err) {
      toast.error('Failed to set current year')
      throw err
    }
  }

  const columns: ColumnDef<AcademicYear, unknown>[] = [
    { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: 'starts_on', header: 'Starts', cell: ({ row }) => formatDate(row.original.starts_on) },
    { accessorKey: 'ends_on', header: 'Ends', cell: ({ row }) => formatDate(row.original.ends_on) },
    {
      accessorKey: 'is_current',
      header: 'Current',
      cell: ({ row }) =>
        row.original.is_current ? (
          <Badge variant="success">
            <Star aria-hidden="true" />
            Current
          </Badge>
        ) : (
          <span className="text-muted-foreground">No</span>
        ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { align: 'right' },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {!row.original.is_current && (
            <Button
              variant="ghost"
              size="sm"
              title="Setting this as current affects which year is used as the default across the app. Only one year can be active at a time."
              onClick={() => setMakeCurrent(row.original)}
            >
              <Star aria-hidden="true" />
              Set Current
            </Button>
          )}
          <IconAction label={`Edit ${row.original.name}`} onClick={() => openForm(row.original)}>
            <Pencil aria-hidden="true" />
          </IconAction>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Academic Years"
        description="Only one year can be current at a time; it's the default across the app."
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus aria-hidden="true" />
            Add Year
          </Button>
        }
      />
      <Card className="gap-0 overflow-hidden py-0">
        <DataTable
          columns={columns}
          data={years}
          loading={loading && years.length === 0}
          getRowId={(y) => String(y.id)}
          emptyIcon={CalendarRange}
          emptyTitle="No academic years yet."
        />
      </Card>

      <FormDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Academic Year' : 'Add Academic Year'}
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
              <FormLabel required>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 2026-2027" maxLength={100} autoComplete="off" {...field} />
              </FormControl>
              {!field.value && suggestYearName(startsOn) && (
                <FormDescription>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => form.setValue('name', suggestYearName(startsOn), { shouldDirty: true, shouldValidate: true })}
                  >
                    Use “{suggestYearName(startsOn)}”
                  </Button>
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="starts_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Starts On</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ends_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Ends On</FormLabel>
                <FormControl>
                  <Input type="date" min={startsOn || undefined} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="is_current"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border border-solid border-border p-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
              </FormControl>
              <div className="grid gap-1">
                <FormLabel>Set as current</FormLabel>
                <FormDescription>Makes this the default year across the app.</FormDescription>
              </div>
            </FormItem>
          )}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!makeCurrent}
        onOpenChange={(o) => !o && setMakeCurrent(null)}
        title={`Make ${makeCurrent?.name ?? 'this year'} current?`}
        description="It becomes the default year across the app. Only one year can be active at a time."
        confirmLabel="Set Current"
        onConfirm={confirmCurrent}
      />
    </div>
  )
}
