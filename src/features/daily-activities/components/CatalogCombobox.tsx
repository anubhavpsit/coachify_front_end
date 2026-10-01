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
    <div className="tw:relative">
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
              'tw:m-0 tw:flex tw:h-10 tw:w-full tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-solid tw:border-input tw:bg-transparent tw:pr-9 tw:pl-3 tw:text-left tw:text-sm tw:shadow-xs tw:outline-none tw:transition-[color,box-shadow]',
              'tw:focus-visible:border-ring tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
              'tw:aria-invalid:border-destructive tw:aria-invalid:ring-destructive/20',
            )}
          >
            <span className={cn('tw:min-w-0 tw:flex-1 tw:truncate', !value && 'tw:text-muted-foreground')}>{disabled ? disabledHint : value ? value.name : placeholder}</span>
            {!value && <ChevronsUpDown className="tw:size-4 tw:shrink-0 tw:text-muted-foreground" aria-hidden="true" />}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="tw:w-(--radix-popover-trigger-width) tw:min-w-64 tw:p-0">
          <div className="tw:flex tw:items-center tw:gap-2 tw:border-b tw:border-solid tw:border-border tw:px-3">
            <Search className="tw:size-4 tw:shrink-0 tw:text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type to search…"
              aria-label="Search"
              aria-controls={listId}
              aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
              className="tw:m-0 tw:h-10 tw:w-full tw:border-0 tw:bg-transparent tw:p-0 tw:text-sm tw:outline-none"
            />
            {loading && <LoaderCircle className="tw:size-4 tw:shrink-0 tw:animate-spin tw:text-muted-foreground tw:motion-reduce:animate-none" aria-hidden="true" />}
          </div>
          <ul id={listId} role="listbox" className="tw:m-0 tw:max-h-60 tw:list-none tw:overflow-y-auto tw:p-1">
            {failed ? (
              <li className="tw:px-3 tw:py-2 tw:text-sm tw:text-destructive">Couldn&apos;t load the list. Try again.</li>
            ) : !loading && items.length === 0 ? (
              <li className="tw:px-3 tw:py-2 tw:text-sm tw:text-muted-foreground">{emptyText}</li>
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
                  className={cn('tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-sm tw:px-2 tw:py-1.5 tw:text-sm', i === active && 'tw:bg-accent')}
                >
                  <Check className={cn('tw:size-4 tw:shrink-0', value?.id === it.id ? 'tw:text-primary' : 'tw:invisible')} aria-hidden="true" />
                  <span className="tw:min-w-0 tw:flex-1 tw:truncate">{it.name}</span>
                  <span
                    className={cn(
                      'tw:shrink-0 tw:rounded-full tw:px-1.5 tw:text-[10px] tw:font-semibold',
                      it.tenant_id === 0 ? 'tw:bg-success-soft tw:text-success' : 'tw:bg-warning-soft tw:text-warning',
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
          className="tw:absolute tw:top-1/2 tw:right-2 tw:m-0 tw:flex tw:size-6 tw:-translate-y-1/2 tw:cursor-pointer tw:items-center tw:justify-center tw:rounded-sm tw:border-0 tw:bg-transparent tw:p-0 tw:text-muted-foreground tw:hover:bg-muted tw:hover:text-foreground"
        >
          <X className="tw:size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
