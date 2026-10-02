import { NavLink } from 'react-router-dom'
import { m } from 'motion/react'
import { transitions } from '@/animations'
import { InboxUnreadBadge, NoticeUnreadBadge } from '@/components/layout/SidebarBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { usePermission, visibleNavGroups, type NavItem } from '@/permissions'

interface Props {
  collapsed?: boolean
  /** Called after a link is clicked (mobile drawer closes itself). */
  onNavigate?: () => void
  /** Distinct per mounted instance so the active pill animates within its own nav. */
  layoutId: string
}

function ItemBadge({ item, compact }: { item: NavItem; compact: boolean }) {
  if (item.badge === 'notices') return <NoticeUnreadBadge compact={compact} />
  if (item.badge === 'inbox') return <InboxUnreadBadge compact={compact} />
  return null
}

/** Permission-filtered navigation (single source: src/permissions/menu.ts). */
export default function SidebarNav({ collapsed = false, onNavigate, layoutId }: Props) {
  const permissions = usePermission()
  const groups = visibleNavGroups(permissions)

  return (
    <nav aria-label="Main" className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group) => (
        <div key={group.id} className="group/navgroup flex flex-col gap-0.5">
          {collapsed ? (
            <div className="mx-3 mb-1 h-px bg-border group-first/navgroup:hidden" aria-hidden="true" />
          ) : (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
          )}
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {group.items.map((item) => {
              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium no-underline outline-none transition-colors duration-150',
                      'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'text-primary-soft-foreground hover:text-primary-soft-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <m.span
                          layoutId={layoutId}
                          transition={transitions.snappy}
                          className="absolute inset-0 rounded-lg bg-primary-soft"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon className="relative size-[1.125rem] shrink-0" aria-hidden="true" />
                      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="relative truncate">{item.label}</span>}
                      <ItemBadge item={item} compact={collapsed} />
                    </>
                  )}
                </NavLink>
              )
              return (
                <li key={item.to}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    link
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
