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
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Add existing topics</CardTitle>
        <CardDescription>Your topics in this subject that aren&apos;t in this chapter yet.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Loading topics">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
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
            className="py-4"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input type="search" className="h-9 pl-9" placeholder="Search topics" aria-label="Search topics to add" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <label className="m-0 flex items-center gap-2 text-sm">
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
            <ul className="m-0 flex max-h-80 list-none flex-col divide-y divide-border overflow-y-auto rounded-lg border border-solid border-border p-0">
              {shown.length === 0 ? (
                <li className="px-3 py-3 text-sm text-muted-foreground">No topics match “{q}”.</li>
              ) : (
                shown.map((t) => (
                  <li key={t.id}>
                    <label className={cn('m-0 flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50', selected.has(t.id) && 'bg-primary-soft/50')}>
                      <Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} />
                      <span className="min-w-0 flex-1 font-medium text-foreground">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.grade ? `Grade ${t.grade}` : 'All grades'}</span>
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
            <div className="flex flex-wrap items-center gap-3">
              {moving > 0 && (
                <span className="text-xs text-warning">
                  {moving} selected {moving === 1 ? 'topic is' : 'topics are'} in another chapter and will move here.
                </span>
              )}
              <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
                Need something new?{' '}
                <button type="button" onClick={onCreate} className="m-0 cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-primary hover:underline">
                  Create a topic
                </button>{' '}
                or open{' '}
                <Link to="/topics" className="font-medium text-primary no-underline hover:underline">
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
