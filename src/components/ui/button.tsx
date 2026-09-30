import * as React from 'react'
import { Slot as SlotPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Explicit border/margin resets: Tailwind preflight is off while Bootstrap's reboot is the base.
const buttonVariants = cva(
  'tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:m-0 tw:shrink-0 tw:whitespace-nowrap tw:rounded-md tw:border tw:border-solid tw:border-transparent tw:text-sm tw:font-medium tw:leading-none tw:no-underline tw:cursor-pointer tw:select-none tw:outline-none tw:transition-[color,background-color,border-color,box-shadow,transform] tw:duration-150 tw:ease-standard tw:active:scale-[0.98] tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:disabled:pointer-events-none tw:disabled:opacity-50 tw:aria-invalid:ring-destructive/30 tw:[&_svg]:pointer-events-none tw:[&_svg]:shrink-0 tw:[&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'tw:bg-primary tw:text-primary-foreground tw:shadow-xs tw:hover:bg-primary-hover tw:active:bg-primary-active',
        destructive: 'tw:bg-destructive tw:text-destructive-foreground tw:shadow-xs tw:hover:bg-destructive/90',
        outline: 'tw:border-border tw:bg-card tw:text-foreground tw:shadow-xs tw:hover:bg-accent tw:hover:text-accent-foreground',
        secondary: 'tw:bg-secondary tw:text-secondary-foreground tw:hover:bg-secondary/80',
        soft: 'tw:bg-primary-soft tw:text-primary-soft-foreground tw:hover:bg-primary-soft/70',
        ghost: 'tw:bg-transparent tw:text-foreground tw:hover:bg-accent tw:hover:text-accent-foreground',
        link: 'tw:bg-transparent tw:text-primary tw:underline-offset-4 tw:hover:underline tw:active:scale-100',
      },
      size: {
        default: 'tw:h-10 tw:px-4',
        sm: 'tw:h-8 tw:px-3 tw:text-xs',
        lg: 'tw:h-11 tw:px-6 tw:text-base',
        icon: 'tw:size-10 tw:p-0',
        'icon-sm': 'tw:size-8 tw:p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean
}

function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? SlotPrimitive.Slot : 'button'
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="tw:animate-spin" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
