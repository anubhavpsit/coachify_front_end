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
        'tw:m-0 tw:block tw:w-full tw:cursor-pointer tw:border-0 tw:border-b tw:border-solid tw:border-border tw:text-left tw:outline-none tw:transition-colors tw:hover:bg-accent tw:focus-visible:bg-accent',
        compact ? 'tw:px-4 tw:py-3' : 'tw:px-6 tw:py-4',
        n.is_read ? 'tw:bg-transparent' : 'tw:bg-primary-soft/50',
      )}
    >
      <div className="tw:mb-1 tw:flex tw:items-start tw:justify-between tw:gap-2">
        <span className={cn('tw:flex tw:items-center tw:gap-2 tw:text-sm tw:text-foreground tw:md:text-base', n.is_read ? 'tw:font-medium' : 'tw:font-semibold')}>
          {!n.is_read && <span className="tw:size-2 tw:shrink-0 tw:rounded-full tw:bg-primary" aria-label="Unread" />}
          {n.title}
        </span>
        <span className="tw:flex tw:shrink-0 tw:flex-wrap tw:items-center tw:gap-1">
          <NoticeBadges notice={n} />
          {n.has_attachment && <Paperclip className="tw:size-3.5 tw:text-muted-foreground" aria-label="Has attachment" />}
        </span>
      </div>
      <p className={cn('tw:m-0 tw:mb-1 tw:text-sm tw:text-muted-foreground', compact && 'tw:line-clamp-2')}>{n.body_preview}</p>
      <span className="tw:text-xs tw:text-muted-foreground">
        {formatNoticeDate(n.published_at)}
        {n.posted_by && ` · ${n.posted_by.name} (${ROLE_LABELS[n.posted_by.role] ?? n.posted_by.role})`}
      </span>
    </button>
  )
}
