import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('tw:relative tw:flex tw:size-10 tw:shrink-0 tw:overflow-hidden tw:rounded-full', className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn('tw:aspect-square tw:size-full tw:object-cover', className)} {...props} />
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn('tw:flex tw:size-full tw:items-center tw:justify-center tw:rounded-full tw:bg-primary-soft tw:text-sm tw:font-semibold tw:text-primary-soft-foreground', className)}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
