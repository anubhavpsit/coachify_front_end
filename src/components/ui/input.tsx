import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-10 w-full min-w-0 m-0 rounded-md border border-solid border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150',
        'placeholder:text-muted-foreground/60 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
