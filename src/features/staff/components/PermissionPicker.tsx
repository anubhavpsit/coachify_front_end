import { useId, useState } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { PermissionGroup } from '../services/staffService'

/** Grouped permission checkboxes with a filter box (same behaviour as the legacy picker). */
export default function PermissionPicker({ groups, selected, onChange }: { groups: PermissionGroup[]; selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('')
  const baseId = useId()

  if (groups.length === 0) {
    return (
      <div className="tw:flex tw:flex-col tw:gap-2" role="status" aria-label="Loading permissions">
        <Skeleton className="tw:h-9" />
        <Skeleton className="tw:h-24" />
      </div>
    )
  }

  const toggle = (key: string) => onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  const toggleGroup = (keys: string[], allOn: boolean) =>
    onChange(allOn ? selected.filter((k) => !keys.includes(k)) : Array.from(new Set([...selected, ...keys])))

  const q = query.trim().toLowerCase()
  const filtered = q
    ? groups
        .map((g) => ({
          ...g,
          permissions: g.permissions.filter((p) => p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || g.group.toLowerCase().includes(q)),
        }))
        .filter((g) => g.permissions.length > 0)
    : groups

  return (
    <div className="tw:flex tw:flex-col tw:gap-2">
      <div className="tw:flex tw:items-center tw:gap-2">
        <div className="tw:relative tw:flex-1">
          <Search className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
          <Input type="search" className="tw:h-9 tw:pl-9" placeholder="Search permissions…" aria-label="Search permissions" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Badge variant="soft">{selected.length} selected</Badge>
      </div>
      <div className="tw:max-h-72 tw:overflow-y-auto tw:rounded-lg tw:border tw:border-solid tw:border-border tw:p-2">
        {filtered.length === 0 ? (
          <p className="tw:m-0 tw:p-2 tw:text-sm tw:text-muted-foreground">No permissions match “{query}”.</p>
        ) : (
          filtered.map((g) => {
            const keys = g.permissions.map((p) => p.key)
            const onCount = keys.filter((k) => selected.includes(k)).length
            const allOn = onCount === keys.length
            return (
              <fieldset key={g.group} className="tw:m-0 tw:mb-2 tw:border-0 tw:p-0 tw:last:mb-0">
                <div className="tw:sticky tw:top-0 tw:z-10 tw:flex tw:items-center tw:justify-between tw:rounded-md tw:bg-muted/80 tw:px-2 tw:py-1.5 tw:backdrop-blur">
                  <legend className="tw:float-left tw:m-0 tw:w-auto tw:p-0 tw:text-sm tw:font-semibold tw:text-foreground">
                    {g.group}
                    <span className="tw:ml-2 tw:text-xs tw:font-normal tw:text-muted-foreground">
                      {onCount}/{keys.length}
                    </span>
                  </legend>
                  <Button type="button" variant="link" size="sm" className="tw:h-auto tw:p-0" onClick={() => toggleGroup(keys, allOn)}>
                    {allOn ? 'Clear' : 'Select all'}
                  </Button>
                </div>
                <div className="tw:grid tw:gap-x-4 tw:gap-y-1 tw:px-2 tw:pt-1.5 tw:sm:grid-cols-2">
                  {g.permissions.map((p) => {
                    const id = `${baseId}-${p.key}`
                    return (
                      <label key={p.key} htmlFor={id} className="tw:m-0 tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:py-1 tw:text-sm tw:text-foreground" title={p.key}>
                        <Checkbox id={id} checked={selected.includes(p.key)} onCheckedChange={() => toggle(p.key)} />
                        {p.label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            )
          })
        )}
      </div>
    </div>
  )
}
