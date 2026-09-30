import PageHeader from '@/components/common/PageHeader'
import NoticeBoardCard from '../components/NoticeBoardCard'

/** Full-page Notice Board (sidebar link). Same card as the dashboard. */
export default function NoticesPage() {
  return (
    <div>
      <PageHeader title="Notice Board" description="Announcements from your coaching" />
      <NoticeBoardCard fullPage />
    </div>
  )
}
