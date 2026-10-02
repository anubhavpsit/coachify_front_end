import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import FactsPage from './FactsPage'
import ManageFactsPage from './ManageFactsPage'

const auth = { headers: { Authorization: 'Bearer tok' } }
const feedFact = { id: 1, title: 'Honey never spoils', content: 'Edible after 3000 years.', content_type: 'text', is_pinned: true, likes_count: 2, liked_by_me: false, saved_by_me: false }
const own = { id: 10, tenant_id: 4, title: 'Own fact', content: 'x', content_type: 'text', is_pinned: false, is_published: true, is_active: true, target_roles: ['student'], publish_at: '2026-10-02T04:30:00Z', tags: ['science'] }
const shared = { id: 11, tenant_id: 0, title: 'Shared fact', content_type: 'text', is_pinned: false, is_published: true, is_active: true }

function signIn(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x', role, tenant_id: 4, permissions }))
}

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    const ok = (d: unknown) => Promise.resolve({ data: { success: true, data: d } })
    if (url.includes('/admin/facts?')) return ok({ data: [own, shared] })
    if (url.includes('/classes/4')) return ok([{ id: 1, name: 'Class 9' }])
    if (url.includes('/facts')) return ok({ facts: [feedFact], pagination: { current_page: 1, last_page: 1 } })
    return ok([])
  })
}

const renderIt = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('FactsPage (feed)', () => {
  it('student: legacy feed request; no Featured tab or Manage link', async () => {
    signIn('student')
    const get = mockGets()
    renderIt(<FactsPage />)
    expect(await screen.findByRole('heading', { name: 'Honey never spoils' })).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/facts\?page=1&per_page=10$/), auth)
    expect(screen.queryByRole('tab', { name: /Featured/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Manage/ })).toBeNull()
  })

  it('coaching admin: Featured tab hits the superadmin feed; opt-out asks first', async () => {
    signIn('coaching_admin')
    const get = vi.spyOn(axios, 'get').mockImplementation(() =>
      Promise.resolve({ data: { success: true, data: { items: [{ ...feedFact, is_opted_in: true }], pagination: { current_page: 1, last_page: 1 } } } }),
    )
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    renderIt(<FactsPage />)
    expect(await screen.findByRole('link', { name: /Manage/ })).toBeTruthy()
    await userEvent.click(screen.getByRole('tab', { name: /Featured/ }))
    await waitFor(() => expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/superadmin-facts\?page=1&per_page=10$/), auth))
    await userEvent.click(await screen.findByRole('button', { name: 'Opt-out' }))
    expect(post).not.toHaveBeenCalledWith(expect.stringMatching(/opt-out$/), {}, auth)
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, opt out' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/superadmin-facts\/1\/opt-out$/), {}, auth))
  })

  it('like and save use the legacy endpoints and update the card', async () => {
    signIn('student')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockImplementation((url: string) =>
      Promise.resolve({ data: { success: true, data: url.endsWith('/like') ? { liked: true, likes_count: 3 } : { saved: true } } }),
    )
    renderIt(<FactsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Like' }))
    expect(await screen.findByText('3')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Unlike' }).getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/facts\/1\/save$/), {}, auth)
    expect(await screen.findByRole('button', { name: 'Remove from saved' })).toBeTruthy()
  })
})

describe('ManageFactsPage', () => {
  it('own facts are editable; shared (Featured) ones are not', async () => {
    signIn('coaching_admin')
    mockGets()
    renderIt(<ManageFactsPage />)
    const ownRow = (await screen.findByText('Own fact')).closest('tr')!
    expect(within(ownRow).getByRole('button', { name: 'Edit Own fact' })).toBeTruthy()
    const sharedRow = screen.getByText('Shared fact').closest('tr')!
    expect(within(sharedRow).queryByRole('button', { name: /Edit/ })).toBeNull()
    expect(within(sharedRow).getByText('Featured')).toBeTruthy()
  })

  it('delete and deactivate ask first', async () => {
    signIn('coaching_admin')
    mockGets()
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true } })
    renderIt(<ManageFactsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Own fact' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith(expect.stringMatching(/\/facts\/10$/), { is_active: false }, auth))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Own fact' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Yes, delete' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/facts\/10$/), auth))
  })

  it('editing keeps the audience and local publish time, and leaves classes alone', async () => {
    signIn('coaching_admin')
    mockGets()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true } })
    renderIt(<ManageFactsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Own fact' }))
    const d = await screen.findByRole('dialog')
    expect((within(d).getByRole('checkbox', { name: /students/i }) as HTMLButtonElement).getAttribute('data-state')).toBe('checked')
    await userEvent.click(within(d).getByRole('button', { name: 'Update Fact' }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    const body = put.mock.calls[0][1] as Record<string, unknown>
    expect(body.target_roles).toEqual(['student'])
    expect(body).not.toHaveProperty('class_ids')
    expect(body.tags).toEqual(['science'])
    const local = new Date('2026-10-02T04:30:00Z')
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(body.publish_at).toBe(`${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`)
  })

  it('create validates: title, a text fact needs content, links must be full URLs', async () => {
    signIn('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post')
    renderIt(<ManageFactsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Create Fact' }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByRole('textbox', { name: /Source URL/ }), 'example')
    await userEvent.click(within(d).getByRole('button', { name: 'Create Fact' }))
    expect(await within(d).findByText('Title is required.')).toBeTruthy()
    expect(within(d).getByText('Write the fact.')).toBeTruthy()
    expect(within(d).getByText('Enter a full link starting with https://')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
  })
})
