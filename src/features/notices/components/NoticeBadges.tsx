import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Notice } from '../types'

export default function NoticeBadges({ notice }: { notice: Notice }) {
  return (
    <>
      {notice.is_pinned && (
        <Badge variant="soft">
          <Pin aria-hidden="true" />
          Pinned
        </Badge>
      )}
      {notice.is_important && <Badge variant="destructive">Important</Badge>}
      {notice.status === 'scheduled' && <Badge variant="warning">Scheduled</Badge>}
      {(notice.status === 'expired' || notice.is_expired) && <Badge variant="secondary">Expired</Badge>}
    </>
  )
}
