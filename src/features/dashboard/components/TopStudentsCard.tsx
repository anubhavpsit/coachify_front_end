import { Trophy } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/utils/date'
import type { TopStudent } from '../types'

const MEDALS = ['tw:bg-amber-400 tw:text-amber-950', 'tw:bg-slate-300 tw:text-slate-900', 'tw:bg-orange-300 tw:text-orange-950']

/** Rendered only with `dashboard.top_students` (gate lives in the page). */
export default function TopStudentsCard({ students, loading }: { students: TopStudent[]; loading: boolean }) {
  return (
    <Card className="tw:gap-0 tw:pb-0">
      <CardHeader className="tw:pb-4">
        <CardTitle>Top Performing Students</CardTitle>
        <CardDescription>Ranked by average assessment score</CardDescription>
      </CardHeader>
      <CardContent className="tw:px-0">
        {loading ? (
          <div className="tw:flex tw:flex-col tw:gap-3 tw:px-5 tw:pb-5" role="status" aria-label="Loading top students">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="tw:h-9" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState icon={Trophy} title="No assessment results available yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw:w-14">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="tw:text-right">Average %</TableHead>
                <TableHead className="tw:text-right">Last %</TableHead>
                <TableHead>Last Assessed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, index) => (
                <TableRow key={s.student_id}>
                  <TableCell>
                    <span
                      className={`tw:inline-flex tw:size-7 tw:items-center tw:justify-center tw:rounded-full tw:text-xs tw:font-bold ${MEDALS[index] ?? 'tw:bg-muted tw:text-muted-foreground'}`}
                    >
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="tw:flex tw:items-center tw:gap-2">
                      <span className="tw:font-medium">{s.student_name ?? 'Unknown'}</span>
                      {s.student_status && (
                        <Badge variant={s.student_status === 'active' ? 'success' : 'secondary'} className="tw:capitalize">
                          {s.student_status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="tw:text-right tw:font-semibold tw:tabular-nums">{s.average_percentage.toFixed(2)}%</TableCell>
                  <TableCell className="tw:text-right tw:tabular-nums">{s.last_percentage.toFixed(2)}%</TableCell>
                  <TableCell className="tw:text-muted-foreground">{formatDateTime(s.last_graded_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
