import { AnimatePresence, m } from 'motion/react'
import { pop } from '@/animations'
import { fullDate, timeAgo, type InboxNotification } from '@/lib/myNotifications'
import { cn } from '@/lib/utils'

/** One inbox row. The unread dot shrinks away when the item is marked read. */
export default function InboxItem({ n, onOpen }: { n: InboxNotification; onOpen: (n: InboxNotification) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn(
        'tw:m-0 tw:block tw:w-full tw:cursor-pointer tw:border-0 tw:border-b tw:border-solid tw:border-border tw:px-4 tw:py-4 tw:text-left tw:outline-none tw:transition-colors tw:duration-300 tw:hover:bg-accent tw:focus-visible:bg-accent tw:sm:px-6',
        n.is_read ? 'tw:bg-transparent' : 'tw:bg-primary-soft/50',
      )}
    >
      <div className="tw:flex tw:items-start tw:justify-between tw:gap-3">
        <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-2.5">
          <span className="tw:mt-2 tw:flex tw:size-2 tw:shrink-0">
            <AnimatePresence initial={false}>
              {!n.is_read && <m.span key="dot" variants={pop} initial="hidden" animate="visible" exit="exit" className="tw:size-2 tw:rounded-full tw:bg-primary" aria-label="Unread" />}
            </AnimatePresence>
          </span>
          <div className="tw:min-w-0">
            <div className={cn('tw:text-sm tw:text-foreground tw:sm:text-base', n.is_read ? 'tw:font-medium' : 'tw:font-semibold')}>{n.title}</div>
            {n.body && <div className="tw:mt-1 tw:text-sm tw:text-muted-foreground tw:whitespace-pre-wrap">{n.body}</div>}
            {(n.type_label || n.sender) && (
              <div className="tw:mt-1.5 tw:flex tw:flex-wrap tw:gap-2 tw:text-xs tw:text-muted-foreground">
                {n.type_label && <span>{n.type_label}</span>}
                {n.sender && <span>· from {n.sender.name}</span>}
              </div>
            )}
          </div>
        </div>
        <span className="tw:shrink-0 tw:text-xs tw:text-muted-foreground" title={fullDate(n.created_at)}>
          {timeAgo(n.created_at)}
        </span>
      </div>
    </button>
  )
}
