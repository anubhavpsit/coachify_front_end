import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'tw:peer tw:m-0 tw:inline-flex tw:h-5 tw:w-9 tw:shrink-0 tw:cursor-pointer tw:items-center tw:rounded-full tw:border tw:border-solid tw:border-transparent tw:p-0 tw:shadow-xs tw:outline-none tw:transition-colors tw:duration-200',
        'tw:data-[state=checked]:bg-primary tw:data-[state=unchecked]:bg-input tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:disabled:cursor-not-allowed tw:disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="tw:pointer-events-none tw:block tw:size-4 tw:rounded-full tw:bg-white tw:shadow-sm tw:ring-0 tw:transition-transform tw:duration-200 tw:ease-standard tw:data-[state=checked]:translate-x-[calc(100%-2px)] tw:data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
