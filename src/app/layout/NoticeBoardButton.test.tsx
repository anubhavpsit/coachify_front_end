import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { setNoticeUnreadCount } from '@/lib/noticeUnread'
import NoticeBoardButton from './NoticeBoardButton'

describe('NoticeBoardButton', () => {
  it('links to the Notice Board and shows the unread count', () => {
    render(
      <MemoryRouter initialEntries={['/notices']}>
        <NoticeBoardButton />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Notice Board' })
    expect(link.getAttribute('href')).toBe('/notices')
    expect(link.getAttribute('aria-current')).toBe('page')
    act(() => setNoticeUnreadCount(3))
    expect(screen.getByRole('link', { name: 'Notice Board, 3 unread' })).toBeTruthy()
  })
})
