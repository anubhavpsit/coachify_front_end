import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Styled native <select>: accessible, mobile-friendly, works with react-hook-form register(). */
function NativeSelect({ className, size = 'default', ...props }: Omit<React.ComponentProps<'select'>, 'size'> & { size?: 'default' | 'sm' }) {
  return (
    <div className={cn('relative inline-flex w-full', className)}>
      <select
        data-slot="native-select"
        className={cn(
          'm-0 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-solid border-input bg-card pr-9 pl-3 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow]',
          'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50',
          // Template CSS resets select padding/font; a line-height equal to the inner
          // height (minus the 2px border) keeps the text vertically centred.
          size === 'sm' ? 'h-8 py-0 leading-[30px]' : 'h-10 py-0 leading-[38px]',
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  )
}

export { NativeSelect }
