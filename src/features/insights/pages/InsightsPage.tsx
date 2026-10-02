import { useRef, useState } from 'react'
import { m } from 'motion/react'
import { BookMarked, ChevronRight, Layers, RefreshCw, Sparkles } from 'lucide-react'
import { slideUp, stagger } from '@/animations'
import EmptyState from '@/components/common/EmptyState'
import ErrorState from '@/components/common/ErrorState'
import PageHeader from '@/components/common/PageHeader'
import SegmentedControl from '@/components/common/SegmentedControl'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { fetchChapterInsights, fetchSubjectInsights, type SubjectItem } from '../services/insightsService'

const WINDOWS = [
  { value: '1', label: 'Today' },
  { value: '3', label: '3d' },
  { value: '7', label: '7d' },
  { value: '14', label: '14d' },
  { value: '30', label: '30d' },
  { value: 'all', label: 'All' },
] as const
type WindowKey = (typeof WINDOWS)[number]['value']

const toDays = (w: WindowKey) => (w === 'all' ? null : Number(w))
const windowLabel = (days: number | null) => (days === null ? 'all time' : days === 1 ? 'today' : `last ${days} days`)

function SubjectRow({ s, total, selected, onSelect }: { s: SubjectItem; total: number; selected: boolean; onSelect: () => void }) {
  const pct = total > 0 ? Math.round((s.activity_count / total) * 100) : 0
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`View chapters for ${s.subject}`}
        className={cn(
          'group m-0 flex w-full cursor-pointer items-center gap-4 rounded-lg border border-solid px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          selected ? 'border-primary/40 bg-primary-soft' : 'border-transparent bg-transparent hover:bg-muted/60',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-foreground">{s.subject}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {s.activity_count} · <span className="font-semibold text-foreground">{pct}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <m.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          </div>
        </div>
        <ChevronRight className={cn('size-4 shrink-0 transition-transform', selected ? 'text-primary' : 'text-muted-foreground group-hover:translate-x-0.5')} aria-hidden="true" />
      </button>
    </li>
  )
}

/** Route gate: insights.view | role teacher | student (unchanged). No in-page gates. */
export default function InsightsPage() {
  const [win, setWin] = useState<WindowKey>('7')
  const days = toDays(win)
  const [selected, setSelected] = useState<SubjectItem | null>(null)
  const chaptersRef = useRef<HTMLDivElement>(null)
  const selectSubject = (s: SubjectItem) => {
    setSelected(s)
    // Single-column layout: the chapter list sits below the fold, so bring it into view.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      chaptersRef.current?.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    }
  }
  const subjects = useAsync(() => fetchSubjectInsights(days), [days])
  // Chapters follow the selected window too (legacy kept the previous window's list).
  const chapters = useAsync(() => fetchChapterInsights(days, selected!.subject_id), [days, selected?.subject_id], { enabled: !!selected })

  const items = subjects.data?.items ?? []
  const notes = subjects.data?.notes ?? []
  const total = items.reduce((sum, i) => sum + i.activity_count, 0)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Insights (${windowLabel(days)})`}
        description="How daily activities are spread across subjects and chapters."
        className="mb-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl label="Time window" size="sm" value={win} onChange={setWin} options={[...WINDOWS]} />
            <Button variant="outline" size="sm" onClick={subjects.reload} disabled={subjects.loading}>
              <RefreshCw className={cn(subjects.loading && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" /> Refresh
            </Button>
          </div>
        }
      />

      <m.div className="grid items-start gap-4 lg:grid-cols-12 *:min-w-0" variants={stagger(0.06)} initial="hidden" animate="visible">
        <m.div variants={slideUp} className="flex flex-col gap-4 lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="size-4 text-primary" aria-hidden="true" /> Subject Coverage
              </CardTitle>
              <CardDescription>{total > 0 ? `${total} activities in this window. Select a subject to see its chapters.` : 'Activity count and share per subject.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {subjects.loading && !subjects.data ? (
                <div className="flex flex-col gap-3" role="status" aria-label="Loading subjects">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : subjects.error ? (
                <ErrorState title="Unable to load insights." onRetry={subjects.reload} className="border-0 shadow-none" />
              ) : items.length === 0 ? (
                <EmptyState icon={Layers} title="No activity in this window." description="Try a longer time window." />
              ) : (
                <ul className={cn('m-0 flex list-none flex-col gap-1 p-0 transition-opacity', subjects.loading && 'opacity-60')}>
                  {items.map((s) => (
                    <SubjectRow key={s.subject_id} s={s} total={total} selected={selected?.subject_id === s.subject_id} onSelect={() => selectSubject(s)} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {notes.length > 0 && (
            <Alert variant="warning">
              <Sparkles aria-hidden="true" />
              <AlertTitle>Focus suggestions</AlertTitle>
              <AlertDescription>
                <p className="m-0 text-xs">AI-generated suggestions based on recent activity patterns.</p>
                <ul className="m-0 mt-1 flex list-disc flex-col gap-0.5 pl-4">
                  {notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </m.div>

        <m.div ref={chaptersRef} variants={slideUp} className="scroll-mt-20 lg:sticky lg:top-20 lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="size-4 text-primary" aria-hidden="true" /> Chapters{selected ? `: ${selected.subject}` : ''}
              </CardTitle>
              {!selected && <CardDescription>(select subject)</CardDescription>}
            </CardHeader>
            <CardContent>
              {!selected ? (
                <EmptyState icon={BookMarked} title="Choose a subject to see chapters." />
              ) : chapters.loading ? (
                <div className="flex flex-col gap-2" role="status" aria-label="Loading chapters">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-8" />
                  ))}
                </div>
              ) : chapters.error ? (
                <ErrorState title="Unable to load chapters." onRetry={chapters.reload} className="border-0 shadow-none" />
              ) : (chapters.data ?? []).length === 0 ? (
                <EmptyState icon={BookMarked} title="No chapter activity in this window." />
              ) : (
                <ol className="m-0 flex list-none flex-col divide-y divide-border p-0">
                  {chapters.data!.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0 break-words">{c.chapter}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{c.activity_count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </m.div>
      </m.div>
    </div>
  )
}
