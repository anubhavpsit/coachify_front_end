import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'tw:peer tw:m-0 tw:size-[1.125rem] tw:shrink-0 tw:cursor-pointer tw:rounded-[5px] tw:border tw:border-solid tw:border-input tw:bg-card tw:p-0 tw:shadow-xs tw:outline-none tw:transition-[background-color,border-color,box-shadow] tw:duration-150',
        'tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
        'tw:data-[state=checked]:border-primary tw:data-[state=checked]:bg-primary tw:data-[state=checked]:text-primary-foreground tw:aria-invalid:border-destructive',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="tw:flex tw:items-center tw:justify-center tw:text-current tw:data-[state=checked]:animate-in tw:data-[state=checked]:zoom-in-50 tw:data-[state=checked]:duration-150"
      >
        <Check className="tw:size-3.5" strokeWidth={3} aria-hidden="true" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
