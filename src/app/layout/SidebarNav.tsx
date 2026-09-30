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
    <nav aria-label="Main" className="tw:flex tw:flex-col tw:gap-5 tw:px-3 tw:py-4">
      {groups.map((group) => (
        <div key={group.id} className="tw:group/navgroup tw:flex tw:flex-col tw:gap-0.5">
          {collapsed ? (
            <div className="tw:mx-3 tw:mb-1 tw:h-px tw:bg-border tw:group-first/navgroup:hidden" aria-hidden="true" />
          ) : (
            <div className="tw:px-3 tw:pb-1 tw:text-[11px] tw:font-semibold tw:uppercase tw:tracking-wider tw:text-muted-foreground">
              {group.label}
            </div>
          )}
          <ul className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-0.5 tw:p-0">
            {group.items.map((item) => {
              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'tw:group tw:relative tw:flex tw:h-10 tw:items-center tw:gap-3 tw:rounded-lg tw:px-3 tw:text-sm tw:font-medium tw:no-underline tw:outline-none tw:transition-colors tw:duration-150',
                      'tw:focus-visible:ring-[3px] tw:focus-visible:ring-ring/50',
                      collapsed && 'tw:justify-center tw:px-0',
                      isActive
                        ? 'tw:text-primary-soft-foreground tw:hover:text-primary-soft-foreground'
                        : 'tw:text-muted-foreground tw:hover:bg-accent tw:hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <m.span
                          layoutId={layoutId}
                          transition={transitions.snappy}
                          className="tw:absolute tw:inset-0 tw:rounded-lg tw:bg-primary-soft"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon className="tw:relative tw:size-[1.125rem] tw:shrink-0" aria-hidden="true" />
                      {collapsed ? <span className="tw:sr-only">{item.label}</span> : <span className="tw:relative tw:truncate">{item.label}</span>}
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
