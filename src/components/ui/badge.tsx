import * as React from 'react'
import { Slot as SlotPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'tw:inline-flex tw:items-center tw:gap-1 tw:w-fit tw:shrink-0 tw:whitespace-nowrap tw:rounded-full tw:border tw:border-solid tw:border-transparent tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium tw:leading-4 tw:[&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'tw:bg-primary tw:text-primary-foreground',
        soft: 'tw:bg-primary-soft tw:text-primary-soft-foreground',
        secondary: 'tw:bg-secondary tw:text-secondary-foreground',
        success: 'tw:bg-success-soft tw:text-success',
        warning: 'tw:bg-warning-soft tw:text-warning',
        destructive: 'tw:bg-destructive-soft tw:text-destructive',
        info: 'tw:bg-info-soft tw:text-info',
        outline: 'tw:border-border tw:text-foreground',
      },
    },
    defaultVariants: { variant: 'soft' },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span'
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
