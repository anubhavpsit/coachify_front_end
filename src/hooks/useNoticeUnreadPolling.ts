import { useEffect } from 'react'
import { refreshNoticeUnread } from '@/lib/noticeUnread'

const POLL_MS = 60_000

/**
 * Polls the unread-notice count. Mounted once by the app shell (the mobile
 * sidebar unmounts when closed, so the badge itself can't own the poll).
 */
export function useNoticeUnreadPolling() {
  useEffect(() => {
    refreshNoticeUnread()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshNoticeUnread()
    }, POLL_MS)
    const onFocus = () => refreshNoticeUnread()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [])
}
