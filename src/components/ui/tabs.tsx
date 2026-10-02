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
        className={cn('flex flex-col gap-4', className)}
        {...props}
      />
    </TabsValueContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('flex w-full items-center gap-1 overflow-x-auto border-b border-solid border-border', className)}
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
        'relative m-0 inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors',
        'hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:text-foreground [&_svg]:size-4',
        className,
      )}
      {...props}
    >
      {children}
      {active && (
        <m.span layoutId={ctx.indicatorId} transition={transitions.snappy} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden="true" />
      )}
    </TabsPrimitive.Trigger>
  )
}

/** Content cross-fades in when its tab becomes active. */
function TabsContent({ className, children, value, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const ctx = React.useContext(TabsValueContext)
  return (
    <TabsPrimitive.Content data-slot="tabs-content" value={value} className={cn('outline-none', className)} {...props}>
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
