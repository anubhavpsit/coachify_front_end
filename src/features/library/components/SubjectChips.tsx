import { cn } from '@/lib/utils'
import type { Subject } from '../services/libraryService'

/** Subject picker as pill buttons (the teacher usually has a handful). `allLabel` adds an "all" pill. */
export default function SubjectChips({ subjects, value, onChange, allLabel }: { subjects: Subject[]; value: string; onChange: (v: string) => void; allLabel?: string }) {
  const items: [string, string][] = [...(allLabel ? [['', allLabel] as [string, string]] : []), ...subjects.map((s) => [String(s.id), s.subject] as [string, string])]
  return (
    <div role="group" aria-label="Subject" className="flex flex-wrap gap-1.5">
      {items.map(([id, name]) => (
        <button
          key={id || 'all'}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'm-0 cursor-pointer rounded-full border border-solid px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            value === id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-transparent text-muted-foreground hover:bg-muted',
          )}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
