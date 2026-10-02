import { Trophy } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/utils/date'
import type { TopStudent } from '../types'

const MEDALS = ['bg-amber-400 text-amber-950', 'bg-slate-300 text-slate-900', 'bg-orange-300 text-orange-950']

/** Rendered only with `dashboard.top_students` (gate lives in the page). */
export default function TopStudentsCard({ students, loading }: { students: TopStudent[]; loading: boolean }) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>Top Performing Students</CardTitle>
        <CardDescription>Ranked by average assessment score</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="flex flex-col gap-3 px-5 pb-5" role="status" aria-label="Loading top students">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState icon={Trophy} title="No assessment results available yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Average %</TableHead>
                <TableHead className="text-right">Last %</TableHead>
                <TableHead>Last Assessed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s, index) => (
                <TableRow key={s.student_id}>
                  <TableCell>
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${MEDALS[index] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.student_name ?? 'Unknown'}</span>
                      {s.student_status && (
                        <Badge variant={s.student_status === 'active' ? 'success' : 'secondary'} className="capitalize">
                          {s.student_status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{s.average_percentage.toFixed(2)}%</TableCell>
                  <TableCell className="text-right tabular-nums">{s.last_percentage.toFixed(2)}%</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(s.last_graded_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
