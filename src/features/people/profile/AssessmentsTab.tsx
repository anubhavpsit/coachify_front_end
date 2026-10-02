import { ClipboardList } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/date'
import { fetchAssessmentSummary } from './profileService'

const tone = (pct: number) => (pct < 40 ? 'text-destructive' : pct >= 80 ? 'text-success' : 'text-foreground')

/** Viewed user is a student; viewer is coaching_admin or teacher (gate in the dialog). */
export default function AssessmentsTab({ studentId }: { studentId: number }) {
  const { data, loading, error } = useAsync(() => fetchAssessmentSummary(studentId), [studentId])
  if (loading)
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="status" aria-label="Loading assessments">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  if (error) return <p className="m-0 text-sm text-muted-foreground">Unable to load assessments summary.</p>
  if (!data) return <p className="m-0 text-sm text-muted-foreground">No data available.</p>

  const tiles: Array<[string, string]> = [
    ['Completed', String(data.completed_count)],
    ['Average', typeof data.average_percentage === 'number' ? `${data.average_percentage.toFixed(2)}%` : '-'],
    ['Last Assessment', formatDate(data.last_assessment_date, 'NA')],
    ['Next Assessment', formatDate(data.next_assessment_date, 'NA')],
  ]
  const last = data.last_result

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-solid border-border p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-base font-bold text-foreground">{value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="mb-1 text-xs text-muted-foreground">Last Result</div>
        {!last ? (
          <div className="text-sm text-muted-foreground">—</div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-foreground">{last.subject || 'Subject'}</div>
              <div className="text-sm text-muted-foreground">{last.title || '-'}</div>
            </div>
            <div className="text-right">
              <div className={cn('text-xl font-bold', tone(last.percentage))}>{Math.round(last.percentage)}%</div>
              <div className="text-xs text-muted-foreground">{formatDate(last.attempted_at || last.graded_at)}</div>
            </div>
          </div>
        )}
      </div>
      {data.recent_results.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-solid border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_results.map((r) => (
                <TableRow key={r.assignment_id}>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell className={cn('text-right font-semibold', tone(r.percentage))}>{Math.round(r.percentage)}%</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatDate(r.attempted_at || r.graded_at)}</TableCell>
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
