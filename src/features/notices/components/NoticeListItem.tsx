import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, formatNoticeDate, type Notice } from '../types'
import NoticeBadges from './NoticeBadges'

/** One notice row; unread rows are tinted with a dot. */
export default function NoticeListItem({ notice: n, compact, onOpen }: { notice: Notice; compact?: boolean; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(n.id)}
      className={cn(
        'm-0 block w-full cursor-pointer border-0 border-b border-solid border-border text-left outline-none transition-colors hover:bg-accent focus-visible:bg-accent',
        compact ? 'px-4 py-3' : 'px-6 py-4',
        n.is_read ? 'bg-transparent' : 'bg-primary-soft/50',
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className={cn('flex items-center gap-2 text-sm text-foreground md:text-base', n.is_read ? 'font-medium' : 'font-semibold')}>
          {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
          {n.title}
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-1">
          <NoticeBadges notice={n} />
          {n.has_attachment && <Paperclip className="size-3.5 text-muted-foreground" aria-label="Has attachment" />}
        </span>
      </div>
      <p className={cn('m-0 mb-1 text-sm text-muted-foreground', compact && 'line-clamp-2')}>{n.body_preview}</p>
      <span className="text-xs text-muted-foreground">
        {formatNoticeDate(n.published_at)}
        {n.posted_by && ` · ${n.posted_by.name} (${ROLE_LABELS[n.posted_by.role] ?? n.posted_by.role})`}
      </span>
    </button>
  )
}
