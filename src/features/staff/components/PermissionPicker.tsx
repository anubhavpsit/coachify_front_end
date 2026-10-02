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
      <div className="flex flex-col gap-2" role="status" aria-label="Loading permissions">
        <Skeleton className="h-9" />
        <Skeleton className="h-24" />
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" className="h-9 pl-9" placeholder="Search permissions…" aria-label="Search permissions" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Badge variant="soft">{selected.length} selected</Badge>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-lg border border-solid border-border p-2">
        {filtered.length === 0 ? (
          <p className="m-0 p-2 text-sm text-muted-foreground">No permissions match “{query}”.</p>
        ) : (
          filtered.map((g) => {
            const keys = g.permissions.map((p) => p.key)
            const onCount = keys.filter((k) => selected.includes(k)).length
            const allOn = onCount === keys.length
            return (
              <fieldset key={g.group} className="m-0 mb-2 border-0 p-0 last:mb-0">
                <div className="sticky top-0 z-10 flex items-center justify-between rounded-md bg-muted/80 px-2 py-1.5 backdrop-blur">
                  <legend className="float-left m-0 w-auto p-0 text-sm font-semibold text-foreground">
                    {g.group}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {onCount}/{keys.length}
                    </span>
                  </legend>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => toggleGroup(keys, allOn)}>
                    {allOn ? 'Clear' : 'Select all'}
                  </Button>
                </div>
                <div className="grid gap-x-4 gap-y-1 px-2 pt-1.5 sm:grid-cols-2">
                  {g.permissions.map((p) => {
                    const id = `${baseId}-${p.key}`
                    return (
                      <label key={p.key} htmlFor={id} className="m-0 flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground" title={p.key}>
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
