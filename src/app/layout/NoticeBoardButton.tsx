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
          className={cn('tw:relative tw:rounded-full', active && 'tw:text-primary')}
        >
          <Link to={ROUTES.NOTICES} aria-label={unread > 0 ? `Notice Board, ${unread} unread` : 'Notice Board'} aria-current={active ? 'page' : undefined}>
            <Megaphone className="tw:size-5" aria-hidden="true" />
            <AnimatePresence>
              {unread > 0 && (
                <m.span
                  key={label}
                  variants={pop}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="tw:absolute tw:-top-1 tw:-right-1 tw:min-w-[1.125rem] tw:rounded-full tw:bg-destructive tw:px-1 tw:text-center tw:text-[10px] tw:font-bold tw:leading-[1.125rem] tw:text-destructive-foreground"
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
