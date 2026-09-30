import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

const AlertDialog = (props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) => (
  <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
)
const AlertDialogTrigger = (props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) => (
  <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
)

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="tw:fixed tw:inset-0 tw:z-[1050] tw:bg-black/50 tw:data-[state=open]:animate-in tw:data-[state=open]:fade-in-0 tw:data-[state=closed]:animate-out tw:data-[state=closed]:fade-out-0" />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          'tw:fixed tw:top-1/2 tw:left-1/2 tw:z-[1060] tw:grid tw:w-full tw:max-w-[calc(100%-2rem)] tw:-translate-x-1/2 tw:-translate-y-1/2 tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:p-6 tw:shadow-lg tw:duration-200 tw:sm:max-w-md',
          'tw:data-[state=open]:animate-in tw:data-[state=open]:fade-in-0 tw:data-[state=open]:zoom-in-95 tw:data-[state=closed]:animate-out tw:data-[state=closed]:fade-out-0 tw:data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('tw:flex tw:flex-col tw:gap-2 tw:text-left', className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('tw:flex tw:flex-col-reverse tw:gap-2 tw:sm:flex-row tw:sm:justify-end', className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn('tw:m-0 tw:text-lg! tw:font-semibold tw:text-foreground', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn('tw:m-0 tw:text-sm tw:text-muted-foreground', className)} {...props} />
}

function AlertDialogAction({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & { variant?: 'default' | 'destructive' }) {
  return <AlertDialogPrimitive.Action className={cn(buttonVariants({ variant }), className)} {...props} />
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }), className)} {...props} />
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
