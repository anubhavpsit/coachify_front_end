import * as React from 'react'
import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="tw:relative tw:w-full tw:overflow-x-auto">
      <table data-slot="table" className={cn('tw:m-0 tw:w-full tw:caption-bottom tw:border-collapse tw:text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('tw:[&_tr]:border-b tw:[&_tr]:border-solid tw:[&_tr]:border-border', className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('tw:[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn('tw:border-0 tw:border-b tw:border-solid tw:border-border tw:transition-colors tw:hover:bg-muted/50 tw:data-[state=selected]:bg-muted', className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn('tw:h-10 tw:whitespace-nowrap tw:bg-muted/60 tw:px-4 tw:text-left tw:align-middle tw:text-xs tw:font-semibold tw:uppercase tw:tracking-wide tw:text-muted-foreground', className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('tw:whitespace-nowrap tw:px-4 tw:py-3 tw:align-middle tw:text-foreground', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
