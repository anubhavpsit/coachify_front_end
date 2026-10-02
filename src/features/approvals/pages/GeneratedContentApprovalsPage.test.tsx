import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import GeneratedContentApprovalsPage from './GeneratedContentApprovalsPage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const item = {
  id: 5,
  daily_activity_id: 11,
  explanation_html: '<p>Fractions are parts of a whole.</p><img src=x onerror="window.__xss()">',
  homework_html: '<p>Do Q1–5</p>',
  is_admin_approved: false,
  daily_activity: { id: 11, activity_date: '2026-10-02', topic: 'Fractions', teacher: { id: 2, name: 'Meera' }, student: { id: 3, name: 'Asha' }, subject: { id: 5, subject: 'Maths' } },
}

function signIn(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 4, permissions }))
}

function mockGets(data: unknown[] = [item]) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) =>
    Promise.resolve({ data: { success: true, data: url.endsWith('/students') ? [{ id: 3, name: 'Asha' }] : data } }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-02T10:00:00') })
})
afterEach(() => vi.useRealTimers())

describe('GeneratedContentApprovalsPage', () => {
  it('staff with generated_content.approve still sees "not authorized" and nothing loads (Q2 unchanged)', () => {
    signIn('staff', ['generated_content.approve'])
    const get = mockGets()
    render(<GeneratedContentApprovalsPage />)
    expect(screen.getByText('You are not authorized to view this page.')).toBeTruthy()
    expect(get).not.toHaveBeenCalled()
  })

  it('coaching admin: legacy request, sanitised content in tabs', async () => {
    const xss = vi.fn()
    ;(window as unknown as { __xss: () => void }).__xss = xss
    signIn('coaching_admin')
    const get = mockGets()
    render(<GeneratedContentApprovalsPage />)
    expect(await screen.findByText('Fractions are parts of a whole.')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/generated-content$/), { ...auth, params: { approved: 'false', date: '2026-10-02' } })
    expect(document.querySelector('img[onerror]')).toBeNull()
    expect(xss).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('tab', { name: 'Homework' }))
    expect(await screen.findByText('Do Q1–5')).toBeTruthy()
  })

  it('approve asks Yes/No, then PATCHes', async () => {
    signIn('coaching_admin')
    mockGets()
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { success: true, message: 'Approved.' } })
    render(<GeneratedContentApprovalsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Approve content/ }))
    expect(patch).not.toHaveBeenCalled()
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, approve' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/generated-content\/5\/approval$/), { approved: true, remarks: undefined }, auth))
  })

  it('mark pending requires remarks', async () => {
    signIn('coaching_admin')
    mockGets([{ ...item, is_admin_approved: true, approved_at: '2026-10-02T08:00:00Z' }])
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: { success: true } })
    render(<GeneratedContentApprovalsPage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Approved' }))
    await userEvent.click(await screen.findByRole('button', { name: /Mark pending/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(within(d).getByRole('button', { name: 'Mark pending' }))
    expect(await within(d).findByText('Tell the teacher what to fix.')).toBeTruthy()
    await userEvent.type(within(d).getByRole('textbox'), 'Wrong grade level')
    await userEvent.click(within(d).getByRole('button', { name: 'Mark pending' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/generated-content\/5\/approval$/), { approved: false, remarks: 'Wrong grade level' }, auth))
  })
})
