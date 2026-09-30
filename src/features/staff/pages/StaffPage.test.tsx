import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import StaffPage from './StaffPage'

vi.mock('@/components/UserProfileModal', () => ({ default: ({ show, canEditImage }: { show: boolean; canEditImage: boolean }) => (show ? <div data-testid="profile" data-can-edit={String(canEditImage)} /> : null) }))

const member = { id: 5, name: 'Priya Nair', email: 'priya@x.in', tenant_id: 4, dob: '1990-05-01', gender: 'female', permissions: ['fees.view'] }
const catalog = [{ group: 'Finance', permissions: [{ key: 'fees.view', label: 'View fees' }, { key: 'fees.manage', label: 'Manage fees' }] }]
const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role, tenant_id: 4, permissions }))
}

function mockGets() {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.endsWith('/staff/permissions/catalog')) return Promise.resolve({ data: { success: true, data: catalog } })
    if (url.endsWith('/staff/5/permissions')) return Promise.resolve({ data: { success: true, data: { permissions: ['fees.view', 'fees.manage'] } } })
    return Promise.resolve({ data: { success: true, data: [member] } })
  })
}

beforeEach(() => vi.restoreAllMocks())

describe('StaffPage', () => {
  it('shows permission labels; edit/delete only with staff.manage', async () => {
    login('coaching_admin')
    mockGets()
    render(<StaffPage />)
    expect(await screen.findByText('View fees')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Priya Nair' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'View Priya Nair' }))
    expect(screen.getByTestId('profile').dataset.canEdit).toBe('true')
  })

  it('create: validates (password min 8, gender) and posts the legacy body', async () => {
    login('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { ...member, id: 6, name: 'Ravi' } } })
    render(<StaffPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Add New Staff/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByLabelText(/^Name/), 'Ravi')
    await userEvent.type(within(d).getByLabelText(/^Email/), 'ravi@x.in')
    await userEvent.type(within(d).getByLabelText(/^Password/), 'short')
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    expect(await within(d).findByText('Password must be at least 8 characters.')).toBeTruthy()
    expect(within(d).getByText('Please select a gender.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()

    await userEvent.type(within(d).getByLabelText(/^Password/), 'word123')
    await userEvent.selectOptions(within(d).getByLabelText(/^Gender/), 'male')
    await userEvent.click(within(d).getByRole('checkbox', { name: 'Manage fees' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    const [url, body, conf] = post.mock.calls[0]
    expect(url).toMatch(/\/staff$/)
    expect(body).toEqual({ name: 'Ravi', email: 'ravi@x.in', password: 'shortword123', dob: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), gender: 'male', permissions: ['fees.manage'] })
    expect(conf).toEqual(opts)
  })

  it('edit: loads authoritative permissions and omits a blank password', async () => {
    login('coaching_admin')
    mockGets()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({ data: { success: true } })
    render(<StaffPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Priya Nair' }))
    const d = await screen.findByRole('dialog')
    await waitFor(() => expect((within(d).getByRole('checkbox', { name: 'Manage fees' }) as HTMLElement).getAttribute('data-state')).toBe('checked'))
    await userEvent.click(within(d).getByRole('button', { name: 'Update' }))
    await waitFor(() => expect(put).toHaveBeenCalled())
    const body = put.mock.calls[0][1] as Record<string, unknown>
    expect(body).toEqual({ name: 'Priya Nair', email: 'priya@x.in', password: undefined, dob: '1990-05-01', gender: 'female', permissions: ['fees.view', 'fees.manage'] })
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty('password')
  })
})
