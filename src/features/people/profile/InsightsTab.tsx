import { useState } from 'react'
import { BarChart3, Lightbulb } from 'lucide-react'
import { m } from 'motion/react'
import { transitions } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import SegmentedControl from '@/components/common/SegmentedControl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { fetchInsightChapters, fetchInsightSubjects } from './profileService'

const WINDOWS = [
  { value: '1', label: 'Today' },
  { value: '3', label: '3d' },
  { value: '7', label: '7d' },
  { value: '14', label: '14d' },
]

/** Activity insights for a student (viewer coaching_admin or teacher). Same requests and windows as before. */
export default function InsightsTab({ studentId }: { studentId: number }) {
  const [windowDays, setWindowDays] = useState(7)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const subjects = useAsync(() => fetchInsightSubjects(studentId, windowDays).catch(() => ({ items: [], notes: [] })), [studentId, windowDays])
  const chapters = useAsync(() => fetchInsightChapters(studentId, windowDays, subjectId!).catch(() => []), [studentId, windowDays, subjectId], {
    enabled: subjectId !== null,
  })
  const items = subjects.data?.items ?? []
  const total = items.reduce((acc, it) => acc + it.activity_count, 0) || 1
  const top = items.length ? items.reduce((a, b) => (a.activity_count >= b.activity_count ? a : b)) : null
  const least = items.length > 1 ? items.reduce((a, b) => (a.activity_count <= b.activity_count ? a : b)) : null

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <SegmentedControl size="sm" label="Insights window" value={String(windowDays)} onChange={(v) => setWindowDays(Number(v))} options={WINDOWS} className="tw:self-start" />
      {subjects.loading ? (
        <div className="tw:flex tw:flex-col tw:gap-2" role="status" aria-label="Loading insights">
          <Skeleton className="tw:h-16" />
          <Skeleton className="tw:h-24" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No activity in this window." />
      ) : (
        <>
          <div className="tw:grid tw:gap-2 tw:sm:grid-cols-2">
            {top && (
              <div className="tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-3">
                <div className="tw:text-xs tw:text-muted-foreground">Top Subject</div>
                <div className="tw:flex tw:items-baseline tw:justify-between">
                  <span className="tw:font-semibold">{top.subject}</span>
                  <span className="tw:text-sm tw:text-muted-foreground">{Math.round((top.activity_count / total) * 100)}%</span>
                </div>
              </div>
            )}
            {least && (
              <div className="tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-3">
                <div className="tw:text-xs tw:text-muted-foreground">Least Covered</div>
                <div className="tw:flex tw:items-baseline tw:justify-between">
                  <span className="tw:font-semibold">{least.subject}</span>
                  <span className="tw:text-sm tw:text-muted-foreground">{Math.round((least.activity_count / total) * 100)}%</span>
                </div>
              </div>
            )}
          </div>
          {(subjects.data?.notes ?? []).map((n, i) => (
            <Alert key={i} variant="warning">
              <Lightbulb aria-hidden="true" />
              <AlertDescription>{n}</AlertDescription>
            </Alert>
          ))}
          <ul className="tw:m-0 tw:flex tw:max-h-60 tw:list-none tw:flex-col tw:gap-2 tw:overflow-y-auto tw:p-0">
            {items.map((s) => {
              const pct = Math.round((s.activity_count / total) * 100)
              const series = s.series || []
              const maxVal = series.length ? Math.max(...series) || 1 : 1
              const selected = subjectId === s.subject_id
              return (
                <li key={s.subject_id}>
                  <button
                    type="button"
                    onClick={() => setSubjectId(s.subject_id)}
                    aria-pressed={selected}
                    className={cn(
                      'tw:m-0 tw:w-full tw:cursor-pointer tw:rounded-lg tw:border tw:border-solid tw:bg-transparent tw:p-3 tw:text-left tw:outline-none tw:transition-colors tw:hover:bg-accent tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
                      selected ? 'tw:border-primary tw:bg-primary-soft/50' : 'tw:border-border',
                    )}
                  >
                    <div className="tw:mb-1.5 tw:flex tw:items-center tw:justify-between">
                      <span className="tw:font-medium tw:text-foreground">{s.subject}</span>
                      <span className="tw:flex tw:items-center tw:gap-2 tw:text-xs tw:text-muted-foreground">
                        {s.activity_count} • {pct}%{selected && <Badge variant="soft">Selected</Badge>}
                      </span>
                    </div>
                    <div className="tw:h-2 tw:overflow-hidden tw:rounded-full tw:bg-muted">
                      <m.div className="tw:h-full tw:origin-left tw:rounded-full tw:bg-primary" style={{ width: `${pct}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={transitions.slow} />
                    </div>
                    {series.length > 0 && (
                      <div className="tw:mt-2 tw:flex tw:h-5 tw:items-end tw:gap-0.5" aria-hidden="true">
                        {series.map((v, idx) => (
                          <div key={idx} className="tw:w-1 tw:rounded-sm tw:bg-primary/60" style={{ height: Math.max(2, Math.round((v / maxVal) * 20)) }} />
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <section className="tw:flex tw:flex-col tw:gap-2">
            <h3 className="tw:m-0 tw:text-sm! tw:font-semibold">
              {subjectId === null ? 'Chapters (select a subject)' : `Chapters — ${items.find((it) => it.subject_id === subjectId)?.subject ?? ''}`}
            </h3>
            {subjectId === null ? (
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">Choose a subject to see chapters.</p>
            ) : chapters.loading ? (
              <Skeleton className="tw:h-20" />
            ) : (chapters.data ?? []).length === 0 ? (
              <p className="tw:m-0 tw:text-sm tw:text-muted-foreground">No chapter activity in this window.</p>
            ) : (
              <div className="tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chapter</TableHead>
                      <TableHead className="tw:text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(chapters.data ?? []).map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{c.chapter}</TableCell>
                        <TableCell className="tw:text-right tw:tabular-nums">{c.activity_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
