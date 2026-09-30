import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { buildPushParams } from '../services/pushNotificationsService'
import { DEFAULT_PUSH_FILTERS } from '../hooks/usePushNotifications'
import MyNotificationsPage from './MyNotificationsPage'
import NotificationsPage from './NotificationsPage'

function login(role: string) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 1, permissions: ['notifications.manage'] }))
}

const record = {
  id: 7, sent_to: 3, sent_from: 1, channel: 'push', type: 'assessment_reminder', title: 'Test tomorrow', body: 'Bring a pen',
  payload: null, metadata: null, status: 'pending', attempts: 0, max_attempts: 3, scheduled_for: null, sent_at: null,
  created_at: '2026-09-29T04:00:00Z', updated_at: '', last_error: null, recipient: { id: 3, name: 'Ravi', role: 'student' }, sender: null,
}
const listBody = { data: { success: true, data: { notifications: [record], pagination: { current_page: 1, last_page: 1, per_page: 10, total: 1 }, filters: { types: [], statuses: [] }, stats: { pending: 1, failed: 0, sent_today: 4 } } } }

beforeEach(() => vi.restoreAllMocks())

describe('admin NotificationsPage (Q10 gate preserved)', () => {
  it('staff with notifications.manage still gets the legacy message and no request', async () => {
    login('staff')
    const get = vi.spyOn(axios, 'get')
    render(<NotificationsPage />)
    expect(await screen.findByText('Only coaching admins can view notifications.')).toBeTruthy()
    expect(get).not.toHaveBeenCalled()
  })

  it('builds the legacy query string', () => {
    expect(buildPushParams(DEFAULT_PUSH_FILTERS, 1).toString()).toBe('page=1&per_page=10&sort_by=created_at&sort_direction=desc')
    expect(buildPushParams({ ...DEFAULT_PUSH_FILTERS, status: 'failed', type: 'x', search: ' pen ', startDate: '2026-09-01', endDate: '2026-09-30' }, 2).toString()).toBe(
      'page=2&per_page=10&sort_by=created_at&sort_direction=desc&status=failed&type=x&search=pen&start_date=2026-09-01&end_date=2026-09-30',
    )
  })

  it('admin: lists, sorts via headers, cancels only after confirming', async () => {
    login('coaching_admin')
    const get = vi.spyOn(axios, 'get').mockResolvedValue(listBody)
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    render(<NotificationsPage />)
    expect(await screen.findByText('Test tomorrow')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /^Status/ }))
    await waitFor(() => expect(get.mock.lastCall?.[0]).toContain('sort_by=status&sort_direction=desc'))
    await userEvent.click(await screen.findByRole('button', { name: /Cancel/ }))
    expect(post).not.toHaveBeenCalled()
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel notification' }))
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/notifications\/7\/cancel$/), {}, { headers: { Authorization: 'Bearer tok' } })
  })
})

describe('MyNotificationsPage', () => {
  it('marks read and follows the notification link', async () => {
    login('student')
    vi.spyOn(axios, 'get').mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 5, type: 'assessment_reminder', type_label: 'Assessment', title: 'Algebra tomorrow', body: null, created_at: new Date().toISOString(), is_read: false, read_at: null, sender: null, data: { assessment_id: 11 }, action_route: null }],
        meta: { limit: 20, has_more: false, next_cursor: null, unread_count: 1 },
      },
    })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { unread_count: 0 } } })
    render(
      <MemoryRouter initialEntries={['/my-notifications']}>
        <Routes>
          <Route path="/my-notifications" element={<MyNotificationsPage />} />
          <Route path="/students/assessments" element={<p>student assessments</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('button', { name: /Mark all as read \(1\)/ })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Algebra tomorrow/ }))
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/my\/notifications\/5\/read$/), {}, expect.anything())
    expect(await screen.findByText('student assessments')).toBeTruthy()
  })
})
