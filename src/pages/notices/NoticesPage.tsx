import NoticeBoardCard from '../../components/notices/NoticeBoardCard'

/** Full-page Notice Board (sidebar link). Same card as the dashboard. */
export default function NoticesPage() {
  return (
    <div>
      <h6 className="fw-semibold mb-24">Notice Board</h6>
      <NoticeBoardCard fullPage />
    </div>
  )
}
