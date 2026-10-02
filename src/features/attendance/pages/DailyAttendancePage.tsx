import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarOff, ClipboardCheck, PartyPopper, Search, Users } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { slideUp } from '@/animations'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { cn } from '@/lib/utils'
import { usePermission } from '@/permissions'
import { formatDate, toDateInputValue } from '@/utils/date'
import StatusPills from '../components/StatusPills'
import { STATUSES, STATUS_META } from '../components/statusMeta'
import { loadDay, markHoliday, saveDay, unmarkHoliday, type AttendanceRecord, type AttendanceStatus } from '../services/dailyAttendanceService'

const SUMMARY_TONE: Record<AttendanceStatus, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  present: 'success',
  absent: 'destructive',
  leave: 'warning',
  not_marked: 'secondary',
}

/** Route gate: attendance.mark. Holiday toggle: role coaching_admin (unchanged). */
export default function DailyAttendancePage() {
  const { hasRole } = usePermission()
  const isAdmin = hasRole(ROLES.COACHING_ADMIN)
  const [searchParams] = useSearchParams()
  const [date, setDate] = useState(() => {
    const q = searchParams.get('date')
    return q && !Number.isNaN(Date.parse(q)) ? q : toDateInputValue()
  })
  const day = useAsync(
    () =>
      loadDay(date).catch((e) => {
        console.error('Error fetching users or attendance:', e)
        throw e
      }),
    [date],
  )
  const [edits, setEdits] = useState<{ date: string; map: Record<number, AttendanceRecord> } | null>(null)
  const [holiday, setHoliday] = useState<{ date: string; on: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingHoliday, setTogglingHoliday] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingDate, setPendingDate] = useState<string | null>(null)

  const users = day.data?.users ?? []
  const attendance = edits?.date === date ? edits.map : (day.data?.attendance ?? {})
  const isHoliday = holiday?.date === date ? holiday.on : !!day.data?.isHoliday
  const dirty = edits?.date === date
  useBeforeUnload(dirty)

  const setStatus = (ids: number[], status: AttendanceStatus) =>
    setEdits(() => {
      const next = { ...attendance }
      ids.forEach((id) => (next[id] = { ...next[id], status }))
      return { date, map: next }
    })

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, leave: 0, not_marked: 0 }
  users.forEach((u) => counts[attendance[u.id]?.status ?? 'not_marked']++)
  const q = search.trim().toLowerCase()
  const visible = q ? users.filter((u) => u.name.toLowerCase().includes(q)) : users
  const allHave = (s: AttendanceStatus) => users.length > 0 && users.every((u) => attendance[u.id]?.status === s)

  const changeDate = (next: string) => {
    if (dirty) setPendingDate(next)
    else setDate(next)
  }

  const save = async () => {
    if (isHoliday) return
    setSaving(true)
    try {
      await saveDay(attendance)
      toast.success('Attendance saved successfully')
      setEdits(null)
      day.reload()
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const toggleHoliday = async () => {
    setTogglingHoliday(true)
    try {
      if (!isHoliday) await markHoliday(date, day.data?.holidayName)
      else await unmarkHoliday(date)
      setHoliday({ date, on: !isHoliday })
      toast.success(isHoliday ? `${formatDate(date)} is a working day again.` : `${formatDate(date)} marked as a holiday.`)
    } catch {
      toast.error('Failed to update holiday')
    } finally {
      setTogglingHoliday(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Daily Attendance"
        description="Mark who was present today. Nothing is saved until you press Save."
        className="mb-0"
        actions={
          <>
            <label className="m-0 flex items-center gap-2 text-sm font-medium">
              <span className="sr-only">Date</span>
              <Input type="date" value={date} onChange={(e) => e.target.value && changeDate(e.target.value)} className="w-44" />
            </label>
            {isAdmin && (
              <Button
                variant={isHoliday ? 'soft' : 'outline'}
                onClick={() => void toggleHoliday()}
                loading={togglingHoliday}
                title={isHoliday ? 'Unmarking will allow attendance to be edited for this day' : 'Mark this day as a holiday — attendance will be disabled'}
              >
                <CalendarOff aria-hidden="true" />
                {isHoliday ? 'Unmark Holiday' : 'Mark Holiday'}
              </Button>
            )}
          </>
        }
      />

      <AnimatePresence initial={false}>
        {isHoliday && (
          <m.div key="holiday" variants={slideUp} initial="hidden" animate="visible" exit="exit">
            <Alert variant="info">
              <PartyPopper aria-hidden="true" />
              <AlertTitle>Holiday</AlertTitle>
              <AlertDescription>Attendance not required for {formatDate(date)}.</AlertDescription>
            </Alert>
          </m.div>
        )}
      </AnimatePresence>

      {day.error ? (
        <ErrorState title="Couldn't load attendance" description="Check your connection and try again." onRetry={day.reload} />
      ) : (
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-solid border-border p-4">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input type="search" placeholder="Find a person" aria-label="Find a person" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              {STATUSES.map((s) => (
                <Badge key={s} variant={SUMMARY_TONE[s]}>
                  {STATUS_META[s].label}: {counts[s]}
                </Badge>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Mark everyone:</span>
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={allHave(s) ? 'soft' : 'ghost'}
                  size="sm"
                  disabled={isHoliday || users.length === 0}
                  aria-pressed={allHave(s)}
                  title={`Mark every person as ${STATUS_META[s].label}`}
                  onClick={() => setStatus(users.map((u) => u.id), s)}
                >
                  {STATUS_META[s].label}
                </Button>
              ))}
            </div>
          </div>

          {day.loading && users.length === 0 ? (
            <div className="flex flex-col gap-2 p-4" role="status" aria-label="Loading users">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No one to mark for this day." />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} title={`No one matches “${search}”.`} />
          ) : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="m-0 w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-0 border-b border-solid border-border">
                    <th className="w-12 px-4 py-2.5 text-left text-xs font-semibold uppercase text-muted-foreground">S.no</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-muted-foreground">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-muted-foreground">Role</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => {
                    const status = attendance[u.id]?.status ?? 'not_marked'
                    const unmarked = status === 'not_marked' && !isHoliday
                    return (
                      <tr
                        key={u.id}
                        className={cn('border-0 border-b border-solid border-border transition-colors', unmarked && 'bg-warning-soft/50')}
                        title={unmarked ? 'Attendance not yet marked for this person' : undefined}
                      >
                        <td className="px-4 py-2 align-middle text-muted-foreground tabular-nums">{users.indexOf(u) + 1}</td>
                        <td className="px-4 py-2 align-middle font-medium text-foreground">{u.name}</td>
                        <td className="px-4 py-2 align-middle capitalize text-muted-foreground">{u.role}</td>
                        <td className="px-4 py-2 align-middle text-right">
                          <StatusPills name={`status_${u.id}`} label={`Attendance for ${u.name}`} value={status} disabled={isHoliday} onChange={(s) => setStatus([u.id], s)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end border-t border-solid border-border bg-card/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          {dirty && !isHoliday && <span className="text-sm text-warning">Unsaved changes</span>}
          <Button onClick={() => void save()} loading={saving} disabled={isHoliday || users.length === 0}>
            <ClipboardCheck aria-hidden="true" />
            {isHoliday ? 'Holiday (No Attendance)' : saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDate !== null}
        onOpenChange={(o) => !o && setPendingDate(null)}
        title="Discard unsaved attendance?"
        description="You've changed attendance for this day but haven't saved it."
        confirmLabel="Discard and switch"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setEdits(null)
          if (pendingDate) setDate(pendingDate)
          setPendingDate(null)
        }}
      />
    </div>
  )
}
