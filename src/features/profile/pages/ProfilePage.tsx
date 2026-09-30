import type { ReactNode } from 'react'
import { BarChart3, CalendarCheck2, IndianRupee, ReceiptIndianRupee } from 'lucide-react'
import { m } from 'motion/react'
import { stagger, slideUp, useCountUp } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import ProgressRing from '@/components/common/ProgressRing'
import UserAvatar from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ROLES } from '@/constants/roles'
import { useAsync } from '@/hooks/useAsync'
import { paymentModeLabel } from '@/lib/formatters'
import { useAuthUser } from '@/permissions'
import { formatDate } from '@/utils/date'
import { fetchMyFees, fetchMyPerformance, fetchMyProfile, fetchMySubjects, type MyProfile } from '../services/myProfileService'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:py-2">
      <dt className="tw:text-sm tw:font-normal! tw:text-muted-foreground">{label}</dt>
      <dd className="tw:m-0 tw:text-right tw:text-sm tw:font-medium tw:break-words tw:text-foreground">{children}</dd>
    </div>
  )
}

function Metric({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  const shown = useCountUp(value ?? 0)
  return (
    <div className="tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-3">
      <div className="tw:text-xs tw:text-muted-foreground">{label}</div>
      <div className="tw:text-xl tw:font-bold tw:tabular-nums tw:text-foreground">{value === null ? '-' : `${suffix === '%' ? shown.toFixed(2) : Math.round(shown)}${suffix}`}</div>
    </div>
  )
}

const studentBlock = (p: MyProfile) => p.studentProfile ?? p.student_profile ?? null

/** The signed-in user's own profile (every role). Student sections keep the legacy role checks. */
export default function ProfilePage() {
  const auth = useAuthUser()
  const profile = useAsync(
    () =>
      fetchMyProfile(auth!.id).catch((e) => {
        console.error('Error loading profile:', e)
        throw e
      }),
    [auth?.id],
    { enabled: !!auth?.id },
  )
  const p = profile.data
  // Legacy: fetch student data if either the auth user or the loaded profile is a student …
  const fetchStudent = !!p && (auth?.role === ROLES.STUDENT || p.role === ROLES.STUDENT)
  // … but render the student sections only when the profile itself is a student.
  const isStudent = p?.role === ROLES.STUDENT
  const perf = useAsync(() => fetchMyPerformance(), [p?.id], {
    enabled: fetchStudent,
  })
  const fees = useAsync(() => fetchMyFees(), [p?.id], {
    enabled: fetchStudent,
  })
  const subjects = useAsync(() => fetchMySubjects(auth!.id), [p?.id], {
    enabled: fetchStudent,
  })

  const header = <PageHeader title="My Profile" className="tw:mb-0" />
  const shell = (body: ReactNode) => (
    <div className="tw:flex tw:flex-col tw:gap-6">
      {header}
      {body}
    </div>
  )

  // Same order of checks as the legacy page.
  if (!auth || !localStorage.getItem('authToken')) return shell(<ErrorState title="You are not authenticated." description="Please sign in again." />)
  if (!auth.id) return shell(<ErrorState title="User information is missing." description="Please sign in again." />)
  if (profile.error) return shell(<ErrorState title="Unable to load profile." onRetry={profile.reload} />)
  if (!p)
    return shell(
      <div className="tw:grid tw:gap-4 tw:lg:grid-cols-3" role="status" aria-label="Loading profile">
        <Skeleton className="tw:h-80" />
        <Skeleton className="tw:h-80 tw:lg:col-span-2" />
      </div>,
    )

  const sp = studentBlock(p)
  const inlineSubjects = sp?.subjects
  const subjectNames =
    subjects.data && subjects.data.length > 0
      ? subjects.data.map((s) => s.subject)
      : Array.isArray(inlineSubjects) && inlineSubjects.length > 0
        ? typeof inlineSubjects[0] === 'string'
          ? (inlineSubjects as string[])
          : (inlineSubjects as number[]).map((n) => `Subject #${n}`)
        : []
  const pct = typeof p.attendance_percentage === 'number' ? p.attendance_percentage : 0

  const trialDays = Number(sp?.trial_days ?? 0)
  const admission = p.created_at ? new Date(p.created_at) : null
  const trialEnd = admission ? new Date(admission.getTime() + trialDays * 24 * 3600 * 1000) : null

  return shell(
    <m.div className="tw:grid tw:items-start tw:gap-4 tw:lg:grid-cols-3 tw:*:min-w-0" variants={stagger(0.06)} initial="hidden" animate="visible">
      <m.div variants={slideUp}>
        <Card className="tw:items-center tw:text-center">
          <CardContent className="tw:flex tw:w-full tw:flex-col tw:items-center tw:gap-2">
            <UserAvatar name={p.name} image={p.profile_image} className="tw:size-20 tw:text-xl" />
            <div className="tw:text-lg tw:font-semibold tw:text-foreground">{p.name}</div>
            <Badge variant="soft" className="tw:uppercase">
              {p.role.replace('_', ' ')}
            </Badge>
            <dl className="tw:m-0 tw:mt-3 tw:w-full tw:divide-y tw:divide-border tw:text-left">
              <Row label="Email">{p.email}</Row>
              {p.dob && <Row label="Date of Birth">{formatDate(p.dob)}</Row>}
              {sp?.class && <Row label="Class">{sp.class}</Row>}
              {isStudent && (subjectNames.length > 0 || subjects.loading) && (
                <div className="tw:py-2">
                  <dt className="tw:text-sm tw:font-normal! tw:text-muted-foreground">Subjects</dt>
                  <dd className="tw:m-0 tw:mt-1.5 tw:flex tw:flex-wrap tw:gap-1.5">
                    {subjects.loading ? (
                      <Skeleton className="tw:h-5 tw:w-32" />
                    ) : (
                      subjectNames.map((s, i) => (
                        <Badge key={`${s}-${i}`} variant="soft">
                          {s}
                        </Badge>
                      ))
                    )}
                  </dd>
                </div>
              )}
              {sp?.phone && <Row label="Phone">{sp.phone}</Row>}
              {sp?.address && <Row label="Address">{sp.address}</Row>}
            </dl>
          </CardContent>
        </Card>
      </m.div>

      <div className="tw:grid tw:gap-4 tw:md:grid-cols-2 tw:lg:col-span-2 tw:*:min-w-0">
        <m.div variants={slideUp}>
          <Card className="tw:h-full">
            <CardHeader>
              <CardTitle className="tw:flex tw:items-center tw:gap-2">
                <CalendarCheck2 className="tw:size-4 tw:text-success" aria-hidden="true" /> Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="tw:flex tw:items-center tw:gap-4">
              <ProgressRing value={pct} size={96} stroke={9} toneClassName={pct < 75 ? 'tw:text-destructive' : 'tw:text-success'} label={`Attendance ${pct.toFixed(2)}%`} />
              <div className="tw:flex tw:flex-col tw:gap-1">
                <div className="tw:text-2xl tw:font-bold tw:tabular-nums tw:text-foreground">{pct.toFixed(2)}%</div>
                <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">Overall attendance since joining.</p>
                {typeof p.not_marked_days === 'number' && <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">{Math.round(p.not_marked_days)} day(s) yet to be marked.</p>}
              </div>
            </CardContent>
          </Card>
        </m.div>

        {isStudent && (
          <m.div variants={slideUp}>
            <Card className="tw:h-full">
              <CardHeader>
                <CardTitle className="tw:flex tw:items-center tw:gap-2">
                  <BarChart3 className="tw:size-4 tw:text-primary" aria-hidden="true" /> Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {perf.loading ? (
                  <Skeleton className="tw:h-32" />
                ) : perf.error ? (
                  <p className="tw:m-0 tw:text-sm tw:text-destructive">Unable to load performance data.</p>
                ) : !perf.data ? (
                  <EmptyState icon={BarChart3} title="No assessment history available yet." className="tw:py-4" />
                ) : (
                  <div className="tw:grid tw:grid-cols-2 tw:gap-2">
                    <Metric label="Average Score" value={perf.data.averagePercentage} suffix="%" />
                    <Metric label="Last Score" value={perf.data.lastPercentage} suffix="%" />
                    <Metric label="Completed Assessments" value={perf.data.completedAssessments} />
                    <Metric label="Total Assessments" value={perf.data.totalAssessments} />
                  </div>
                )}
              </CardContent>
            </Card>
          </m.div>
        )}

        {isStudent && (
          <m.div variants={slideUp} className="tw:md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="tw:flex tw:items-center tw:gap-2">
                  <IndianRupee className="tw:size-4 tw:text-muted-foreground" aria-hidden="true" /> Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="tw:flex tw:flex-col tw:gap-4">
                <dl className="tw:m-0 tw:grid tw:grid-cols-2 tw:gap-3 tw:md:grid-cols-5">
                  {(
                    [
                      ['Admission Date', formatDate(p.created_at)],
                      ['Trial Classes', Number.isNaN(trialDays) ? '-' : `${trialDays} day(s)`],
                      ['Trial Ends', trialEnd ? formatDate(trialEnd) : '-'],
                      ['Fees Start From', trialEnd ? formatDate(trialEnd) : '-'],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="tw:rounded-lg tw:bg-muted/60 tw:p-3">
                      <dt className="tw:text-xs tw:font-normal! tw:text-muted-foreground">{k}</dt>
                      <dd className="tw:m-0 tw:text-sm tw:font-semibold">{v}</dd>
                    </div>
                  ))}
                  <div className="tw:rounded-lg tw:bg-muted/60 tw:p-3">
                    <dt className="tw:text-xs tw:font-normal! tw:text-muted-foreground">Next Due Date</dt>
                    <dd className="tw:m-0 tw:flex tw:flex-wrap tw:items-center tw:gap-1.5 tw:text-sm tw:font-semibold">
                      {fees.data?.summary ? formatDate(fees.data.summary.next_due_date) : '-'}
                      {fees.data?.summary?.is_overdue && <Badge variant="destructive">Overdue</Badge>}
                    </dd>
                  </div>
                </dl>
                <div className="tw:flex tw:flex-col tw:gap-2">
                  <div className="tw:text-sm tw:font-semibold">Recent Payments</div>
                  {fees.loading ? (
                    <Skeleton className="tw:h-20" />
                  ) : (fees.data?.history ?? []).length === 0 ? (
                    <EmptyState icon={ReceiptIndianRupee} title="No fees history found." className="tw:py-4" />
                  ) : (
                    <div className="tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Paid On</TableHead>
                            <TableHead className="tw:text-right">Amount</TableHead>
                            <TableHead>Mode</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fees.data!.history.map((h) => (
                            <TableRow key={h.id}>
                              <TableCell>
                                {formatDate(h.from_date)} → {formatDate(h.to_date)}
                              </TableCell>
                              <TableCell>{formatDate(h.paid_at)}</TableCell>
                              <TableCell className="tw:text-right tw:tabular-nums">₹{Number(h.amount).toFixed(2)}</TableCell>
                              <TableCell>{paymentModeLabel(h.payment_mode)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </m.div>
        )}
      </div>
    </m.div>,
  )
}
