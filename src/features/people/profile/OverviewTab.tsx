import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import PersonRow from '@/components/common/PersonRow'
import ProgressRing from '@/components/common/ProgressRing'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/utils/date'
import type { FeeSummary, RelatedUser, UserProfile } from './profileService'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tw:flex tw:h-full tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:p-4">
      <h3 className="tw:m-0 tw:text-sm! tw:font-semibold tw:text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function People({ list, empty }: { list?: RelatedUser[]; empty: string }) {
  if (!Array.isArray(list) || list.length === 0) return <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{empty}</p>
  return (
    <div className="tw:max-h-40 tw:divide-y tw:divide-border tw:overflow-y-auto">
      {list.map((p) => (
        <PersonRow key={p.id} name={p.name} image={p.profile_image ?? p.profile_img} subtitle={p.email} />
      ))}
    </div>
  )
}

export type FeeState = { loading: boolean; summary: FeeSummary | null; forbidden: boolean; error: string | null }

interface Props {
  user: UserProfile
  /** Viewer is coaching_admin and the viewed user is a student (legacy raw-role check). */
  showFees: boolean
  fees: FeeState
  showAdminStudentFields: boolean
}

export default function OverviewTab({ user, showFees, fees, showAdminStudentFields }: Props) {
  const isStudent = user.role === 'student'
  const hasAttendance = typeof user.attendance_percentage === 'number' || typeof user.not_marked_days === 'number'
  const details: Array<[string, ReactNode]> = []
  if (user.dob) details.push(['DOB', formatDate(user.dob)])
  if (isStudent && user.student_profile) {
    details.push(['Class', user.current_class_name ?? user.student_profile.class ?? '-'])
    details.push(['Phone', user.student_profile.phone || '-'])
  }
  if (isStudent) details.push(['Admission', formatDate(user.created_at)])
  if (showAdminStudentFields && user.student_profile) {
    details.push(['Next Fee Due', formatDate(user.student_profile.fee_due_date ?? null)])
    details.push(['Trial Days', user.student_profile.trial_days ?? '-'])
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <div className="tw:grid tw:gap-3 tw:md:grid-cols-2 tw:xl:grid-cols-3">
        {hasAttendance && (
          <Panel title="Attendance">
            <div className="tw:flex tw:items-center tw:gap-4">
              {typeof user.attendance_percentage === 'number' ? (
                <ProgressRing value={user.attendance_percentage} size={72} stroke={7} toneClassName={user.attendance_percentage < 75 ? 'tw:text-destructive' : 'tw:text-success'} label={`Attendance ${user.attendance_percentage.toFixed(2)}%`} />
              ) : (
                <span className="tw:text-2xl tw:font-bold">—</span>
              )}
              {typeof user.not_marked_days === 'number' && (
                <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{Math.round(user.not_marked_days)} day(s) yet to be marked.</p>
              )}
            </div>
          </Panel>
        )}

        {showFees && !fees.forbidden && (
          <Panel title="Fees">
            {fees.loading ? (
              <div className="tw:flex tw:flex-col tw:gap-2" role="status" aria-label="Loading fees">
                <Skeleton className="tw:h-4 tw:w-3/4" />
                <Skeleton className="tw:h-4 tw:w-1/2" />
              </div>
            ) : fees.error ? (
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">{fees.error}</p>
            ) : fees.summary ? (
              <div className="tw:flex tw:flex-col tw:gap-1.5 tw:text-sm">
                <div>
                  Last fees paid: {fees.summary.last_paid_at ? formatDate(fees.summary.last_paid_at) : 'No fee history'}
                  {typeof fees.summary.last_paid_amount === 'number' && !Number.isNaN(fees.summary.last_paid_amount) && <> (₹{Number(fees.summary.last_paid_amount).toFixed(2)})</>}
                </div>
                <div>Next fees due: {formatDate(fees.summary.next_due_date)}</div>
                {fees.summary.is_overdue ? (
                  <Badge variant="destructive" className="tw:whitespace-normal">
                    <AlertTriangle aria-hidden="true" />
                    Fees overdue: Due on {formatDate(fees.summary.next_due_date)}
                    {fees.summary.days_overdue ? ` (${fees.summary.days_overdue} days overdue)` : ''}
                  </Badge>
                ) : (
                  <Badge variant="success" className="tw:whitespace-normal">
                    <CheckCircle2 aria-hidden="true" />
                    {new Date(fees.summary.next_due_date).toDateString() === new Date().toDateString() ? 'Due today' : `Paid - Next due on ${formatDate(fees.summary.next_due_date)}`}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No fee history available.</p>
            )}
          </Panel>
        )}

        {isStudent && (
          <Panel title="Assigned Teachers">
            <People list={user.teachers} empty="No teachers assigned yet." />
          </Panel>
        )}
        {user.role === 'teacher' && (
          <Panel title="Assigned Students">
            <People list={user.students} empty="No students assigned yet." />
          </Panel>
        )}
      </div>

      {details.length > 0 && (
        <dl className="tw:m-0 tw:grid tw:grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] tw:gap-x-4 tw:gap-y-3 tw:rounded-xl tw:bg-muted/50 tw:p-4">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="tw:text-xs tw:text-muted-foreground">{label}</dt>
              <dd className="tw:m-0 tw:text-sm tw:font-medium tw:text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
