import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  count?: number
  countTone?: 'danger' | 'primary'
  viewAllTo?: string
  empty: string
  isEmpty: boolean
  children: ReactNode
}

/** Dashboard widget shell — same look as Low Attendance / Birthday cards. */
export default function OverviewCard({ title, count, countTone = 'primary', viewAllTo, empty, isEmpty, children }: Props) {
  return (
    <div className="col-xxl-4 col-md-6">
      <div className="card h-100">
        <div className="card-header d-flex align-items-center justify-content-between gap-2">
          <h6 className="fw-bold text-lg mb-0 d-flex align-items-center gap-2">
            {title}
            {count !== undefined && count > 0 && (
              <span className={`badge rounded-pill text-xs text-white ${countTone === 'danger' ? 'bg-danger-600' : 'bg-primary-600'}`}>
                {count}
              </span>
            )}
          </h6>
          {viewAllTo && (
            <Link to={viewAllTo} className="text-primary-600 text-sm fw-medium">
              View all
            </Link>
          )}
        </div>
        <div className="card-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {isEmpty ? <p className="text-secondary-light text-sm mb-0">{empty}</p> : children}
        </div>
      </div>
    </div>
  )
}
