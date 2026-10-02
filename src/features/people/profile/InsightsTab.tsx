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
    <div className="flex flex-col gap-4">
      <SegmentedControl size="sm" label="Insights window" value={String(windowDays)} onChange={(v) => setWindowDays(Number(v))} options={WINDOWS} className="self-start" />
      {subjects.loading ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading insights">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={BarChart3} title="No activity in this window." />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {top && (
              <div className="rounded-lg border border-solid border-border p-3">
                <div className="text-xs text-muted-foreground">Top Subject</div>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{top.subject}</span>
                  <span className="text-sm text-muted-foreground">{Math.round((top.activity_count / total) * 100)}%</span>
                </div>
              </div>
            )}
            {least && (
              <div className="rounded-lg border border-solid border-border p-3">
                <div className="text-xs text-muted-foreground">Least Covered</div>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{least.subject}</span>
                  <span className="text-sm text-muted-foreground">{Math.round((least.activity_count / total) * 100)}%</span>
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
          <ul className="m-0 flex max-h-60 list-none flex-col gap-2 overflow-y-auto p-0">
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
                      'm-0 w-full cursor-pointer rounded-lg border border-solid bg-transparent p-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      selected ? 'border-primary bg-primary-soft/50' : 'border-border',
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-medium text-foreground">{s.subject}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {s.activity_count} • {pct}%{selected && <Badge variant="soft">Selected</Badge>}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <m.div className="h-full origin-left rounded-full bg-primary" style={{ width: `${pct}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={transitions.slow} />
                    </div>
                    {series.length > 0 && (
                      <div className="mt-2 flex h-5 items-end gap-0.5" aria-hidden="true">
                        {series.map((v, idx) => (
                          <div key={idx} className="w-1 rounded-sm bg-primary/60" style={{ height: Math.max(2, Math.round((v / maxVal) * 20)) }} />
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <section className="flex flex-col gap-2">
            <h3 className="m-0 text-sm! font-semibold">
              {subjectId === null ? 'Chapters (select a subject)' : `Chapters — ${items.find((it) => it.subject_id === subjectId)?.subject ?? ''}`}
            </h3>
            {subjectId === null ? (
              <p className="m-0 text-sm text-muted-foreground">Choose a subject to see chapters.</p>
            ) : chapters.loading ? (
              <Skeleton className="h-20" />
            ) : (chapters.data ?? []).length === 0 ? (
              <p className="m-0 text-sm text-muted-foreground">No chapter activity in this window.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-solid border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chapter</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(chapters.data ?? []).map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{c.chapter}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.activity_count}</TableCell>
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
