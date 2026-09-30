import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Styled native <select>: accessible, mobile-friendly, works with react-hook-form register(). */
function NativeSelect({ className, size = 'default', ...props }: Omit<React.ComponentProps<'select'>, 'size'> & { size?: 'default' | 'sm' }) {
  return (
    <div className={cn('tw:relative tw:inline-flex tw:w-full', className)}>
      <select
        data-slot="native-select"
        className={cn(
          'tw:m-0 tw:w-full tw:min-w-0 tw:cursor-pointer tw:appearance-none tw:rounded-md tw:border tw:border-solid tw:border-input tw:bg-card tw:pr-9 tw:pl-3 tw:text-sm tw:text-foreground tw:shadow-xs tw:outline-none tw:transition-[border-color,box-shadow]',
          'tw:focus-visible:border-primary tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/40 tw:aria-invalid:border-destructive tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
          // Template CSS resets select padding/font; a line-height equal to the inner
          // height (minus the 2px border) keeps the text vertically centred.
          size === 'sm' ? 'tw:h-8 tw:py-0 tw:leading-[30px]' : 'tw:h-10 tw:py-0 tw:leading-[38px]',
        )}
        {...props}
      />
      <ChevronDown className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:right-3 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" aria-hidden="true" />
    </div>
  )
}

export { NativeSelect }
