import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import ActivityLogCard from './ActivityLogCard'
import { buildLogParams } from './activityLogService'

const base = { role: 'all', module: 'all', userId: 'all', startDate: '2026-09-23', endDate: '2026-09-30' } as const

describe('buildLogParams (legacy query string)', () => {
  it('defaults + first load asks for modules', () => {
    expect(buildLogParams(base, 1, 25, true).toString()).toBe('per_page=25&page=1&with_modules=1&start_date=2026-09-23&end_date=2026-09-30')
  })
  it('all filters, in legacy order', () => {
    expect(buildLogParams({ ...base, role: 'teacher', module: 'fees', userId: '9' }, 3, 25, false).toString()).toBe(
      'per_page=25&page=3&user_role=teacher&module=fees&user_id=9&start_date=2026-09-23&end_date=2026-09-30',
    )
  })
})

describe('ActivityLogCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.setItem('authToken', 'tok')
    localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'Admin A', role: 'coaching_admin', tenant_id: 4, permissions: [] }))
  })

  it('renders logs, adds the admin to the user filter, pages forward', async () => {
    const get = vi.spyOn(axios, 'get').mockImplementation((url: string) => {
      if (url.endsWith('/users')) return Promise.resolve({ data: { success: true, data: [{ id: 2, name: 'T', role: 'teacher', tenant_id: 4 }, { id: 3, name: 'X', role: 'teacher', tenant_id: 9 }] } })
      return Promise.resolve({
        data: {
          success: true,
          data: {
            logs: [{ id: 1, user_id: 2, user_role: 'teacher', action: 'created_activity', module: 'daily_activities', description: 'Added notes', metadata: { class: '10A' }, created_at: '2026-09-29T06:00:00Z', user: { id: 2, name: 'T', role: 'teacher' } }],
            modules: ['daily_activities'],
            pagination: { current_page: 1, last_page: 2, total: 26, per_page: 25 },
          },
        },
      })
    })
    render(<ActivityLogCard />)
    expect(await screen.findByText('created activity')).toBeTruthy()
    expect(screen.getByText('class: 10A')).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Admin A (Admin) (coaching_admin)' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'X (teacher)' })).toBeNull() // other tenant filtered out
    expect(screen.getByText('Page 1 of 2 · 26 logs')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Next/ }))
    expect(get).toHaveBeenLastCalledWith(expect.stringContaining('page=2'), expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }))
    // modules already loaded → not requested again
    expect(get.mock.lastCall?.[0]).not.toContain('with_modules')
  })

  it('shows the legacy message without a token', async () => {
    localStorage.removeItem('authToken')
    render(<ActivityLogCard />)
    expect(await screen.findByText('Sign in to view activity logs.')).toBeTruthy()
  })
})
