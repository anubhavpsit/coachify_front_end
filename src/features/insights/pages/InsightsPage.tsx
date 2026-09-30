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
          'tw:group tw:m-0 tw:flex tw:w-full tw:cursor-pointer tw:items-center tw:gap-4 tw:rounded-lg tw:border tw:border-solid tw:px-3 tw:py-2.5 tw:text-left tw:transition-colors tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
          selected ? 'tw:border-primary/40 tw:bg-primary-soft' : 'tw:border-transparent tw:bg-transparent tw:hover:bg-muted/60',
        )}
      >
        <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-1.5">
          <div className="tw:flex tw:items-baseline tw:justify-between tw:gap-3">
            <span className="tw:truncate tw:text-sm tw:font-medium tw:text-foreground">{s.subject}</span>
            <span className="tw:shrink-0 tw:text-xs tw:text-muted-foreground tw:tabular-nums">
              {s.activity_count} · <span className="tw:font-semibold tw:text-foreground">{pct}%</span>
            </span>
          </div>
          <div className="tw:h-2 tw:overflow-hidden tw:rounded-full tw:bg-muted" aria-hidden="true">
            <m.div className="tw:h-full tw:rounded-full tw:bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          </div>
        </div>
        <ChevronRight className={cn('tw:size-4 tw:shrink-0 tw:transition-transform', selected ? 'tw:text-primary' : 'tw:text-muted-foreground tw:group-hover:translate-x-0.5')} aria-hidden="true" />
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
    <div className="tw:flex tw:flex-col tw:gap-6">
      <PageHeader
        title={`Insights (${windowLabel(days)})`}
        description="How daily activities are spread across subjects and chapters."
        className="tw:mb-0"
        actions={
          <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
            <SegmentedControl label="Time window" size="sm" value={win} onChange={setWin} options={[...WINDOWS]} />
            <Button variant="outline" size="sm" onClick={subjects.reload} disabled={subjects.loading}>
              <RefreshCw className={cn(subjects.loading && 'tw:animate-spin tw:motion-reduce:animate-none')} aria-hidden="true" /> Refresh
            </Button>
          </div>
        }
      />

      <m.div className="tw:grid tw:items-start tw:gap-4 tw:lg:grid-cols-12 tw:*:min-w-0" variants={stagger(0.06)} initial="hidden" animate="visible">
        <m.div variants={slideUp} className="tw:flex tw:flex-col tw:gap-4 tw:lg:col-span-7">
          <Card>
            <CardHeader>
              <CardTitle className="tw:flex tw:items-center tw:gap-2">
                <Layers className="tw:size-4 tw:text-primary" aria-hidden="true" /> Subject Coverage
              </CardTitle>
              <CardDescription>{total > 0 ? `${total} activities in this window. Select a subject to see its chapters.` : 'Activity count and share per subject.'}</CardDescription>
            </CardHeader>
            <CardContent>
              {subjects.loading && !subjects.data ? (
                <div className="tw:flex tw:flex-col tw:gap-3" role="status" aria-label="Loading subjects">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="tw:h-10" />
                  ))}
                </div>
              ) : subjects.error ? (
                <ErrorState title="Unable to load insights." onRetry={subjects.reload} className="tw:border-0 tw:shadow-none" />
              ) : items.length === 0 ? (
                <EmptyState icon={Layers} title="No activity in this window." description="Try a longer time window." />
              ) : (
                <ul className={cn('tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-1 tw:p-0 tw:transition-opacity', subjects.loading && 'tw:opacity-60')}>
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
                <p className="tw:m-0 tw:text-xs">AI-generated suggestions based on recent activity patterns.</p>
                <ul className="tw:m-0 tw:mt-1 tw:flex tw:list-disc tw:flex-col tw:gap-0.5 tw:pl-4">
                  {notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </m.div>

        <m.div ref={chaptersRef} variants={slideUp} className="tw:scroll-mt-20 tw:lg:sticky tw:lg:top-20 tw:lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="tw:flex tw:items-center tw:gap-2">
                <BookMarked className="tw:size-4 tw:text-primary" aria-hidden="true" /> Chapters{selected ? `: ${selected.subject}` : ''}
              </CardTitle>
              {!selected && <CardDescription>(select subject)</CardDescription>}
            </CardHeader>
            <CardContent>
              {!selected ? (
                <EmptyState icon={BookMarked} title="Choose a subject to see chapters." />
              ) : chapters.loading ? (
                <div className="tw:flex tw:flex-col tw:gap-2" role="status" aria-label="Loading chapters">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="tw:h-8" />
                  ))}
                </div>
              ) : chapters.error ? (
                <ErrorState title="Unable to load chapters." onRetry={chapters.reload} className="tw:border-0 tw:shadow-none" />
              ) : (chapters.data ?? []).length === 0 ? (
                <EmptyState icon={BookMarked} title="No chapter activity in this window." />
              ) : (
                <ol className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:p-0">
                  {chapters.data!.map((c, i) => (
                    <li key={i} className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:py-2.5 tw:text-sm">
                      <span className="tw:min-w-0 tw:break-words">{c.chapter}</span>
                      <span className="tw:shrink-0 tw:rounded-full tw:bg-muted tw:px-2 tw:py-0.5 tw:text-xs tw:font-semibold tw:tabular-nums">{c.activity_count}</span>
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
