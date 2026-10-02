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
        'm-0 block w-full cursor-pointer border-0 border-b border-solid border-border px-4 py-4 text-left outline-none transition-colors duration-300 hover:bg-accent focus-visible:bg-accent sm:px-6',
        n.is_read ? 'bg-transparent' : 'bg-primary-soft/50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-2 flex size-2 shrink-0">
            <AnimatePresence initial={false}>
              {!n.is_read && <m.span key="dot" variants={pop} initial="hidden" animate="visible" exit="exit" className="size-2 rounded-full bg-primary" aria-label="Unread" />}
            </AnimatePresence>
          </span>
          <div className="min-w-0">
            <div className={cn('text-sm text-foreground sm:text-base', n.is_read ? 'font-medium' : 'font-semibold')}>{n.title}</div>
            {n.body && <div className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</div>}
            {(n.type_label || n.sender) && (
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {n.type_label && <span>{n.type_label}</span>}
                {n.sender && <span>· from {n.sender.name}</span>}
              </div>
            )}
          </div>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground" title={fullDate(n.created_at)}>
          {timeAgo(n.created_at)}
        </span>
      </div>
    </button>
  )
}
