import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import GhostStudentsCard from './GhostStudentsCard'
import UnassignedStudentsCard from './UnassignedStudentsCard'

const student = { id: 9, name: 'Kabir Singh', email: 'k@x.in', class: '3', status: 'active' }

function mockGets(list: unknown[]) {
  return vi.spyOn(axios, 'get').mockImplementation((url: string) => {
    if (url.includes('/classes/')) return Promise.resolve({ data: { data: [{ id: 3, name: 'Class 10-A' }] } })
    if (url.includes('/teachers')) return Promise.resolve({ data: { success: true, data: [{ id: 21, name: 'Meera Iyer', email: 'm@x.in' }] } })
    return Promise.resolve({ data: { success: true, data: list } })
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.setItem('authToken', 'tok')
  localStorage.setItem('tenant_id', '4')
})

describe('GhostStudentsCard', () => {
  it('renders nothing when there are no ghost students (legacy)', async () => {
    const get = mockGets([])
    const { container } = render(<GhostStudentsCard />)
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(container.innerHTML).toBe(''))
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/dashboard\/ghost-students\?days=30$/), { headers: { Authorization: 'Bearer tok' } })
    expect(get).toHaveBeenCalledWith(expect.stringMatching(/\/classes\/4$/), { headers: { Authorization: 'Bearer tok' } })
  })

  it('confirms before marking inactive, then removes the row', async () => {
    mockGets([student])
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })
    render(<GhostStudentsCard />)
    expect(await screen.findByText('Class 10-A')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /Mark Inactive/ }))
    expect(post).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark Inactive' }))
    await waitFor(() => expect(screen.queryByText('Kabir Singh')).toBeNull())
    expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/students\/9\/mark-inactive$/), {}, { headers: { Authorization: 'Bearer tok' } })
  })
})

describe('UnassignedStudentsCard + AssignTeachersModal', () => {
  it('requires a teacher, then posts teacher_ids', async () => {
    mockGets([student])
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })
    render(<UnassignedStudentsCard />)
    await userEvent.click(await screen.findByRole('button', { name: /Assign Teacher/ }))
    expect(await screen.findByText('Meera Iyer')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))
    expect(screen.getByText('Select at least one teacher.')).toBeTruthy()
    expect(post).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }))
    expect(post).toHaveBeenCalledWith(
      expect.stringMatching(/\/students\/9\/assign-teachers$/),
      { teacher_ids: [21] },
      { headers: { Authorization: 'Bearer tok', Accept: 'application/json' } },
    )
  })
})
