import * as React from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const DropdownMenu = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) => (
  <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
)
const DropdownMenuTrigger = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) => (
  <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
)
const DropdownMenuGroup = (props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) => (
  <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
)

function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'tw:z-[1100] tw:min-w-[10rem] tw:max-h-(--radix-dropdown-menu-content-available-height) tw:overflow-y-auto tw:overflow-x-hidden tw:rounded-lg tw:border tw:border-solid tw:border-border tw:bg-popover tw:p-1 tw:text-popover-foreground tw:shadow-lg',
          'tw:origin-(--radix-dropdown-menu-content-transform-origin) tw:data-[state=open]:animate-in tw:data-[state=open]:fade-in-0 tw:data-[state=open]:zoom-in-95 tw:data-[state=closed]:animate-out tw:data-[state=closed]:fade-out-0 tw:data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; variant?: 'default' | 'destructive' }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        'tw:relative tw:flex tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded-md tw:px-2 tw:py-2 tw:text-sm tw:text-foreground tw:outline-none tw:select-none',
        'tw:focus:bg-accent tw:focus:text-accent-foreground tw:data-disabled:pointer-events-none tw:data-disabled:opacity-50',
        'tw:data-[variant=destructive]:text-destructive tw:data-[variant=destructive]:focus:bg-destructive-soft tw:data-[variant=destructive]:focus:text-destructive',
        'tw:[&_svg]:pointer-events-none tw:[&_svg]:shrink-0 tw:[&_svg:not([class*=size-])]:size-4',
        inset && 'tw:pl-8',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" className={cn('tw:px-2 tw:py-1.5 tw:text-sm tw:font-medium', className)} {...props} />
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn('tw:-mx-1 tw:my-1 tw:h-px tw:bg-border', className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
}
