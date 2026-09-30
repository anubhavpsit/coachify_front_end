import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'tw:flex tw:h-10 tw:w-full tw:min-w-0 tw:m-0 tw:rounded-md tw:border tw:border-solid tw:border-input tw:bg-card tw:px-3 tw:py-2 tw:text-sm tw:text-foreground tw:shadow-xs tw:outline-none tw:transition-[border-color,box-shadow] tw:duration-150',
        'tw:placeholder:text-muted-foreground tw:file:border-0 tw:file:bg-transparent tw:file:text-sm tw:file:font-medium',
        'tw:focus-visible:border-primary tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/40',
        'tw:aria-invalid:border-destructive tw:aria-invalid:ring-destructive/20',
        'tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
