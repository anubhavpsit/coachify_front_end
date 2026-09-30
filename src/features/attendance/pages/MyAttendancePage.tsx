import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarCheck2, ChevronLeft, ChevronRight, Flame, History } from 'lucide-react'
import { m } from 'motion/react'
import { toast } from 'sonner'
import { stagger } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import FormDialog from '@/components/common/FormDialog'
import PageHeader from '@/components/common/PageHeader'
import ProgressRing from '@/components/common/ProgressRing'
import StatCard from '@/components/common/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAsync } from '@/hooks/useAsync'
import { applyServerErrors } from '@/lib/forms'
import { useAuthUser } from '@/permissions'
import { formatDate } from '@/utils/date'
import AttendanceCalendar from '../components/AttendanceCalendar'
import { correctableDays, countedDays, monthDays, monthInsights, ymd } from '../lib/myAttendance'
import { loadMyMonth, requestCorrection } from '../services/myAttendanceService'

/** AttendanceCorrectionController: requested_status in present/absent/leave; reason required|min:5. */
const correctionSchema = z.object({
  requested_status: z.enum(['present', 'absent', 'leave']),
  reason: z.string().trim().min(1, 'Please give a reason.').min(5, 'Reason must be at least 5 characters.'),
})
type CorrectionValues = z.infer<typeof correctionSchema>

const REQUEST_TONE = { pending: 'warning', approved: 'success', rejected: 'destructive' } as const

