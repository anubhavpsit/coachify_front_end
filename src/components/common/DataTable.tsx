import { useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SearchX, type LucideIcon } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { transitions } from '@/animations'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import EmptyState from './EmptyState'
import Pagination from './Pagination'

export type { ColumnDef } from '@tanstack/react-table'

interface Props<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  loading?: boolean
  /** Stable row id (needed for enter/exit animations). */
  getRowId: (row: T) => string
  /** Show a client-side search box over all string columns. */
  searchPlaceholder?: string
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  emptyIcon?: LucideIcon
  emptyAction?: ReactNode
  /** Client-side page size; omit for no pagination. */
  pageSize?: number
  /** Extra controls rendered next to the search box (filters). */
  toolbar?: ReactNode
  className?: string
  /** Per-row DOM id / extra classes (e.g. a deep-linked row to scroll to and highlight). */
  rowProps?: (row: T) => { id?: string; className?: string }
}

/**
 * Generic list table: search, sortable headers (columns opt out with
 * enableSorting: false), optional client-side pagination, skeleton and empty
 * states. Rows fade in on first load and collapse out when removed; large
 * tables skip per-row animation.
 */
export default function DataTable<T>({
  columns,
  data,
  loading,
  getRowId,
  searchPlaceholder,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  emptyAction,
  pageSize,
  rowProps,
  toolbar,
  className,
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  // TanStack Table returns non-memoizable functions; the React Compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pageSize ? { getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize, pageIndex: 0 } } } : {}),
  })

  const rows = table.getRowModel().rows
  const animateRows = data.length <= 100
  const filteredOut = !loading && data.length > 0 && rows.length === 0

  return (
    <div className={cn('flex flex-col', className)}>
      {(searchPlaceholder || toolbar) && (
        <div className="flex flex-wrap items-end gap-3 border-b border-solid border-border p-4">
          {searchPlaceholder && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value)
                  table.setPageIndex(0)
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-9"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const dir = header.column.getIsSorted()
                const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown
                const label = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())
                const align = (header.column.columnDef.meta as { align?: 'right' | 'center' } | undefined)?.align
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                    className={cn(align === 'right' && 'text-right', align === 'center' && 'text-center')}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="m-0 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-inherit uppercase outline-none hover:text-foreground focus-visible:underline"
                      >
                        {label}
                        <Icon className={cn('size-3.5', dir ? 'text-foreground' : 'opacity-50')} aria-hidden="true" />
                      </button>
                    ) : (
                      label
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading &&
            Array.from({ length: 4 }, (_, i) => (
              <TableRow key={`s${i}`} className="hover:bg-transparent">
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!loading && (
            <AnimatePresence initial={animateRows}>
              {rows.map((row, i) => (
                <m.tr
                  key={row.id}
                  layout={animateRows ? 'position' : false}
                  initial={animateRows ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0, transition: { ...transitions.base, delay: Math.min(i, 10) * 0.025 } }}
                  exit={{ opacity: 0, transition: transitions.fast }}
                  data-slot="table-row"
                  id={rowProps?.(row.original).id}
                  className={cn('border-0 border-b border-solid border-border transition-colors hover:bg-muted/50', rowProps?.(row.original).className)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = (cell.column.columnDef.meta as { align?: 'right' | 'center' } | undefined)?.align
                    return (
                      <TableCell key={cell.id} className={cn(align === 'right' && 'text-right', align === 'center' && 'text-center')}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </m.tr>
              ))}
            </AnimatePresence>
          )}
        </TableBody>
      </Table>

      {!loading && data.length === 0 && <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} className="py-10" />}
      {filteredOut && <EmptyState icon={SearchX} title={`No results for “${globalFilter}”`} className="py-10" />}

      {pageSize && !loading && table.getPageCount() > 1 && (
        <div className="border-t border-solid border-border p-3">
          <Pagination
            page={table.getState().pagination.pageIndex + 1}
            lastPage={table.getPageCount()}
            total={table.getFilteredRowModel().rows.length}
            onPageChange={(p) => table.setPageIndex(p - 1)}
          />
        </div>
      )}
    </div>
  )
}
