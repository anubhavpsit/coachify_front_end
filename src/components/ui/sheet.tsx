import * as React from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = (props: React.ComponentProps<typeof SheetPrimitive.Root>) => <SheetPrimitive.Root data-slot="sheet" {...props} />
const SheetTrigger = (props: React.ComponentProps<typeof SheetPrimitive.Trigger>) => <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
const SheetClose = (props: React.ComponentProps<typeof SheetPrimitive.Close>) => <SheetPrimitive.Close data-slot="sheet-close" {...props} />

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: 'top' | 'right' | 'bottom' | 'left'; showCloseButton?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="tw:fixed tw:inset-0 tw:z-[1050] tw:bg-black/50 tw:data-[state=open]:animate-in tw:data-[state=open]:fade-in-0 tw:data-[state=closed]:animate-out tw:data-[state=closed]:fade-out-0"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'tw:fixed tw:z-[1060] tw:flex tw:flex-col tw:gap-4 tw:bg-card tw:text-card-foreground tw:shadow-lg tw:outline-none tw:ease-standard',
          'tw:data-[state=open]:animate-in tw:data-[state=open]:duration-300 tw:data-[state=closed]:animate-out tw:data-[state=closed]:duration-200',
          side === 'right' && 'tw:inset-y-0 tw:right-0 tw:h-full tw:w-3/4 tw:border-l tw:border-solid tw:border-border tw:sm:max-w-sm tw:data-[state=open]:slide-in-from-right tw:data-[state=closed]:slide-out-to-right',
          side === 'left' && 'tw:inset-y-0 tw:left-0 tw:h-full tw:w-3/4 tw:border-r tw:border-solid tw:border-border tw:sm:max-w-sm tw:data-[state=open]:slide-in-from-left tw:data-[state=closed]:slide-out-to-left',
          side === 'top' && 'tw:inset-x-0 tw:top-0 tw:h-auto tw:border-b tw:border-solid tw:border-border tw:data-[state=open]:slide-in-from-top tw:data-[state=closed]:slide-out-to-top',
          side === 'bottom' && 'tw:inset-x-0 tw:bottom-0 tw:h-auto tw:border-t tw:border-solid tw:border-border tw:data-[state=open]:slide-in-from-bottom tw:data-[state=closed]:slide-out-to-bottom',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close className="tw:absolute tw:top-4 tw:right-4 tw:inline-flex tw:size-8 tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-transparent tw:text-muted-foreground tw:transition-colors tw:hover:bg-accent tw:hover:text-foreground tw:outline-none tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50">
            <X className="tw:size-4" aria-hidden="true" />
            <span className="tw:sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('tw:flex tw:flex-col tw:gap-1.5 tw:p-4', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn('tw:m-0 tw:text-base! tw:font-semibold tw:text-foreground', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn('tw:m-0 tw:text-sm tw:text-muted-foreground', className)} {...props} />
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription }
