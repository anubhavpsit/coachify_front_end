import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'tw:relative tw:grid tw:w-full tw:grid-cols-[0_1fr] tw:items-start tw:gap-y-0.5 tw:rounded-lg tw:border tw:border-solid tw:px-4 tw:py-3 tw:text-sm tw:has-[>svg]:grid-cols-[1.125rem_1fr] tw:has-[>svg]:gap-x-3 tw:[&>svg]:size-[1.125rem] tw:[&>svg]:translate-y-0.5 tw:[&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'tw:border-border tw:bg-card tw:text-card-foreground',
        destructive: 'tw:border-destructive/30 tw:bg-destructive-soft tw:text-destructive',
        success: 'tw:border-success/30 tw:bg-success-soft tw:text-success',
        warning: 'tw:border-warning/30 tw:bg-warning-soft tw:text-warning',
        info: 'tw:border-info/30 tw:bg-info-soft tw:text-info',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('tw:col-start-2 tw:font-medium tw:leading-snug', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('tw:col-start-2 tw:text-sm tw:[&_p]:m-0', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
