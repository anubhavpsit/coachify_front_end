import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import AcademicYearsPage from './AcademicYearsPage'
import ClassesPage from './ClassesPage'
import SubjectsPage from './SubjectsPage'

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
})

const withAccept = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }
const authOnly = { headers: { Authorization: 'Bearer tok' } }

describe('SubjectsPage', () => {
  it('default subjects are read-only; custom ones can be edited/deleted', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [{ id: 1, subject: 'Maths', tenant_id: 0 }, { id: 2, subject: 'Robotics', tenant_id: 4 }] } })
    render(<SubjectsPage />)
    expect(await screen.findByText('Robotics')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/subjects\/4$/), withAccept)
    expect(screen.queryByRole('button', { name: 'Edit Maths' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit Robotics' })).toBeTruthy()
  })

  it('validates, trims, posts { subject } and appends without refetching', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [] } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { id: 9, subject: 'Physics', tenant_id: 4 } } })
    render(<SubjectsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Add New Subject/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('Subject Name is required.')).toBeTruthy()
    await userEvent.type(within(dialog).getByLabelText(/Subject Name/), '  Physics ')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/subjects$/), { subject: 'Physics' }, withAccept)
    expect(await screen.findByText('Physics')).toBeTruthy()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('maps a 422 on "subject" onto the field', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [] } })
    const err = Object.assign(new Error('x'), { isAxiosError: true, response: { status: 422, data: { errors: { subject: ['The subject has already been taken.'] } } } })
    vi.spyOn(axios, 'post').mockRejectedValue(err)
    render(<SubjectsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Add New Subject/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Subject Name/), 'Maths')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('The subject has already been taken.')).toBeTruthy()
  })
})

describe('ClassesPage', () => {
  it('create sends { name, tenant_id } (string, as before) and refetches; delete confirms', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: { data: [{ id: 3, name: 'Class 10-A', tenant_id: 4 }] } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })
    const del = vi.spyOn(axios, 'delete').mockResolvedValue({ data: {} })
    render(<ClassesPage />)
    expect(await screen.findByText('Class 10-A')).toBeTruthy()
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/classes\/4$/), authOnly)
    await userEvent.click(screen.getByRole('button', { name: /Add New Class/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/Class Name/), 'Class 11-B')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/classes$/), { name: 'Class 11-B', tenant_id: '4' }, authOnly)
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Class 10-A' }))
    expect(del).not.toHaveBeenCalled()
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    expect(del).toHaveBeenCalledWith(expect.stringMatching(/\/classes\/3$/), authOnly)
  })
})

describe('AcademicYearsPage', () => {
  const year = { id: 1, name: '2025-2026', starts_on: '2025-04-01T00:00:00Z', ends_on: '2026-03-31T00:00:00Z', is_current: false }

  it('end must be after start; payload keys unchanged', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [year] } })
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } })
    render(<AcademicYearsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Add Year/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/^Name/), '2026-2027')
    await userEvent.type(within(dialog).getByLabelText(/Starts On/), '2026-04-01')
    await userEvent.type(within(dialog).getByLabelText(/Ends On/), '2026-03-01')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('End date must be after the start date.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
    const ends = within(dialog).getByLabelText(/Ends On/)
    await userEvent.clear(ends)
    await userEvent.type(ends, '2027-03-31')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/academic-years$/), { name: '2026-2027', starts_on: '2026-04-01', ends_on: '2027-03-31', is_current: false }, withAccept),
    )
  })

  it('Set Current asks first, then PATCHes', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { success: true, data: [year] } })
    const patch = vi.spyOn(axios, 'patch').mockResolvedValue({ data: {} })
    render(<AcademicYearsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Set Current/ }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Set Current' }))
    expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/academic-years\/1\/current$/), {}, withAccept)
  })
})
