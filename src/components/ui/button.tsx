import * as React from 'react'
import { Slot as SlotPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Explicit border/margin resets: Tailwind preflight is off while Bootstrap's reboot is the base.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 m-0 shrink-0 whitespace-nowrap rounded-md border border-solid border-transparent text-sm font-medium leading-none no-underline cursor-pointer select-none outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-standard active:scale-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-active',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        success: 'bg-success text-success-foreground shadow-xs hover:bg-success/90',
        outline: 'border-border bg-card text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        soft: 'bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/70',
        ghost: 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        xs: 'h-7 gap-1 rounded-sm px-2 text-xs [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10 p-0',
        'icon-sm': 'size-8 p-0',
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
          {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {children}
        </>
      )}
    </Comp>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
