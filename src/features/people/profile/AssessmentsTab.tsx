import { ClipboardList } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import { fetchAssessmentSummary } from './profileService'

const tone = (pct: number) => (pct < 40 ? 'tw:text-destructive' : pct >= 80 ? 'tw:text-success' : 'tw:text-foreground')

/** Viewed user is a student; viewer is coaching_admin or teacher (gate in the dialog). */
export default function AssessmentsTab({ studentId }: { studentId: number }) {
  const { data, loading, error } = useAsync(() => fetchAssessmentSummary(studentId), [studentId])
  if (loading)
    return (
      <div className="tw:grid tw:grid-cols-2 tw:gap-2 tw:sm:grid-cols-4" role="status" aria-label="Loading assessments">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="tw:h-16" />
        ))}
      </div>
    )
  if (error) return <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">Unable to load assessments summary.</p>
  if (!data) return <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No data available.</p>

  const tiles: Array<[string, string]> = [
    ['Completed', String(data.completed_count)],
    ['Average', typeof data.average_percentage === 'number' ? `${data.average_percentage.toFixed(2)}%` : '-'],
    ['Last Assessment', formatDate(data.last_assessment_date, 'NA')],
    ['Next Assessment', formatDate(data.next_assessment_date, 'NA')],
  ]
  const last = data.last_result

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <div className="tw:grid tw:grid-cols-2 tw:gap-2 tw:sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-3">
            <div className="tw:text-xs tw:text-muted-foreground">{label}</div>
            <div className="tw:text-base tw:font-bold tw:text-foreground">{value}</div>
          </div>
        ))}
      </div>
      <div className="tw:rounded-lg tw:bg-muted/50 tw:p-3">
        <div className="tw:mb-1 tw:text-xs tw:text-muted-foreground">Last Result</div>
        {!last ? (
          <div className="tw:text-sm tw:text-muted-foreground">—</div>
        ) : (
          <div className="tw:flex tw:items-center tw:justify-between tw:gap-3">
            <div>
              <div className="tw:font-medium tw:text-foreground">{last.subject || 'Subject'}</div>
              <div className="tw:text-sm tw:text-muted-foreground">{last.title || '-'}</div>
            </div>
            <div className="tw:text-right">
              <div className={cn('tw:text-xl tw:font-bold', tone(last.percentage))}>{Math.round(last.percentage)}%</div>
              <div className="tw:text-xs tw:text-muted-foreground">{formatDate(last.attempted_at || last.graded_at)}</div>
            </div>
          </div>
        )}
      </div>
      {data.recent_results.length > 0 ? (
        <div className="tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="tw:text-right">%</TableHead>
                <TableHead className="tw:text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_results.map((r) => (
                <TableRow key={r.assignment_id}>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell className={cn('tw:text-right tw:font-semibold', tone(r.percentage))}>{Math.round(r.percentage)}%</TableCell>
                  <TableCell className="tw:text-right tw:text-muted-foreground">{formatDate(r.attempted_at || r.graded_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={ClipboardList} title="No recent results." />
      )}
    </div>
  )
}
