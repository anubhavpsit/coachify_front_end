import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronsUpDown, LoaderCircle, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CatalogItem } from '../services/dailyActivitiesService'

interface Props {
  value: { id: number; name: string } | null
  onChange: (item: CatalogItem | null) => void
  /** Called with the search text (debounced); `deps` re-runs it when the scope changes. */
  search: (q: string) => Promise<CatalogItem[]>
  deps: readonly unknown[]
  placeholder: string
  disabledHint: string
  emptyText: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  'aria-describedby'?: string
}

/**
 * Pick-from-list search for the chapter/topic catalogues. Only catalogue items
 * can be chosen (the backend stores ids; free text was silently dropped before).
 */
export default function CatalogCombobox({ value, onChange, search, deps, placeholder, disabledHint, emptyText, disabled, invalid, id, ...aria }: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)
  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  })

  useEffect(() => {
    if (!open || disabled) return
    let alive = true
    const t = window.setTimeout(async () => {
      setLoading(true)
      setFailed(false)
      try {
        const res = await searchRef.current(q.trim())
        if (alive) {
          setItems(res)
          setActive(0)
        }
      } catch {
        if (alive) setFailed(true)
      } finally {
        if (alive) setLoading(false)
      }
    }, 250)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scope changes come in through `deps`
  }, [open, q, disabled, ...deps])

  const choose = (item: CatalogItem) => {
    onChange(item)
    setOpen(false)
    setQ('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[active]) choose(items[active])
    }
  }

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-invalid={invalid || undefined}
            aria-describedby={aria['aria-describedby']}
            disabled={disabled}
            className={cn(
              'm-0 flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-solid border-input bg-transparent pr-9 pl-3 text-left text-sm shadow-xs outline-none transition-[color,box-shadow]',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
              'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
            )}
          >
            <span className={cn('min-w-0 flex-1 truncate', !value && 'text-muted-foreground')}>{disabled ? disabledHint : value ? value.name : placeholder}</span>
            {!value && <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
          <div className="flex items-center gap-2 border-b border-solid border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type to search…"
              aria-label="Search"
              aria-controls={listId}
              aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
              className="m-0 h-10 w-full border-0 bg-transparent p-0 text-sm outline-none"
            />
            {loading && <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />}
          </div>
          <ul id={listId} role="listbox" className="m-0 max-h-60 list-none overflow-y-auto p-1">
            {failed ? (
              <li className="px-3 py-2 text-sm text-destructive">Couldn&apos;t load the list. Try again.</li>
            ) : !loading && items.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
            ) : (
              items.map((it, i) => (
                <li
                  key={it.id}
                  id={`${listId}-${it.id}`}
                  role="option"
                  aria-selected={value?.id === it.id}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(it)}
                  className={cn('flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm', i === active && 'bg-accent')}
                >
                  <Check className={cn('size-4 shrink-0', value?.id === it.id ? 'text-primary' : 'invisible')} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-1.5 text-[10px] font-semibold',
                      it.tenant_id === 0 ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
                    )}
                  >
                    {it.tenant_id === 0 ? 'Base' : 'Custom'}
                  </span>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Clear ${value.name}`}
          className="absolute top-1/2 right-2 m-0 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
