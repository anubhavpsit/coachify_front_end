import type { Notice } from './types'

export default function NoticeBadges({ notice }: { notice: Notice }) {
  return (
    <>
      {notice.is_pinned && (
        <span className="badge bg-primary-100 text-primary-600 text-xs">
          <i className="ri-pushpin-2-fill me-1" />
          Pinned
        </span>
      )}
      {notice.is_important && <span className="badge bg-danger-100 text-danger-600 text-xs">Important</span>}
      {notice.status === 'scheduled' && <span className="badge bg-warning-100 text-warning-600 text-xs">Scheduled</span>}
      {notice.status === 'expired' && <span className="badge bg-neutral-200 text-secondary-light text-xs">Expired</span>}
    </>
  )
}
