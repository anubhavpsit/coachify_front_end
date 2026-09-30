import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'tw:m-0 tw:flex tw:field-sizing-content tw:min-h-24 tw:w-full tw:rounded-md tw:border tw:border-solid tw:border-input tw:bg-card tw:px-3 tw:py-2 tw:text-sm tw:text-foreground tw:shadow-xs tw:outline-none tw:transition-[border-color,box-shadow]',
        'tw:placeholder:text-muted-foreground/60 tw:focus-visible:border-primary tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/40 tw:aria-invalid:border-destructive tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
