import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = (props: React.ComponentProps<typeof DialogPrimitive.Root>) => <DialogPrimitive.Root data-slot="dialog" {...props} />
const DialogTrigger = (props: React.ComponentProps<typeof DialogPrimitive.Trigger>) => (
  <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
)
const DialogClose = (props: React.ComponentProps<typeof DialogPrimitive.Close>) => <DialogPrimitive.Close data-slot="dialog-close" {...props} />

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'tw:fixed tw:inset-0 tw:z-[1050] tw:bg-black/50 tw:data-[state=open]:animate-in tw:data-[state=open]:fade-in-0 tw:data-[state=closed]:animate-out tw:data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'tw:fixed tw:top-1/2 tw:left-1/2 tw:z-[1060] tw:grid tw:w-full tw:max-w-[calc(100%-2rem)] tw:-translate-x-1/2 tw:-translate-y-1/2 tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-6 tw:text-card-foreground tw:shadow-lg tw:outline-none tw:sm:max-w-lg',
          'tw:max-h-[calc(100dvh-2rem)] tw:overflow-y-auto tw:duration-200',
          'tw:data-[state=open]:animate-in tw:data-[state=open]:fade-in-0 tw:data-[state=open]:zoom-in-95 tw:data-[state=closed]:animate-out tw:data-[state=closed]:fade-out-0 tw:data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="tw:absolute tw:top-4 tw:right-4 tw:inline-flex tw:size-8 tw:items-center tw:justify-center tw:rounded-md tw:border-0 tw:bg-transparent tw:text-muted-foreground tw:transition-colors tw:hover:bg-accent tw:hover:text-foreground tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:outline-none"
          >
            <X className="tw:size-4" aria-hidden="true" />
            <span className="tw:sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('tw:flex tw:flex-col tw:gap-1.5 tw:pr-8 tw:text-left', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-footer" className={cn('tw:flex tw:flex-col-reverse tw:gap-2 tw:sm:flex-row tw:sm:justify-end', className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('tw:m-0 tw:text-lg! tw:font-semibold tw:leading-tight tw:text-foreground', className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn('tw:m-0 tw:text-sm tw:text-muted-foreground', className)} {...props} />
}

export { Dialog, DialogTrigger, DialogClose, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
