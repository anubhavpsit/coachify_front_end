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
    <div className="tw:flex tw:flex-col tw:gap-6 tw:pb-20">
      <PageHeader
        title="Daily Attendance"
        description="Mark who was present today. Nothing is saved until you press Save."
        className="tw:mb-0"
        actions={
          <>
            <label className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:text-sm tw:font-medium">
              <span className="tw:sr-only">Date</span>
              <Input type="date" value={date} onChange={(e) => e.target.value && changeDate(e.target.value)} className="tw:w-44" />
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
        <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:border-b tw:border-solid tw:border-border tw:p-4">
            <div className="tw:relative tw:w-full tw:max-w-xs">
              <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
              <Input type="search" placeholder="Find a person" aria-label="Find a person" value={search} onChange={(e) => setSearch(e.target.value)} className="tw:pl-9" />
            </div>
            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2" aria-live="polite">
              {STATUSES.map((s) => (
                <Badge key={s} variant={SUMMARY_TONE[s]}>
                  {STATUS_META[s].label}: {counts[s]}
                </Badge>
              ))}
            </div>
            <div className="tw:ml-auto tw:flex tw:flex-wrap tw:items-center tw:gap-1.5">
              <span className="tw:text-xs tw:text-muted-foreground">Mark everyone:</span>
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
            <div className="tw:flex tw:flex-col tw:gap-2 tw:p-4" role="status" aria-label="Loading users">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="tw:h-11" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No one to mark for this day." />
          ) : visible.length === 0 ? (
            <EmptyState icon={Search} title={`No one matches “${search}”.`} />
          ) : (
            <div className="tw:max-h-[60vh] tw:overflow-auto">
              <table className="tw:m-0 tw:w-full tw:border-collapse tw:text-sm">
                <thead className="tw:sticky tw:top-0 tw:z-10 tw:bg-card">
                  <tr className="tw:border-0 tw:border-b tw:border-solid tw:border-border">
                    <th className="tw:w-12 tw:px-4 tw:py-2.5 tw:text-left tw:text-xs tw:font-semibold tw:uppercase tw:text-muted-foreground">S.no</th>
                    <th className="tw:px-4 tw:py-2.5 tw:text-left tw:text-xs tw:font-semibold tw:uppercase tw:text-muted-foreground">Name</th>
                    <th className="tw:px-4 tw:py-2.5 tw:text-left tw:text-xs tw:font-semibold tw:uppercase tw:text-muted-foreground">Role</th>
                    <th className="tw:px-4 tw:py-2.5 tw:text-right tw:text-xs tw:font-semibold tw:uppercase tw:text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => {
                    const status = attendance[u.id]?.status ?? 'not_marked'
                    const unmarked = status === 'not_marked' && !isHoliday
                    return (
                      <tr
                        key={u.id}
                        className={cn('tw:border-0 tw:border-b tw:border-solid tw:border-border tw:transition-colors', unmarked && 'tw:bg-warning-soft/50')}
                        title={unmarked ? 'Attendance not yet marked for this person' : undefined}
                      >
                        <td className="tw:px-4 tw:py-2 tw:text-muted-foreground tw:tabular-nums">{users.indexOf(u) + 1}</td>
                        <td className="tw:px-4 tw:py-2 tw:font-medium tw:text-foreground">{u.name}</td>
                        <td className="tw:px-4 tw:py-2 tw:capitalize tw:text-muted-foreground">{u.role}</td>
                        <td className="tw:px-4 tw:py-2 tw:text-right">
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
      <div className="tw:fixed tw:inset-x-0 tw:bottom-0 tw:z-20 tw:flex tw:justify-end tw:border-t tw:border-solid tw:border-border tw:bg-card/90 tw:px-4 tw:py-3 tw:backdrop-blur tw:md:px-6">
        <div className="tw:flex tw:items-center tw:gap-3">
          {dirty && !isHoliday && <span className="tw:text-sm tw:text-warning">Unsaved changes</span>}
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
