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
    <div className="tw:flex tw:items-start tw:gap-3 tw:py-3">
      <span className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-primary-soft tw:text-primary">
        <Icon className="tw:size-4" aria-hidden="true" />
      </span>
      <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-0.5">
        <dt className="tw:text-xs tw:font-normal! tw:text-muted-foreground">{label}</dt>
        <dd className="tw:m-0 tw:text-sm tw:font-medium tw:break-words tw:text-foreground">{children}</dd>
      </div>
    </div>
  )
}

function StatTile({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="tw:flex tw:flex-col tw:gap-1 tw:rounded-xl tw:bg-muted/60 tw:p-4">
      <span className="tw:text-xs tw:text-muted-foreground">{label}</span>
      <span className="tw:text-2xl tw:font-bold tw:tabular-nums tw:text-foreground">{children}</span>
      {hint && <span className="tw:text-xs tw:text-muted-foreground">{hint}</span>}
    </div>
  )
}

function Metric({ label, value, suffix = '' }: { label: string; value: number | null; suffix?: string }) {
  const shown = useCountUp(value ?? 0)
  return (
    <div className="tw:rounded-xl tw:bg-muted/60 tw:p-4">
      <div className="tw:text-xs tw:text-muted-foreground">{label}</div>
      <div className="tw:text-2xl tw:font-bold tw:tabular-nums tw:text-foreground">{value === null ? '-' : `${suffix === '%' ? shown.toFixed(2) : Math.round(shown)}${suffix}`}</div>
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
      <div className="tw:flex tw:flex-col tw:gap-4" role="status" aria-label="Loading profile">
        <Skeleton className="tw:h-52 tw:rounded-xl" />
        <div className="tw:grid tw:gap-4 tw:lg:grid-cols-3">
          <Skeleton className="tw:h-72 tw:rounded-xl" />
          <Skeleton className="tw:h-72 tw:rounded-xl tw:lg:col-span-2" />
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

  const ringTone = pct >= 75 ? 'tw:text-success' : pct >= 50 ? 'tw:text-warning' : 'tw:text-destructive'
  const roleLabel = p.role.replace('_', ' ')

  return shell(
    <m.div className="tw:flex tw:flex-col tw:gap-4" variants={stagger(0.06)} initial="hidden" animate="visible">
      <m.div variants={slideUp}>
        <Card className="tw:gap-0 tw:overflow-hidden tw:py-0">
          {/* Cover in the tenant's theme colour. */}
          <div className="tw:relative tw:h-28 tw:overflow-hidden tw:bg-linear-to-br tw:from-primary tw:to-primary-active tw:md:h-32" aria-hidden="true">
            <span className="tw:absolute tw:-top-16 tw:-right-10 tw:size-56 tw:rounded-full tw:bg-white/10" />
            <span className="tw:absolute tw:-bottom-20 tw:right-40 tw:size-44 tw:rounded-full tw:bg-white/10" />
            <span className="tw:absolute tw:top-6 tw:left-1/3 tw:size-16 tw:rounded-full tw:bg-white/5" />
          </div>
          <div className="tw:flex tw:flex-col tw:gap-4 tw:px-6 tw:pb-6 tw:md:flex-row tw:md:items-end tw:md:justify-between">
            <div className="tw:flex tw:flex-col tw:items-center tw:gap-3 tw:text-center tw:md:flex-row tw:md:items-end tw:md:gap-5 tw:md:text-left">
              <UserAvatar
                name={p.name}
                image={p.profile_image}
                className="tw:-mt-12 tw:size-24 tw:shrink-0 tw:bg-card tw:ring-4 tw:ring-card tw:md:-mt-10 tw:md:size-28"
                toneClassName="tw:bg-primary-soft tw:text-primary tw:text-3xl tw:font-bold"
              />
              <div className="tw:flex tw:min-w-0 tw:flex-col tw:items-center tw:gap-1.5 tw:md:items-start tw:md:pb-1">
                <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-center tw:gap-2">
                  <h2 className="tw:m-0 tw:text-2xl! tw:font-bold tw:text-foreground">{p.name}</h2>
                  <Badge variant="soft" className="tw:uppercase">
                    {roleLabel}
                  </Badge>
                </div>
                <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-center tw:gap-x-4 tw:gap-y-1 tw:text-sm tw:text-muted-foreground tw:md:justify-start">
                  <span className="tw:inline-flex tw:items-center tw:gap-1.5 tw:break-all">
                    <Mail className="tw:size-4 tw:shrink-0" aria-hidden="true" /> {p.email}
                  </span>
                  {sp?.class && (
                    <span className="tw:inline-flex tw:items-center tw:gap-1.5">
                      <GraduationCap className="tw:size-4" aria-hidden="true" /> {sp.class}
                    </span>
                  )}
                  {p.created_at && (
                    <span className="tw:inline-flex tw:items-center tw:gap-1.5">
                      <CalendarDays className="tw:size-4" aria-hidden="true" /> Joined {formatDate(p.created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </m.div>

      <div className="tw:grid tw:items-start tw:gap-4 tw:lg:grid-cols-3 tw:*:min-w-0">
        <m.div variants={slideUp}>
          <Card>
            <CardHeader>
              <CardTitle className="tw:flex tw:items-center tw:gap-2">
                <UserRound className="tw:size-4 tw:text-primary" aria-hidden="true" /> About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="tw:m-0 tw:-my-3 tw:divide-y tw:divide-border">
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
                    <span className="tw:mt-1 tw:flex tw:flex-wrap tw:gap-1.5">
                      {subjects.loading ? (
                        <Skeleton className="tw:h-5 tw:w-32" />
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

        <div className="tw:grid tw:gap-4 tw:md:grid-cols-2 tw:lg:col-span-2 tw:*:min-w-0">
          <m.div variants={slideUp} className="tw:md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="tw:flex tw:items-center tw:gap-2">
                  <CalendarCheck2 className="tw:size-4 tw:text-success" aria-hidden="true" /> Attendance
                </CardTitle>
              </CardHeader>
              <CardContent className="tw:flex tw:flex-col tw:items-center tw:gap-6 tw:sm:flex-row">
                <ProgressRing value={pct} size={128} stroke={12} toneClassName={ringTone} label={`Attendance ${pct.toFixed(2)}%`} />
                <div className="tw:grid tw:w-full tw:flex-1 tw:grid-cols-2 tw:gap-3">
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
            <m.div variants={slideUp} className="tw:md:col-span-2">
              <Card>
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
                    <div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:md:grid-cols-4">
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
      </div>
    </m.div>,
  )
}
