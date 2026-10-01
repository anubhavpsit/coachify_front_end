import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import DailyActivityApprovalsPage from './DailyActivityApprovalsPage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const notif = { id: 90, title: 't', status: 'queued', created_at: '2026-10-01T09:00:00Z', scheduled_for: '2026-10-01T09:05:00Z' }
const rows = [
  {
    id: 1,
    activity_date: '2026-10-01',
    notes: 'Fractions',
    is_admin_approved: false,
    admin_feedback: null,
    teacher: { id: 7, name: 'Meera' },
    student: { id: 3, name: 'Asha' },
    subject: { id: 5, subject: 'Maths' },
    attachments: [{ id: 50, original_name: 'board.jpg', path: 'x', is_admin_approved: false }],
    student_notification: notif,
  },
  { id: 2, activity_date: '2026-10-01', notes: 'Cells', is_admin_approved: false, admin_feedback: null, student: { id: 4, name: 'Ravi' }, subject: { id: 6, subject: 'Science' } },
  { id: 3, activity_date: '2026-09-30', notes: 'Old', is_admin_approved: false, admin_feedback: 'Add homework', student: { id: 5, name: 'Neha' }, subject: { id: 5, subject: 'Maths' } },
]

function signIn(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 4, permissions }))
}

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.endsWith('/students') || url.endsWith('/teachers/students')) return Promise.resolve({ data: { success: true, data: [{ id: 3, name: 'Asha' }] } })
    return Promise.resolve({ data: { success: true, data: rows } })
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-01T10:00:00') })
})
afterEach(() => vi.useRealTimers())

describe('DailyActivityApprovalsPage — approver', () => {
  it('loads today’s pending activities with the legacy request', async () => {
    signIn('coaching_admin')
    const get = mockGets()
    render(<DailyActivityApprovalsPage />)
    expect(await screen.findByRole('article', { name: /Asha/ })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/daily-activities$/), { ...auth, params: { approved: 'false', date: '2026-10-01' } })
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/students$/), auth)
  })

  it('approves one activity with PATCH approval', async () => {
    signIn('coaching_admin')
    mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { success: true, message: 'Activity approved.' } })
    render(<DailyActivityApprovalsPage />)
    const card = await screen.findByRole('article', { name: /Asha/ })
    await userEvent.click(within(card).getByRole('button', { name: 'Approve' }))
    expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/daily-activities\/1\/approval$/), { approved: true, remarks: undefined }, auth)
  })

  it('send back requires remarks (max 500) and sends them', async () => {
    signIn('coaching_admin')
    mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { success: true, message: 'Sent back to the teacher with your remarks.' } })
    render(<DailyActivityApprovalsPage />)
    const card = await screen.findByRole('article', { name: /Ravi/ })
    await userEvent.click(within(card).getByRole('button', { name: 'Send back' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send back' }))
    expect(await within(dialog).findByText('Tell the teacher what to fix.')).toBeTruthy()
    expect(patch).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Please add the homework.' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send back' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/daily-activities\/2\/approval$/), { approved: false, remarks: 'Please add the homework.' }, auth))
  })

  it('bulk-approves the pending ones shown (never the sent-back one)', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { approved: 2, attachments_approved: 1, students_notified: 2 } } })
    render(<DailyActivityApprovalsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Approve all shown \(2\)/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/1 pending attachment will be approved too/)).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/daily-activities\/approve-bulk$/), { ids: [1, 2], include_attachments: true }, auth))
    // The sent-back activity has no checkbox.
    expect(within(screen.getByRole('article', { name: /Neha/ })).queryByRole('checkbox')).toBeNull()
  })

  it('staff with daily_activities.approve can review; "Send now" needs notifications.manage', async () => {
    signIn('staff', ['daily_activities.approve'])
    mockGets()
    render(<DailyActivityApprovalsPage />)
    const card = await screen.findByRole('article', { name: /Asha/ })
    expect(within(card).getByRole('button', { name: 'Approve' })).toBeTruthy()
    expect(within(card).getByRole('button', { name: 'Approve board.jpg' })).toBeTruthy()
    expect(within(card).queryByRole('button', { name: /Send now/ })).toBeNull()
  })

  it('coaching admin sees "Send now" for a queued notification', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    render(<DailyActivityApprovalsPage />)
    const card = await screen.findByRole('article', { name: /Asha/ })
    await userEvent.click(within(card).getByRole('button', { name: /Send now/ }))
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/notifications\/90\/send$/), {}, auth)
  })
})

describe('DailyActivityApprovalsPage — other roles', () => {
  it('teacher gets a read-only list of their own activities', async () => {
    signIn('teacher')
    const get = mockGets()
    render(<DailyActivityApprovalsPage />)
    const card = await screen.findByRole('article', { name: /Asha/ })
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/teacher\/daily-activities$/), { ...auth, params: { approved: 'false', date: '2026-10-01' } })
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/teachers\/students$/), auth)
    expect(within(card).queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(within(card).queryByRole('button', { name: 'Approve board.jpg' })).toBeNull()
    expect(within(card).queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /Approve all shown/ })).toBeNull()
  })

  it('staff without the permission is not authorized and nothing loads', () => {
    signIn('staff')
    const get = mockGets()
    render(<DailyActivityApprovalsPage />)
    expect(screen.getByText('You are not authorized to view this page.')).toBeTruthy()
    expect(get).not.toHaveBeenCalled()
  })
})
