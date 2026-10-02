import { cn } from '@/lib/utils'
import type { Subject } from '../services/libraryService'

/** Subject picker as pill buttons (the teacher usually has a handful). `allLabel` adds an "all" pill. */
export default function SubjectChips({ subjects, value, onChange, allLabel }: { subjects: Subject[]; value: string; onChange: (v: string) => void; allLabel?: string }) {
  const items: [string, string][] = [...(allLabel ? [['', allLabel] as [string, string]] : []), ...subjects.map((s) => [String(s.id), s.subject] as [string, string])]
  return (
    <div role="group" aria-label="Subject" className="tw:flex tw:flex-wrap tw:gap-1.5">
      {items.map(([id, name]) => (
        <button
          key={id || 'all'}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'tw:m-0 tw:cursor-pointer tw:rounded-full tw:border tw:border-solid tw:px-3 tw:py-1 tw:text-sm tw:font-medium tw:transition-colors tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
            value === id ? 'tw:border-primary tw:bg-primary tw:text-primary-foreground' : 'tw:border-border tw:bg-transparent tw:text-muted-foreground tw:hover:bg-muted',
          )}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