/** Every signed-in user (sidebar shows it to students and teachers). */
export default function MyAttendancePage() {
  const userId = useAuthUser()?.id
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const data = useAsync(() => loadMyMonth(month, year, userId), [month, year, userId])
  const [requestFor, setRequestFor] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<CorrectionValues>({ resolver: zodResolver(correctionSchema), defaultValues: { requested_status: 'present', reason: '' }, mode: 'onTouched' })

  const today = ymd(new Date())
  const derived = useMemo(() => {
    if (!data.data) return null
    const { records, requests, holidays, stats } = data.data
    const days = monthDays(records, month, year, holidays)
    const counted = countedDays(days, today, stats.admission)
    return {
      counted,
      correctable: correctableDays(counted, requests),
      insights: monthInsights(counted),
      statusByDate: new Map(records.map((r) => [r.attendance_date, r.status] as const)),
      countedSet: new Set(counted.map((d) => d.attendance_date)),
      requested: new Set(requests.map((r) => r.attendance_date)),
    }
  }, [data.data, month, year, today])

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setMonth(d.getMonth() + 1)
    setYear(d.getFullYear())
  }

  const openRequest = (date: string) => {
    form.reset({ requested_status: 'present', reason: '' })
    setFormError(null)
    setRequestFor(date)
  }

  const submit = async (v: CorrectionValues) => {
    if (!requestFor) return
    setFormError(null)
    try {
      await requestCorrection({ attendance_date: requestFor, requested_status: v.requested_status, reason: v.reason })
      setRequestFor(null)
      data.reload()
      toast.success('Correction request submitted')
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['requested_status', 'reason'], { fallback: 'Failed to submit request' }))
    }
  }

  const stats = data.data?.stats
  const ins = derived?.insights
  const monthLabel = new Date(year, month - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader
        title="My Attendance"
        description="Your attendance by month. Tap an absent or leave day to request a correction."
        className="tw:mb-0"
        actions={
          <div className="tw:flex tw:items-center tw:gap-1" role="group" aria-label="Month">
            <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => shift(-1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="tw:min-w-36 tw:text-center tw:text-sm tw:font-semibold" aria-live="polite">
              {monthLabel}
            </span>
            <Button variant="outline" size="icon" aria-label="Next month" onClick={() => shift(1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        }
      />

      {data.error ? (
        <ErrorState title="Failed to load attendance." onRetry={data.reload} />
      ) : !derived || !ins ? (
        <div className="tw:grid tw:gap-4 tw:lg:grid-cols-3" role="status" aria-label="Loading attendance">
          <Skeleton className="tw:h-48" />
          <Skeleton className="tw:h-48 tw:lg:col-span-2" />
        </div>
      ) : (
        <>
          <div className="tw:grid tw:gap-4 tw:lg:grid-cols-3">
            <Card>
              <CardContent className="tw:flex tw:flex-col tw:items-center tw:gap-3 tw:py-2">
                <ProgressRing
                  value={stats?.percentage ?? ins.percentage}
                  size={120}
                  stroke={10}
                  toneClassName={(stats?.percentage ?? ins.percentage) < 75 ? 'tw:text-destructive' : 'tw:text-success'}
                  label={`Attendance ${stats?.percentage ?? ins.percentage}%`}
                />
                <div className="tw:text-sm tw:text-muted-foreground" title="Calculated as: Present ÷ (Present + Absent) × 100">
                  Attendance
                </div>
                <div className="tw:flex tw:items-center tw:gap-2 tw:rounded-full tw:bg-warning-soft tw:px-3 tw:py-1 tw:text-sm tw:font-semibold tw:text-warning">
                  <Flame className="tw:size-4" aria-hidden="true" />
                  Longest present streak: {ins.longestPresent} day{ins.longestPresent === 1 ? '' : 's'}
                </div>
              </CardContent>
            </Card>
            <m.div className="tw:grid tw:grid-cols-2 tw:gap-4 tw:lg:col-span-2" variants={stagger(0.05)} initial="hidden" animate="visible">
              <StatCard label="Present" value={stats?.lifetime?.present ?? ins.present} icon={CalendarCheck2} tone="success" />
              <StatCard label="Absent" value={stats?.lifetime?.absent ?? ins.absent} icon={CalendarCheck2} tone="destructive" />
              <StatCard label="Leave" value={stats?.lifetime?.leave ?? ins.leave} icon={CalendarCheck2} tone="warning" />
              <StatCard label="Not Marked" value={stats?.notMarked ?? ins.notMarked} icon={CalendarCheck2} tone="info" />
            </m.div>
          </div>

          <div className="tw:grid tw:gap-4 tw:lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>{monthLabel}</CardTitle>
                <CardDescription>Days before your admission and future days are greyed out.</CardDescription>
              </CardHeader>
              <CardContent>
                <AttendanceCalendar
                  month={month}
                  year={year}
                  statusByDate={derived.statusByDate}
                  holidays={data.data!.holidays}
                  isCounted={(d) => derived.countedSet.has(d)}
                  correctable={new Set(derived.correctable.map((d) => d.attendance_date))}
                  requested={derived.requested}
                  onRequest={openRequest}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Request a correction</CardTitle>
                <CardDescription>Corrections can only be requested for Absent or Leave days.</CardDescription>
              </CardHeader>
              <CardContent className="tw:px-0">
                {derived.correctable.length === 0 ? (
                  <EmptyState icon={CalendarCheck2} title="No attendance records." description="Nothing to correct this month." />
                ) : (
                  <Table>
                    <TableBody>
                      {derived.correctable.map((r) => (
                        <TableRow key={r.attendance_date}>
                          <TableCell>{formatDate(r.attendance_date)}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'absent' ? 'destructive' : 'warning'} className="tw:capitalize">
                              {r.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="tw:text-right">
                            <Button variant="outline" size="sm" onClick={() => openRequest(r.attendance_date)}>
                              Request Correction
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="tw:gap-0 tw:pb-0">
            <CardHeader className="tw:pb-4">
              <CardTitle className="tw:flex tw:items-center tw:gap-2">
                <History className="tw:size-4 tw:text-muted-foreground" aria-hidden="true" />
                My Correction Requests
              </CardTitle>
            </CardHeader>
            {data.data!.requests.length === 0 ? (
              <EmptyState icon={History} title="No requests yet." className="tw:pb-6" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Admin Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data!.requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.attendance_date)}</TableCell>
                      <TableCell className="tw:capitalize">{r.current_status?.replace('_', ' ') ?? '—'}</TableCell>
                      <TableCell className="tw:capitalize">{r.requested_status}</TableCell>
                      <TableCell>
                        <Badge variant={REQUEST_TONE[r.status]} className="tw:capitalize">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tw:max-w-64 tw:whitespace-normal">{r.reason}</TableCell>
                      <TableCell className="tw:max-w-64 tw:whitespace-normal tw:text-muted-foreground">{r.admin_comment ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}

      <FormDialog
        open={requestFor !== null}
        onClose={() => setRequestFor(null)}
        title="Request Correction"
        description={requestFor ? `For ${formatDate(requestFor)}. Your coaching admin will review it.` : undefined}
        form={form}
        onSubmit={submit}
        submitLabel="Submit Request"
        submittingLabel="Submitting…"
        error={formError}
      >
        <FormField
          control={form.control}
          name="requested_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Requested Status</FormLabel>
              <FormControl>
                <NativeSelect {...field}>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                </NativeSelect>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Reason</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Explain why this should be corrected" {...field} />
              </FormControl>
              <FormDescription>At least 5 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormDialog>
    </div>
  )
}
