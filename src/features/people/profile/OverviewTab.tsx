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
    <section className="flex h-full flex-col gap-3 rounded-xl border border-solid border-border p-4">
      <h3 className="m-0 text-sm! font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function People({ list, empty }: { list?: RelatedUser[]; empty: string }) {
  if (!Array.isArray(list) || list.length === 0) return <p className="m-0 text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="max-h-40 divide-y divide-border overflow-y-auto">
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
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {hasAttendance && (
          <Panel title="Attendance">
            <div className="flex items-center gap-4">
              {typeof user.attendance_percentage === 'number' ? (
                <ProgressRing value={user.attendance_percentage} size={72} stroke={7} toneClassName={user.attendance_percentage < 75 ? 'text-destructive' : 'text-success'} label={`Attendance ${user.attendance_percentage.toFixed(2)}%`} />
              ) : (
                <span className="text-2xl font-bold">—</span>
              )}
              {typeof user.not_marked_days === 'number' && (
                <p className="m-0 text-sm text-muted-foreground">{Math.round(user.not_marked_days)} day(s) yet to be marked.</p>
              )}
            </div>
          </Panel>
        )}

        {showFees && !fees.forbidden && (
          <Panel title="Fees">
            {fees.loading ? (
              <div className="flex flex-col gap-2" role="status" aria-label="Loading fees">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : fees.error ? (
              <p className="m-0 text-sm text-muted-foreground">{fees.error}</p>
            ) : fees.summary ? (
              <div className="flex flex-col gap-1.5 text-sm">
                <div>
                  Last fees paid: {fees.summary.last_paid_at ? formatDate(fees.summary.last_paid_at) : 'No fee history'}
                  {typeof fees.summary.last_paid_amount === 'number' && !Number.isNaN(fees.summary.last_paid_amount) && <> (₹{Number(fees.summary.last_paid_amount).toFixed(2)})</>}
                </div>
                <div>Next fees due: {formatDate(fees.summary.next_due_date)}</div>
                {fees.summary.is_overdue ? (
                  <Badge variant="destructive" className="whitespace-normal">
                    <AlertTriangle aria-hidden="true" />
                    Fees overdue: Due on {formatDate(fees.summary.next_due_date)}
                    {fees.summary.days_overdue ? ` (${fees.summary.days_overdue} days overdue)` : ''}
                  </Badge>
                ) : (
                  <Badge variant="success" className="whitespace-normal">
                    <CheckCircle2 aria-hidden="true" />
                    {new Date(fees.summary.next_due_date).toDateString() === new Date().toDateString() ? 'Due today' : `Paid - Next due on ${formatDate(fees.summary.next_due_date)}`}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">No fee history available.</p>
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
        <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-3 rounded-xl bg-muted/50 p-4">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="m-0 text-sm font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
