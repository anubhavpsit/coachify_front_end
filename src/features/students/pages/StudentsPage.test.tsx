import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import StudentsPage from './StudentsPage'

vi.mock('@/components/UserProfileModal', () => ({ default: ({ show, canEditImage }: { show: boolean; canEditImage: boolean }) => (show ? <div data-testid="profile" data-can-edit={String(canEditImage)} /> : null) }))

const opts = { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } }
const students = [
  { id: 1, name: 'Aarav Mehta', email: 'aarav@x.in', tenant_id: 4, current_class_id: 3, student_profile: { class: 3, grade: 10, subjects: [7], phone: '98765' }, created_at: '2026-09-01T00:00:00Z', status: 'active' },
  { id: 2, name: 'Isha Verma', email: 'isha@x.in', tenant_id: 4, current_class_id: null, student_profile: null, created_at: '2026-09-20T00:00:00Z', status: 'inactive' },
]

function login(role: string, permissions: string[] = []) {
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
  localStorage.setItem('authUser', JSON.stringify({ id: 1, name: 'A', email: 'a@x', role, tenant_id: 4, permissions }))
}

function mockGets(list = students) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.endsWith('/academic-years')) return Promise.resolve({ data: { success: true, data: [{ id: 11, name: '2026-2027', is_current: true }] } })
    if (url.includes('/subjects/')) return Promise.resolve({ data: { status: true, data: [{ id: 7, subject: 'Physics' }] } })
    if (url.includes('/classes/')) return Promise.resolve({ data: { success: true, data: [{ id: 3, name: 'Class 10-A' }] } })
    return Promise.resolve({ data: { success: true, data: list } })
  })
}

beforeEach(() => vi.restoreAllMocks())

describe('StudentsPage (Q4 preserved)', () => {
  it('admin: newest first, class/subject names, admin columns + row menu; current year requested', async () => {
    login('coaching_admin')
    const get = mockGets()
    render(<StudentsPage />)
    await screen.findByText('Aarav Mehta')
    const rows = screen.getAllByRole('row')
    expect(rows[1].textContent).toContain('Isha Verma') // created later → first
    expect(screen.getByRole('cell', { name: 'Class 10-A' })).toBeTruthy()
    expect(screen.getByText('Physics')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: /Phone/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Actions for Aarav Mehta' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add New Student/ })).toBeTruthy()
    const studentCalls = get.mock.calls.filter(([u]) => /\/students$/.test(u as string))
    expect(studentCalls).toHaveLength(1) // waits for years (legacy fired twice)
    expect(studentCalls[0][1]).toEqual({ ...opts, params: { academic_year_id: 11 } })
  })

  it('staff with students.manage gets the read-only view (Q4)', async () => {
    login('staff', ['students.manage'])
    mockGets()
    render(<StudentsPage />)
    expect(await screen.findByText('Aarav Mehta')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Add New Student/ })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: /Phone/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Actions for Aarav Mehta' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'View Aarav Mehta' }))
    expect(screen.getByTestId('profile').dataset.canEdit).toBe('false')
  })

  it('teacher loads /teachers/students and never sends status', async () => {
    login('teacher')
    const get = mockGets()
    render(<StudentsPage />)
    expect(await screen.findByText('Aarav Mehta')).toBeTruthy()
    const call = get.mock.calls.find(([u]) => /\/teachers\/students$/.test(u as string))
    expect(call?.[1]).toEqual({ ...opts, params: { academic_year_id: 11 } })
    expect(screen.queryByLabelText('Status')).toBeNull()
  })

  it('admin status filter sends status; client filters search/class', async () => {
    login('coaching_admin')
    const get = mockGets()
    render(<StudentsPage />)
    await screen.findByText('Aarav Mehta')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'inactive')
    await waitFor(() => expect(get.mock.lastCall?.[1]).toEqual({ ...opts, params: { academic_year_id: 11, status: 'inactive' } }))
    await userEvent.type(screen.getByLabelText('Search by Name'), 'isha')
    expect(screen.queryByText('Aarav Mehta')).toBeNull()
  })

  it('create posts the legacy form object', async () => {
    login('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true, data: { id: 9, name: 'Kabir', email: 'k@x.in', tenant_id: 4 } } })
    render(<StudentsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /Add New Student/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.type(within(d).getByLabelText(/^Name/), 'Kabir')
    await userEvent.type(within(d).getByLabelText(/^Email/), 'k@x.in')
    await userEvent.type(within(d).getByLabelText(/^Password/), 'student99')
    await userEvent.selectOptions(within(d).getByLabelText(/^Gender/), 'male')
    await userEvent.selectOptions(within(d).getByLabelText(/^Class/), '3')
    await userEvent.selectOptions(within(d).getByLabelText(/^Grade/), '10')
    await userEvent.click(within(d).getByRole('checkbox', { name: 'Physics' }))
    await userEvent.click(within(d).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][1]).toEqual({ name: 'Kabir', email: 'k@x.in', password: 'student99', class: 3, grade: 10, subjects: [7], phone: '', dob: '', gender: 'male' })
    expect(await screen.findByText('Kabir')).toBeTruthy()
  })

  it('reactivate sends the legacy body and updates the row', async () => {
    login('coaching_admin')
    mockGets()
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { student: { status: 'active' } } } })
    render(<StudentsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Isha Verma' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /Reactivate/ }))
    const d = await screen.findByRole('dialog')
    await userEvent.click(within(d).getByRole('button', { name: 'Reactivate' }))
    await waitFor(() => expect(post).toHaveBeenCalled())
    expect(post.mock.calls[0][0]).toMatch(/\/students\/2\/reactivate$/)
    expect(post.mock.calls[0][1]).toEqual({ rejoined_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), academic_year_id: 11, class_id: undefined })
  })
})
