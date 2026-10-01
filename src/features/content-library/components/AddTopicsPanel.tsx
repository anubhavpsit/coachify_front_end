import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Plus, Search } from 'lucide-react'
import EmptyState from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Topic } from '../services/contentLibraryService'

interface Props {
  topics: Topic[]
  loading: boolean
  adding: boolean
  /** Resolves true when saved (the selection is then cleared). */
  onAdd: (ids: number[], moving: number) => Promise<boolean>
  onCreate: () => void
}

/** Pick existing topics of this subject to put in the chapter (own topics only — same rule as before). */
export default function AddTopicsPanel({ topics, loading, adding, onAdd, onCreate }: Props) {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? topics.filter((t) => t.name.toLowerCase().includes(s)) : topics
  }, [topics, q])
  // Ignore selections that are no longer offered (e.g. after they were added).
  const chosen = topics.filter((t) => selected.has(t.id))
  const moving = chosen.filter((t) => t.chapter_id).length
  const allShown = shown.length > 0 && shown.every((t) => selected.has(t.id))

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Card className="tw:gap-4">
      <CardHeader>
        <CardTitle>Add existing topics</CardTitle>
        <CardDescription>Your topics in this subject that aren&apos;t in this chapter yet.</CardDescription>
      </CardHeader>
      <CardContent className="tw:flex tw:flex-col tw:gap-3">
        {loading ? (
          <div className="tw:flex tw:flex-col tw:gap-2" role="status" aria-label="Loading topics">
            <Skeleton className="tw:h-10" />
            <Skeleton className="tw:h-10" />
          </div>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No other topics to add."
            description="Create a new topic right here — it will be placed in this chapter."
            action={
              <Button size="sm" variant="soft" onClick={onCreate}>
                <Plus aria-hidden="true" /> New topic
              </Button>
            }
            className="tw:py-4"
          />
        ) : (
          <>
            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
              <div className="tw:relative tw:min-w-48 tw:flex-1">
                <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
                <Input type="search" className="tw:h-9 tw:pl-9" placeholder="Search topics" aria-label="Search topics to add" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <label className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:text-sm">
                <Checkbox
                  checked={allShown}
                  disabled={shown.length === 0}
                  onCheckedChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      shown.forEach((t) => (allShown ? next.delete(t.id) : next.add(t.id)))
                      return next
                    })
                  }
                />
                Select all{q ? ' shown' : ''}
              </label>
            </div>
            <ul className="tw:m-0 tw:flex tw:max-h-80 tw:list-none tw:flex-col tw:divide-y tw:divide-border tw:overflow-y-auto tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-0">
              {shown.length === 0 ? (
                <li className="tw:px-3 tw:py-3 tw:text-sm tw:text-muted-foreground">No topics match “{q}”.</li>
              ) : (
                shown.map((t) => (
                  <li key={t.id}>
                    <label className={cn('tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-3 tw:px-3 tw:py-2.5 tw:text-sm tw:hover:bg-muted/50', selected.has(t.id) && 'tw:bg-primary-soft/50')}>
                      <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                      <span className="tw:min-w-0 tw:flex-1 tw:font-medium tw:text-foreground">{t.name}</span>
                      <span className="tw:text-xs tw:text-muted-foreground">{t.grade ? `Grade ${t.grade}` : 'All grades'}</span>
                      {t.chapter_id && (
                        <Badge variant="warning" title="Adding it here moves it out of its current chapter">
                          <ArrowRightLeft aria-hidden="true" /> in {t.chapter?.name ?? 'another chapter'}
                        </Badge>
                      )}
                    </label>
                  </li>
                ))
              )}
            </ul>
            <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3">
              {moving > 0 && (
                <span className="tw:text-xs tw:text-warning">
                  {moving} selected {moving === 1 ? 'topic is' : 'topics are'} in another chapter and will move here.
                </span>
              )}
              <span className="tw:ml-auto tw:hidden tw:text-xs tw:text-muted-foreground tw:sm:inline">
                Need something new?{' '}
                <button type="button" onClick={onCreate} className="tw:m-0 tw:cursor-pointer tw:border-0 tw:bg-transparent tw:p-0 tw:text-xs tw:font-medium tw:text-primary tw:hover:underline">
                  Create a topic
                </button>{' '}
                or open{' '}
                <Link to="/topics" className="tw:font-medium tw:text-primary tw:no-underline tw:hover:underline">
                  all topics
                </Link>
                .
              </span>
              <Button
                type="button"
                variant="success"
                loading={adding}
                disabled={adding || chosen.length === 0}
                onClick={async () => {
                  if (
                    await onAdd(
                      chosen.map((t) => t.id),
                      moving,
                    )
                  )
                    setSelected(new Set())
                }}
              >
                <Plus aria-hidden="true" /> {adding ? 'Adding…' : chosen.length ? `Add ${chosen.length} ${chosen.length === 1 ? 'topic' : 'topics'}` : 'Add topics'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
