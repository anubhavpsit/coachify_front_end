import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import type { Notice } from '../types'
import NoticeBoardCard from './NoticeBoardCard'

const n1: Notice = {
  id: 1, title: 'Holiday on Monday', body_preview: 'School closed', body: 'School closed for Diwali.', target_roles: ['all'],
  is_pinned: true, is_important: false, is_read: false, published_at: '2026-09-29T04:00:00Z', expires_at: '2026-10-05T04:00:00Z',
  has_attachment: false, posted_by: { id: 1, name: 'Admin', role: 'coaching_admin' }, status: 'active', send_push: false,
}

function list(canManage: boolean, data: Notice[] = [n1]) {
  return { data: { success: true, data: data.filter((n) => !n.is_pinned), pinned: data.filter((n) => n.is_pinned), meta: { limit: 15, has_more: false, next_cursor: null, unread_count: 1, can_manage: canManage } } }
}

function mockApi(canManage: boolean) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (/\/notices\/1$/.test(url)) return Promise.resolve({ data: { success: true, data: n1 } })
    if (/unread-count/.test(url)) return Promise.resolve({ data: { success: true, data: { unread_count: 0 } } })
    if (/notifications/.test(url)) return Promise.resolve({ data: { success: true, data: { unread_count: 0 } } })
    return Promise.resolve(list(canManage))
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  window.history.replaceState(null, '', '/notices')
})

describe('NoticeBoardCard', () => {
  it('readers: no Add / Edit / Delete (server can_manage=false)', async () => {
    const get = mockApi(false)
    render(<NoticeBoardCard fullPage />)
    expect(await screen.findByText('Holiday on Monday')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add Notice' })).toBeNull()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/notices$/), { params: { limit: 15, status: 'active' }, headers: { Authorization: 'Bearer tok', Accept: 'application/json' } })
    await userEvent.click(screen.getByRole('button', { name: /Holiday on Monday/ }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('School closed for Diwali.')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: /Delete/ })).toBeNull()
    expect(within(dialog).queryByText('Audience')).toBeNull()
  })

  it('managers: Add button, admin details, delete asks for confirmation', async () => {
    mockApi(true)
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    render(<NoticeBoardCard fullPage />)
    expect(await screen.findByRole('button', { name: 'Add Notice' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Holiday on Monday/ }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Audience')).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('button', { name: /Delete/ }))
    expect(del).not.toHaveBeenCalled()
    const confirm = await screen.findByRole('alertdialog')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))
    expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/notices\/1$/), { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } })
  })

  it('opens ?notice=<id> directly and clears it on close', async () => {
    mockApi(false)
    window.history.replaceState(null, '', '/notices?notice=1')
    render(<NoticeBoardCard fullPage />)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('School closed for Diwali.')).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(window.location.search).toBe(''))
  })

  it('create: validates, then posts the legacy multipart body', async () => {
    mockApi(true)
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: n1 } })
    render(<NoticeBoardCard fullPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add Notice' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publish' }))
    expect(await within(dialog).findByText('Title is required.')).toBeTruthy()
    expect(within(dialog).getByText('Please set an expiry date — every notice must expire.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText(/Title/), 'Exam week')
    await userEvent.type(within(dialog).getByLabelText(/Description/), 'Tests start Monday.')
    const expires = within(dialog).getByLabelText(/Expires at/) as HTMLInputElement
    await userEvent.clear(expires)
    await userEvent.type(expires, '2099-01-01T10:00')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    const [url, body] = post.mock.calls[0] as [string, FormData]
    expect(url).toMatch(/\/notices$/)
    expect(Array.from(body.keys())).toEqual(['title', 'body', 'target_roles[]', 'is_pinned', 'is_important', 'expires_at', 'send_push'])
    expect(body.get('title')).toBe('Exam week')
  })

  it('asks before discarding a dirty form', async () => {
    mockApi(true)
    render(<NoticeBoardCard fullPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add Notice' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Title/), 'Draft')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('Discard your changes?')).toBeTruthy()
  })
})
