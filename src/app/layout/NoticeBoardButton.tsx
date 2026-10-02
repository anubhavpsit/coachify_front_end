import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { Megaphone } from 'lucide-react'
import { pop } from '@/animations'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { getNoticeUnreadCount, subscribeNoticeUnread } from '@/lib/noticeUnread'

/**
 * Top-bar shortcut to the Notice Board (was a sidebar item; visible to every
 * signed-in user, as before). The count is polled by the app shell.
 */
export default function NoticeBoardButton() {
  const { pathname } = useLocation()
  const active = pathname === ROUTES.NOTICES
  const [unread, setUnread] = useState(getNoticeUnreadCount)
  useEffect(() => subscribeNoticeUnread(setUnread), [])
  const label = unread > 99 ? '99+' : String(unread)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant={active ? 'soft' : 'secondary'}
          size="icon"
          className={cn('relative rounded-full', active && 'text-primary')}
        >
          <Link to={ROUTES.NOTICES} aria-label={unread > 0 ? `Notice Board, ${unread} unread` : 'Notice Board'} aria-current={active ? 'page' : undefined}>
            <Megaphone className="size-5" aria-hidden="true" />
            <AnimatePresence>
              {unread > 0 && (
                <m.span
                  key={label}
                  variants={pop}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute -top-1 -right-1 min-w-[1.125rem] rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-[1.125rem] text-destructive-foreground"
                >
                  {label}
                </m.span>
              )}
            </AnimatePresence>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Notice Board</TooltipContent>
    </Tooltip>
  )
}
