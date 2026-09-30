import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import TeachersPage from './TeachersPage'

vi.mock('@/features/people/profile/UserProfileDialog', () => ({ default: ({ show, canEditImage }: { show: boolean; canEditImage: boolean }) => (show ? <div data-testid="profile" data-can-edit={String(canEditImage)} /> : null) }))

const teachers = [
  { id: 1, name: 'Meera Iyer', email: 'm@x.in', phone: '9876543210', tenant_id: 4, dob: '1988-01-01', gender: 'female' },
  { id: 2, name: 'Global Demo', email: 'g@x.in', phone: null, tenant_id: 0 },
]
const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role, tenant_id: 4, permissions }))
}

beforeEach(() => vi.restoreAllMocks())

describe('TeachersPage', () => {
  it('students load their assigned teachers; no edit/delete', async () => {
    login('student')
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [teachers[0]] } })
    render(<TeachersPage />)
    expect(await screen.findByText('Meera Iyer')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/students\/teachers$/), opts)
    expect(screen.queryByRole('button', { name: 'Edit Meera Iyer' })).toBeNull()
    expect(screen.getByRole('button', { name: 'View Meera Iyer' })).toBeTruthy()
  })

  it('Q5 preserved: staff with teachers.manage cannot edit; global rows have no actions', async () => {
    login('staff', ['teachers.manage'])
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: teachers } })
    render(<TeachersPage />)
    expect(await screen.findByText('Meera Iyer')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/teachers$/), opts)
    expect(screen.queryByRole('button', { name: 'Edit Meera Iyer' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'View Global Demo' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'View Meera Iyer' }))
    expect(screen.getByTestId('profile').dataset.canEdit).toBe('false')
  })

  it('admin: create validates phone and sends phone: null when empty', async () => {
    login('coaching_admin')
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: teachers } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { id: 9, name: 'Arjun', email: 'ar@x.in', tenant_id: 4 } } })
    render(<TeachersPage />)
    expect(await screen.findByRole('button', { name: 'Edit Meera Iyer' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Add New Teacher/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByLabelText(/^Name/), 'Arjun')
    await userEvent.type(within(d).getByLabelText(/^Email/), 'ar@x.in')
    await userEvent.type(within(d).getByLabelText(/^Phone/), 'abc')
    await userEvent.type(within(d).getByLabelText(/^Password/), 'teach1234')
    await userEvent.selectOptions(within(d).getByLabelText(/^Gender/), 'male')
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    expect(await within(d).findByText(/Enter a valid phone number/)).toBeTruthy()
    await userEvent.clear(within(d).getByLabelText(/^Phone/))
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ name: 'Arjun', email: 'ar@x.in', phone: null, password: 'teach1234', dob: expect.any(String), gender: 'male' })
  })
})
