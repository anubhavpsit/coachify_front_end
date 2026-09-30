import * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const Popover = (props: React.ComponentProps<typeof PopoverPrimitive.Root>) => <PopoverPrimitive.Root data-slot="popover" {...props} />
const PopoverTrigger = (props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) => (
  <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
)

function PopoverContent({ className, align = 'center', sideOffset = 6, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'tw:z-[1100] tw:w-72 tw:rounded-lg tw:border tw:border-solid tw:border-border tw:bg-popover tw:p-4 tw:text-popover-foreground tw:shadow-lg tw:outline-none',
          'tw:origin-(--radix-popover-content-transform-origin) tw:data-[state=open]:animate-in tw:data-[state=open]:fade-in-0 tw:data-[state=open]:zoom-in-95 tw:data-[state=closed]:animate-out tw:data-[state=closed]:fade-out-0 tw:data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
