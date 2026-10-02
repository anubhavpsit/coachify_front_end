import type { ReactNode } from 'react'
import { BarChart3, BookOpen, Cake, CalendarCheck2, CalendarClock, CalendarDays, GraduationCap, IndianRupee, Mail, MapPin, Phone, ReceiptIndianRupee, UserRound, type LucideIcon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { useAuthUser } from '@/permissions'
import { formatDate } from '@/utils/date'
import { fetchMyFees, fetchMyPerformance, fetchMyProfile, fetchMySubjects, type MyProfile } from '../services/myProfileService'

function Detail({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs font-normal! text-muted-foreground">{label}</dt>
        <dd className="m-0 text-sm font-medium break-words text-foreground">{children}</dd>
      </div>
    </div>
  )
}

function StatTile({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/60 p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-foreground">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

function Metric({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  const shown = useCountUp(value ?? 0)
  return (
    <div className="rounded-xl bg-muted/60 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums text-foreground">{value === null ? '-' : `${suffix === '%' ? shown.toFixed(2) : Math.round(shown)}${suffix}`}</div>
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

  const header = <PageHeader title="My Profile" className="mb-0" />
  const shell = (body: ReactNode) => (
    <div className="flex flex-col gap-6">
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
      <div className="flex flex-col gap-4" role="status" aria-label="Loading profile">
        <Skeleton className="h-52 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
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

  const ringTone = pct >= 75 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-destructive'
  const roleLabel = p.role.replace('_', ' ')

  return shell(
    <m.div className="flex flex-col gap-4" variants={stagger(0.06)} initial="hidden" animate="visible">
      <m.div variants={slideUp}>
        <Card className="gap-0 overflow-hidden py-0">
          {/* Cover in the tenant's theme colour. */}
          <div className="relative h-28 overflow-hidden bg-linear-to-br from-primary to-primary-active md:h-32" aria-hidden="true">
            <span className="absolute -top-16 -right-10 size-56 rounded-full bg-white/10" />
            <span className="absolute -bottom-20 right-40 size-44 rounded-full bg-white/10" />
            <span className="absolute top-6 left-1/3 size-16 rounded-full bg-white/5" />
          </div>
          <div className="flex flex-col gap-4 px-6 pb-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-end md:gap-5 md:text-left">
              <UserAvatar
                name={p.name}
                image={p.profile_image}
                className="-mt-12 size-24 shrink-0 bg-card ring-4 ring-card md:-mt-10 md:size-28"
                toneClassName="bg-primary-soft text-primary text-3xl font-bold"
              />
              <div className="flex min-w-0 flex-col items-center gap-1.5 md:items-start md:pb-1">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <h2 className="m-0 text-2xl! font-bold text-foreground">{p.name}</h2>
                  <Badge variant="soft" className="uppercase">
                    {roleLabel}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground md:justify-start">
                  <span className="inline-flex items-center gap-1.5 break-all">
                    <Mail className="size-4 shrink-0" aria-hidden="true" /> {p.email}
                  </span>
                  {sp?.class && (
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="size-4" aria-hidden="true" /> {sp.class}
                    </span>
                  )}
                  {p.created_at && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" aria-hidden="true" /> Joined {formatDate(p.created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </m.div>

      <div className="grid items-start gap-4 lg:grid-cols-3 *:min-w-0">
        <m.div variants={slideUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-primary" aria-hidden="true" /> About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="m-0 -my-3 divide-y divide-border">
                <Detail icon={Mail} label="Email">
                  {p.email}
                </Detail>
                {p.dob && (
                  <Detail icon={Cake} label="Date of Birth">
                    {formatDate(p.dob)}
                  </Detail>
                )}
                {sp?.class && (
                  <Detail icon={GraduationCap} label="Class">
                    {sp.class}
                  </Detail>
                )}
                {isStudent && (subjectNames.length > 0 || subjects.loading) && (
                  <Detail icon={BookOpen} label="Subjects">
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {subjects.loading ? (
                        <Skeleton className="h-5 w-32" />
                      ) : (
                        subjectNames.map((s, i) => (
                          <Badge key={`${s}-${i}`} variant="soft">
                            {s}
                          </Badge>
                        ))
                      )}
                    </span>
                  </Detail>
                )}
                {sp?.phone && (
                  <Detail icon={Phone} label="Phone">
                    {sp.phone}
                  </Detail>
                )}
                {sp?.address && (
                  <Detail icon={MapPin} label="Address">
                    {sp.address}
                  </Detail>
                )}
                {p.created_at && (
                  <Detail icon={CalendarClock} label="Member since">
                    {formatDate(p.created_at)}
                  </Detail>
                )}
              </dl>
            </CardContent>
          </Card>
        </m.div>

        <div className="grid gap-4 md:grid-cols-2 lg:col-span-2 *:min-w-0">
          <m.div variants={slideUp} className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck2 className="size-4 text-success" aria-hidden="true" /> Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
                <ProgressRing value={pct} size={128} stroke={12} toneClassName={ringTone} label={`Attendance ${pct.toFixed(2)}%`} />
                <div className="grid w-full flex-1 grid-cols-2 gap-3">
                  <StatTile label="Overall attendance" hint="Overall attendance since joining.">
                    <span className={cn(ringTone)}>{pct.toFixed(2)}%</span>
                  </StatTile>
                  {typeof p.not_marked_days === 'number' && (
                    <StatTile label="Not yet marked" hint={`${Math.round(p.not_marked_days)} day(s) yet to be marked.`}>
                      {Math.round(p.not_marked_days)}
                    </StatTile>
                  )}
                </div>
              </CardContent>
            </Card>
          </m.div>

          {isStudent && (
            <m.div variants={slideUp} className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" aria-hidden="true" /> Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {perf.loading ? (
                    <Skeleton className="h-32" />
                  ) : perf.error ? (
                    <p className="m-0 text-sm text-destructive">Unable to load performance data.</p>
                  ) : !perf.data ? (
                    <EmptyState icon={BarChart3} title="No assessment history available yet." className="py-4" />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
            <m.div variants={slideUp} className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="size-4 text-muted-foreground" aria-hidden="true" /> Fees
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-5">
                    {(
                      [
                        ['Admission Date', formatDate(p.created_at)],
                        ['Trial Classes', Number.isNaN(trialDays) ? '-' : `${trialDays} day(s)`],
                        ['Trial Ends', trialEnd ? formatDate(trialEnd) : '-'],
                        ['Fees Start From', trialEnd ? formatDate(trialEnd) : '-'],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-muted/60 p-3">
                        <dt className="text-xs font-normal! text-muted-foreground">{k}</dt>
                        <dd className="m-0 text-sm font-semibold">{v}</dd>
                      </div>
                    ))}
                    <div className="rounded-lg bg-muted/60 p-3">
                      <dt className="text-xs font-normal! text-muted-foreground">Next Due Date</dt>
                      <dd className="m-0 flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                        {fees.data?.summary ? formatDate(fees.data.summary.next_due_date) : '-'}
                        {fees.data?.summary?.is_overdue && <Badge variant="destructive">Overdue</Badge>}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-semibold">Recent Payments</div>
                    {fees.loading ? (
                      <Skeleton className="h-20" />
                    ) : (fees.data?.history ?? []).length === 0 ? (
                      <EmptyState icon={ReceiptIndianRupee} title="No fees history found." className="py-4" />
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-solid border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead>Paid On</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
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
                                <TableCell className="text-right tabular-nums">₹{Number(h.amount).toFixed(2)}</TableCell>
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
      </div>
    </m.div>,
  )
}
