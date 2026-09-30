import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { AnimatePresence, m } from 'motion/react'
import { fadeIn, transitions } from '@/animations'
import { cn } from '@/lib/utils'

const TabsValueContext = React.createContext<{ value?: string; indicatorId: string }>({ indicatorId: '' })

function Tabs({ className, value, defaultValue, onValueChange, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  const indicatorId = React.useId()
  return (
    <TabsValueContext.Provider value={{ value: current, indicatorId }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        value={current}
        onValueChange={(v) => {
          setInner(v)
          onValueChange?.(v)
        }}
        className={cn('tw:flex tw:flex-col tw:gap-4', className)}
        {...props}
      />
    </TabsValueContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('tw:flex tw:w-full tw:items-center tw:gap-1 tw:overflow-x-auto tw:border-b tw:border-solid tw:border-border', className)}
      {...props}
    />
  )
}

/** Underline tab with an indicator that slides between triggers. */
function TabsTrigger({ className, children, value, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const ctx = React.useContext(TabsValueContext)
  const active = ctx.value === value
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        'tw:relative tw:m-0 tw:inline-flex tw:shrink-0 tw:cursor-pointer tw:items-center tw:gap-1.5 tw:border-0 tw:bg-transparent tw:px-3 tw:py-2.5 tw:text-sm tw:font-medium tw:text-muted-foreground tw:outline-none tw:transition-colors',
        'tw:hover:text-foreground tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50 tw:data-[state=active]:text-foreground tw:[&_svg]:size-4',
        className,
      )}
      {...props}
    >
      {children}
      {active && (
        <m.span layoutId={ctx.indicatorId} transition={transitions.snappy} className="tw:absolute tw:inset-x-2 tw:-bottom-px tw:h-0.5 tw:rounded-full tw:bg-primary" aria-hidden="true" />
      )}
    </TabsPrimitive.Trigger>
  )
}

/** Content cross-fades in when its tab becomes active. */
function TabsContent({ className, children, value, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const ctx = React.useContext(TabsValueContext)
  return (
    <TabsPrimitive.Content data-slot="tabs-content" value={value} className={cn('tw:outline-none', className)} {...props}>
      <AnimatePresence mode="wait" initial={false}>
        {ctx.value === value && (
          <m.div key={value} variants={fadeIn} initial="hidden" animate="visible">
            {children}
          </m.div>
        )}
      </AnimatePresence>
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
