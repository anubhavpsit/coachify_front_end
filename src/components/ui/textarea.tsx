import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'm-0 flex field-sizing-content min-h-24 w-full rounded-md border border-solid border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow]',
        'placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
