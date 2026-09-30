import * as React from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-solid tw:border-border tw:bg-card tw:py-5 tw:text-card-foreground tw:shadow-xs',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('tw:grid tw:auto-rows-min tw:items-start tw:gap-1 tw:px-5 tw:has-data-[slot=card-action]:grid-cols-[1fr_auto]', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 data-slot="card-title" className={cn('tw:m-0 tw:text-base! tw:font-semibold tw:leading-snug tw:text-foreground', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('tw:m-0 tw:text-sm tw:text-muted-foreground', className)} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-action" className={cn('tw:col-start-2 tw:row-span-2 tw:row-start-1 tw:self-start tw:justify-self-end', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('tw:px-5', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('tw:flex tw:items-center tw:px-5', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter }
